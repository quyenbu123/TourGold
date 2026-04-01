package dev.tin.tour_back.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {

    @NotBlank(message = "Token đặt lại mật khẩu là bắt buộc")
    private String token;

    @NotBlank(message = "Mật khẩu mới là bắt buộc")
    private String newPassword;
}
