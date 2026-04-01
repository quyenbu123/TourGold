package dev.tin.tour_back.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;


@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {
    private final JWTAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailService customUserDetailService;
    private final UnauthorizedHandler unauthorizedHandler;
    private final PasswordEncoder passwordEncoder;
    
    @Value("${security.cors.allowed-origins:http://localhost:3000, http://127.0.0.1:3000}")
    private String[] allowedOrigins;
    
    @Value("${security.cors.allowed-methods:GET, POST, PUT, DELETE, OPTIONS, PATCH}")
    private String[] allowedMethods;
    
    @Value("${security.cors.allowed-headers:*}")
    private String[] allowedHeaders;
    
    @Value("${security.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Bean
    public SecurityFilterChain applicationSecurity(HttpSecurity http) throws Exception {
        http
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .exceptionHandling(h -> h.authenticationEntryPoint(unauthorizedHandler))
                .securityMatcher("/**")
                .authorizeHttpRequests(registry -> registry
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/register").permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        // Public announcements read endpoint
                        .requestMatchers("/api/v1/admin/announcements/public").permitAll()
                        // Allow WebSocket handshake and SockJS endpoints
                        .requestMatchers("/ws/**").permitAll()
                        // AI Chat public endpoint (read-only, rate-limit at gateway if needed)
                        .requestMatchers("/api/v1/ai-chat/**").permitAll()
                        .requestMatchers("/api/v1/payment/casso/webhook").permitAll()
                        .requestMatchers("/api/v1/mock/**").permitAll()
                        .requestMatchers("/api/v1/payment/check/**").permitAll()
                        .requestMatchers("/api/v1/payment/vietqr/**").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        // Public tour endpoints
                        .requestMatchers(HttpMethod.GET, "/api/v1/tours", "/api/v1/tours/public/**", "/api/v1/tours/featured", "/api/v1/tours/featured-ids", "/api/v1/tours/itineraries").permitAll()
                        // Host/Admin tour management
                        .requestMatchers(HttpMethod.POST, "/api/v1/tours/**").hasAnyRole("ADMIN","HOST")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/tours/**").hasAnyRole("ADMIN","HOST")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/tours/**").hasAnyRole("ADMIN","HOST")
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/static/**").permitAll()
                        .anyRequest().authenticated()
                );
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList(allowedMethods));
        configuration.setAllowedHeaders(Arrays.asList(allowedHeaders));
        configuration.setAllowCredentials(allowCredentials);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
        var builder = http.getSharedObject(AuthenticationManagerBuilder.class);

        builder
                .userDetailsService(customUserDetailService)
                .passwordEncoder(passwordEncoder);
        return builder.build();
    }
}
