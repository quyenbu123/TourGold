package dev.tin.tour_back.dto;

import lombok.Data;

@Data
public class RegisterDTO {
    private String username;
    private String email;
    private String password;
    private String fullName;
}
