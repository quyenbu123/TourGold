package dev.tin.tour_back.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "security.jwt")
public class JWTProperties {
    private String secretKey;
    private Duration tokenDuration;
    private Duration refreshTokenDuration;
}
