package dev.tin.tour_back.service;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import dev.tin.tour_back.dto.AuthResponseDTO;
import dev.tin.tour_back.dto.GoogleLoginRequest;
import dev.tin.tour_back.dto.TokenResponse;
import dev.tin.tour_back.dto.UserDTO;
import dev.tin.tour_back.config.JWTDecoder;
import dev.tin.tour_back.config.JWTIssuer;
import dev.tin.tour_back.config.JWTProperties;
import dev.tin.tour_back.config.UserPrincipal;
import dev.tin.tour_back.entity.RoleEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.UserRepository;
import dev.tin.tour_back.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

// Google token verification imports
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import java.util.Collections;
import java.security.GeneralSecurityException;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JWTIssuer jwtIssuer;
    private final JWTDecoder jwtDecoder;
    private final JWTProperties jwtProperties;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Value("${google.client-id:}")
    private String googleClientId;

    @PostConstruct
    public void logGoogleConfig() {
        if (googleClientId == null || googleClientId.isBlank()) {
            log.warn("Google client ID is NOT configured (google.client-id is blank)");
        } else {
            log.info("Google client ID configured (length: {}), begins with: {}***", 
                    googleClientId.length(),
                    googleClientId.substring(0, Math.min(8, googleClientId.length())));
        }
    }

    public AuthResponseDTO attemptLogin(String loginIdentifier, String password) {
        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginIdentifier, password)
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            var principal = (UserPrincipal) authentication.getPrincipal();
            
            // Lấy thêm thông tin người dùng từ repository
            String username = loginIdentifier; // Mặc định
            Optional<UserEntity> userOpt = userRepository.findById(principal.getUserId());
            if (userOpt.isPresent()) {
                username = userOpt.get().getUsername();
            }
    
            // Issue tokens
            TokenResponse tokenResponse = issueTokens(principal, username);
            
            // Tạo đối tượng user để trả về
            UserDTO user = UserDTO.builder()
                    .id(principal.getUserId())
                    .username(username)
                    .email(principal.getEmail())
                    .roles(principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
                    .build();
    
            return AuthResponseDTO.builder()
                    .token(tokenResponse.getAccessToken())
                    .refreshToken(tokenResponse.getRefreshToken())
                    .expiresIn(tokenResponse.getExpiresIn())
                    .user(user)
                    .build();
        } catch (BadCredentialsException e) {
            log.warn("Login failed for user: {}", loginIdentifier);
            throw new BadCredentialsException("Invalid username/email or password");
        } catch (AuthenticationException e) {
            log.error("Authentication error: ", e);
            throw e;
        }
    }
    
    /**
     * Verify Google ID token, upsert user, and issue JWT tokens
     */
    public AuthResponseDTO loginWithGoogle(String idTokenString) {
        if (idTokenString == null || idTokenString.isBlank()) {
            throw new BadCredentialsException("Missing Google ID token");
        }
        if (googleClientId == null || googleClientId.isBlank()) {
            log.error("google.client-id is not configured");
            throw new IllegalStateException("Google client ID not configured on server");
        }
        try {
            var httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            var jsonFactory = JacksonFactory.getDefaultInstance();
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(httpTransport, jsonFactory)
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new BadCredentialsException("Invalid Google ID token");
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String fullName = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            // Upsert user by email
            UserEntity user = userRepository.findByEmail(email).orElseGet(() -> {
                UserEntity u = new UserEntity();
                u.setEmail(email);
                // Create a username from email prefix if missing
                String username = email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
                u.setUsername(username);
                u.setFullName(fullName);
                // Passwordless user (null password)
                u.setPassword(null);
                // Default role USER
                RoleEntity roleUser = roleRepository.findByName("ROLE_USER")
                        .orElseGet(() -> {
                            RoleEntity r = new RoleEntity();
                            r.setName("ROLE_USER");
                            return roleRepository.save(r);
                        });
                u.setRoles(List.of(roleUser));
                return userRepository.save(u);
            });

            // Ensure full name fills in
            if (user.getFullName() == null && fullName != null) {
                user.setFullName(fullName);
                userRepository.save(user);
            }

            // Build principal and issue tokens
            List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                    .map(RoleEntity::getName)
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());

            UserPrincipal principal = UserPrincipal.builder()
                    .userId(user.getId())
                    .email(user.getEmail())
                    .username(user.getUsername())
                    .authorities(authorities)
                    .build();

            TokenResponse tokenResponse = issueTokens(principal, user.getUsername());
            UserDTO userDTO = UserDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .roles(authorities.stream().map(GrantedAuthority::getAuthority).toList())
                    .build();

            return AuthResponseDTO.builder()
                    .token(tokenResponse.getAccessToken())
                    .refreshToken(tokenResponse.getRefreshToken())
                    .expiresIn(tokenResponse.getExpiresIn())
                    .user(userDTO)
                    .build();
        } catch (GeneralSecurityException | java.io.IOException e) {
            log.error("Error verifying Google ID token", e);
            throw new BadCredentialsException("Failed to verify Google token");
        }
    }

    /**
     * Refresh an access token using a refresh token
     * @param refreshToken The refresh token
     * @return New token response with access and refresh tokens
     * @throws JWTVerificationException if refresh token is invalid
     */
    public TokenResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            throw new IllegalArgumentException("Refresh token is required");
        }
        
        // Validate refresh token
        if (!jwtDecoder.isRefreshToken(refreshToken)) {
            log.warn("Attempted to use non-refresh token for refresh");
            throw new JWTVerificationException("Invalid refresh token");
        }
        
        // Decode token
        DecodedJWT jwt;
        try {
            jwt = jwtDecoder.decode(refreshToken);
        } catch (JWTVerificationException e) {
            log.warn("Invalid refresh token: {}", e.getMessage());
            throw new JWTVerificationException("Invalid refresh token");
        }
        
        // Get user ID from token
        Long userId = Long.parseLong(jwt.getSubject());
        
        // Get user from database
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("User not found for refresh token: {}", userId);
                    return new JWTVerificationException("User not found");
                });
        
        // Convert roles to authorities
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(RoleEntity::getName)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        
        // Create UserPrincipal
        UserPrincipal principal = UserPrincipal.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .authorities(authorities)
                .build();
        
        // Issue new tokens
        return issueTokens(principal, user.getUsername());
    }
    
    /**
     * Issue both access and refresh tokens
     * @param principal User principal
     * @param username Username
     * @return TokenResponse containing both tokens
     */
    private TokenResponse issueTokens(UserPrincipal principal, String username) {
        var tokenRequest = JWTIssuer.Request.builder()
                .userId(principal.getUserId())
                .email(principal.getEmail())
                .username(username)
                .roles(principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
                .build();
                
        String accessToken = jwtIssuer.issueAccessToken(tokenRequest);
        String refreshToken = jwtIssuer.issueRefreshToken(tokenRequest);
        
        // Calculate expiration in seconds
        long expiresIn = Duration.parse(jwtProperties.getTokenDuration().toString()).getSeconds();
        
        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(expiresIn)
                .build();
    }
}
