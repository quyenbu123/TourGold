package dev.tin.tour_back.dto;

import lombok.Data;

@Data
public class GoogleLoginRequest {
    private String idToken; // Google ID token from frontend
}
