package dev.tin.tour_back.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private UserDTO user;
    private long expiresIn;
} 