package dev.tin.tour_back.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonAlias;

@Data
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginDTO {
    @JsonAlias({"username", "email"})
    private String loginIdentifier; // Có thể là email hoặc username
    private String password;
}
