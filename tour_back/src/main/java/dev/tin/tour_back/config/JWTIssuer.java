package dev.tin.tour_back.config;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JWTIssuer {
    private final JWTProperties properties;

    /**
     * Issue an access token
     * @param request Token request details
     * @return JWT token string
     */
    public String issueAccessToken(Request request) {
        var now = Instant.now();

        return JWT.create()
                .withSubject(String.valueOf(request.userId))
                .withIssuedAt(now)
                .withExpiresAt(now.plus(properties.getTokenDuration()))
                .withClaim("e", request.getEmail())
                .withClaim("au", request.getRoles())
                .withClaim("username", request.getUsername())
                .withClaim("tokenType", "access")
                .withJWTId(UUID.randomUUID().toString())
                .sign(Algorithm.HMAC256(properties.getSecretKey()));
    }
    
    /**
     * Issue a refresh token
     * @param request Token request details
     * @return JWT refresh token string
     */
    public String issueRefreshToken(Request request) {
        var now = Instant.now();
        
        return JWT.create()
                .withSubject(String.valueOf(request.userId))
                .withIssuedAt(now)
                .withExpiresAt(now.plus(properties.getRefreshTokenDuration()))
                .withClaim("e", request.getEmail())
                .withClaim("tokenType", "refresh")
                .withJWTId(UUID.randomUUID().toString())
                .sign(Algorithm.HMAC256(properties.getSecretKey()));
    }
    
    /**
     * Legacy method for backward compatibility
     * @param request Token request details
     * @return JWT token string
     * @deprecated Use issueAccessToken instead
     */
    @Deprecated
    public String issue(Request request) {
        return issueAccessToken(request);
    }

    @Getter
    @Builder
    public static class Request {
        private final Long userId;
        private final String email;
        private final String username;
        private final List<String> roles;
    }
}
