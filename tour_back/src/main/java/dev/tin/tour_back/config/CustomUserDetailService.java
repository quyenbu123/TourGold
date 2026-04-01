package dev.tin.tour_back.config;

import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.dao.IncorrectResultSizeDataAccessException;

@Slf4j
@Component
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Thử tìm theo username trước
        Optional<UserEntity> userOptional = userRepository.findByUsername(username);
        
        // Nếu không tìm thấy, thử tìm theo email
        if (!userOptional.isPresent()) {
            try {
                userOptional = userRepository.findByEmail(username);
            } catch (IncorrectResultSizeDataAccessException ex) {
                log.warn("Multiple users found for email {}. Selecting the first match for authentication.", username);
                List<UserEntity> duplicates = userRepository.findAllByEmail(username);
                if (!duplicates.isEmpty()) {
                    userOptional = Optional.of(duplicates.get(0));
                } else {
                    userOptional = Optional.empty();
                }
            }
        }
        
        UserEntity user = userOptional.orElseThrow(() -> {
            log.warn("Không tìm thấy người dùng với username hoặc email: {}", username);
            return new UsernameNotFoundException("Không tìm thấy người dùng với username hoặc email: " + username);
        });
        
        log.debug("Loaded user: {}, roles: {}", user.getUsername(), user.getRoles());
        
        return UserPrincipal.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .authorities(
                        user
                                .getRoles()
                                .stream()
                                .map(role -> new SimpleGrantedAuthority(role.getName()))
                                .collect(Collectors.toList())
                )
                .password(user.getPassword())
                .build();
    }
}
