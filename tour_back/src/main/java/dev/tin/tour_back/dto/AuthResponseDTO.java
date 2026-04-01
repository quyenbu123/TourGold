package dev.tin.tour_back.dto;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class AuthResponseDTO {
    private String token;
    private String refreshToken;
    private UserDTO user;
    private long expiresIn;
}
