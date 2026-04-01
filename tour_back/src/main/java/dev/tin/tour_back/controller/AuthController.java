package dev.tin.tour_back.controller;

import dev.tin.tour_back.dto.ForgotPasswordRequest;
import dev.tin.tour_back.dto.RefreshTokenRequest;
import dev.tin.tour_back.dto.ResetPasswordRequest;
import dev.tin.tour_back.dto.TokenResponse;
import dev.tin.tour_back.dto.GoogleLoginRequest;
import dev.tin.tour_back.dto.AuthResponseDTO;
import dev.tin.tour_back.service.AuthService;
import dev.tin.tour_back.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
@Validated
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    /**
     * Refresh access token using refresh token
     * @param request Request containing refresh token
     * @return New access and refresh tokens
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<TokenResponse> refreshToken(@RequestBody RefreshTokenRequest request) {
        log.info("Refresh token request received");
        TokenResponse tokenResponse = authService.refreshToken(request.getToken());
        return ResponseEntity.ok(tokenResponse);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request) {
        log.info("Password reset requested for identifier={}", request.getIdentifier());
        try {
            passwordResetService.initiateReset(request.getIdentifier());
            return ResponseEntity.ok(Map.of("message", "Nếu tài khoản tồn tại, chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu."));
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid forgot password request: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            log.error("Error processing forgot password request: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/reset-password/validate")
    public ResponseEntity<Map<String, Boolean>> validateResetToken(@RequestParam("token") String token) {
        boolean valid = passwordResetService.isTokenValid(token);
        if (!valid) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("valid", false));
        }
        return ResponseEntity.ok(Map.of("valid", true));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        try {
            passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công."));
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid reset password request: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }
    /**
     * Google Sign-In: accept Google ID token, verify, upsert user, and issue our JWTs
     */
    @PostMapping("/google")
    public ResponseEntity<AuthResponseDTO> googleLogin(@RequestBody GoogleLoginRequest request) {
        log.info("Google login request received");
        AuthResponseDTO response = authService.loginWithGoogle(request.getIdToken());
        return ResponseEntity.ok(response);
    }
} 