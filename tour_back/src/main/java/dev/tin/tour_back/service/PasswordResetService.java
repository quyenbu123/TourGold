package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.IncorrectResultSizeDataAccessException;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    /**
     * Khởi tạo yêu cầu đặt lại mật khẩu cho người dùng dựa trên email hoặc tên đăng nhập.
     * Luôn trả về thành công để tránh lộ thông tin tài khoản tồn tại hay không.
     */
    @Transactional
    public void initiateReset(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new IllegalArgumentException("Email hoặc tên đăng nhập là bắt buộc");
        }

        String normalized = identifier.trim();
        Optional<UserEntity> userOpt;
        try {
            userOpt = userRepository.findByEmail(normalized);
        } catch (IncorrectResultSizeDataAccessException ex) {
            log.warn("Multiple users found for email {}. Selecting the first match for reset flow.", normalized);
            List<UserEntity> duplicates = userRepository.findAllByEmail(normalized);
            if (!duplicates.isEmpty()) {
                userOpt = Optional.of(duplicates.get(0));
            } else {
                userOpt = Optional.empty();
            }
        }

        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(normalized);
        }

        if (userOpt.isEmpty()) {
            log.warn("Password reset requested for non-existing identifier: {}", normalized);
            return; // Trả về im lặng để tránh dò tìm
        }

        UserEntity user = userOpt.get();
        String token = UUID.randomUUID().toString();
        LocalDateTime expiry = LocalDateTime.now().plusHours(1);

        user.setResetPasswordToken(token);
        user.setResetPasswordTokenExpiry(expiry);

        userRepository.save(user);

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Cannot send password reset email for userId={} due to missing email", user.getId());
            return;
        }

        try {
            String resetLink = buildResetLink(token);
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetLink, token);
            log.info("Password reset email sent to userId={} email={}", user.getId(), user.getEmail());
        } catch (Exception ex) {
            log.error("Failed to send reset email for userId={}: {}", user.getId(), ex.getMessage());
            throw new IllegalStateException("Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.");
        }
    }

    /**
     * Đặt lại mật khẩu dựa trên token hợp lệ.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Token đặt lại mật khẩu không hợp lệ");
        }
        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("Mật khẩu mới không được bỏ trống");
        }

        UserEntity user = userRepository.findByResetPasswordToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        if (user.getResetPasswordTokenExpiry() == null || user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            clearResetToken(user);
            throw new IllegalArgumentException("Token đặt lại mật khẩu đã hết hạn");
        }

        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        clearResetToken(user);
        userRepository.save(user);
        log.info("Password reset successful for userId={}", user.getId());
    }

    /**
     * Kiểm tra token đặt lại mật khẩu có hợp lệ hay không.
     */
    @Transactional(readOnly = true)
    public boolean isTokenValid(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        return userRepository.findByResetPasswordToken(token)
                .filter(user -> user.getResetPasswordTokenExpiry() != null)
                .filter(user -> user.getResetPasswordTokenExpiry().isAfter(LocalDateTime.now()))
                .isPresent();
    }

    private void clearResetToken(UserEntity user) {
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
    }

    private String buildResetLink(String token) {
        String base = frontendBaseUrl != null ? frontendBaseUrl.trim() : "http://localhost:3000";
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/reset-password?token=" + token;
    }
}
