package dev.tin.tour_back.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Builder
@Data
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private List<String> roles;
} 