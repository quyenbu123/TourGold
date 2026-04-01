package dev.tin.tour_back.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {

    /**
     * Email hoặc tên đăng nhập mà người dùng sử dụng để yêu cầu đặt lại mật khẩu
     */
    @NotBlank(message = "Email hoặc tên đăng nhập là bắt buộc")
    private String identifier;

    /**
     * Cho phép client báo trước đây là email nếu muốn xử lý khác nhau trong tương lai.
     */
    private boolean emailPreferred;
}
