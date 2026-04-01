package dev.tin.tour_back.service;

import dev.tin.tour_back.dto.RegisterDTO;
import dev.tin.tour_back.entity.RoleEntity;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.*;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final FavoriteRepository favoriteRepository;
    private final CommentRepository commentRepository;
    private final NotificationRepository notificationRepository;
    private final TourRepository tourRepository;
    private final HostRegistrationRepository hostRegistrationRepository;

    public List<UserEntity> getUsers() {
        return userRepository.findAll();
    }
    public UserEntity getUser(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public UserEntity updateUser(UserEntity user) {
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isHost = user.getRoles().stream().anyMatch(r -> "ROLE_HOST".equals(r.getName()));

        // Clear host-owned resources before deleting the user account
        if (isHost) {
            List<TourEntity> ownedTours = tourRepository.findByOwner_Id(id);
            for (TourEntity tour : ownedTours) {
                Long tourId = tour.getId();
                if (tourId != null) {
                    commentRepository.deleteByTour_Id(tourId);
                    favoriteRepository.deleteByTour_Id(tourId);
                    bookingRepository.deleteByTour_Id(tourId);
                }
            }
            if (!ownedTours.isEmpty()) {
                tourRepository.deleteAll(ownedTours);
            }
        }

        // Remove user-centric data
        commentRepository.deleteByUser_Id(id);
        favoriteRepository.deleteByUser_Id(id);
        notificationRepository.deleteByUserId(id);
        hostRegistrationRepository.deleteByUser_Id(id);

        bookingRepository.deleteByUserId(id);
        paymentRepository.deleteByUserId(id);

        userRepository.delete(user);
    }

    public void addUser(RegisterDTO registerDTO) {
        UserEntity user = new UserEntity();
        
        // Tìm role USER thay vì CUSTOMER
        RoleEntity roles = roleRepository.findByName("ROLE_USER")
            .orElseThrow(() -> new RuntimeException("Role ROLE_USER not found in the database"));
        
        user.setUsername(registerDTO.getUsername());
        user.setEmail(registerDTO.getEmail());
        user.setFullName(registerDTO.getFullName());
        user.setPassword(passwordEncoder.encode(registerDTO.getPassword()));
        user.setRoles(Collections.singletonList(roles));
        userRepository.save(user);
    }

    public Optional<UserEntity> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public void addRole(Long userId, String roleName) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        RoleEntity role = roleRepository.findByName(roleName)
                .orElseGet(() -> {
                    RoleEntity r = new RoleEntity();
                    r.setName(roleName);
                    return roleRepository.save(r);
                });
        boolean hasRole = user.getRoles().stream().anyMatch(r -> roleName.equals(r.getName()));
        if (!hasRole) {
            user.getRoles().add(role);
            userRepository.save(user);
        }
    }
}

