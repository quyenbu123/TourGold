package dev.tin.tour_back.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import dev.tin.tour_back.dto.AuthResponseDTO;
import dev.tin.tour_back.dto.LoginDTO;
import dev.tin.tour_back.dto.RegisterDTO;
import dev.tin.tour_back.dto.BookingDashboardDTO;
import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.config.UserPrincipal;
import dev.tin.tour_back.repository.BookingRepository;
import dev.tin.tour_back.repository.UserRepository;
import dev.tin.tour_back.service.UserService;
import dev.tin.tour_back.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@RequestMapping("/api/v1")
public class UserController {

    private final UserService userService;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserEntity>> getUsers() {
        try {
            List<UserEntity> users = userService.getUsers();
            System.out.println("Found " + users.size() + " users");
            return new ResponseEntity<>(users, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error getting all users: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.userId")
    public ResponseEntity<UserEntity> getUser(@PathVariable("id") Long id) {
        try {
            UserEntity user = userService.getUser(id);
            if (user != null) {
                System.out.println("Found user with id: " + id);
                return new ResponseEntity<>(user, HttpStatus.OK);
            } else {
                System.out.println("User not found with id: " + id);
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            System.out.println("Error getting user with id " + id + ": " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.userId")
    public ResponseEntity<UserEntity> updateUser(@RequestBody UserEntity user, @PathVariable("id") Long id) {
        try {
            // Đảm bảo ID trong đường dẫn trùng khớp với ID trong body
            if (!user.getId().equals(id)) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            System.out.println("Updating user with id: " + id);
            UserEntity updatedUser = userService.updateUser(user);
            return new ResponseEntity<>(updatedUser, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error updating user with id " + id + ": " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<String> newUser(@RequestBody @Validated RegisterDTO registerDTO) {
        try {
            System.out.println("Registering new user with email: " + registerDTO.getEmail());
            userService.addUser(registerDTO);
            return new ResponseEntity<>("User registered successfully!", HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error registering user: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Error registering user: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable("id") Long id) {
        try {
            System.out.println("Deleting user with id: " + id);
            userService.deleteUser(id);
            return new ResponseEntity<>("User deleted successfully", HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error deleting user with id " + id + ": " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Error deleting user: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody @Validated LoginDTO request) {
        try {
            // Debug the request
            System.out.println("Login request received: " + objectMapper.writeValueAsString(request));
            
            // Kiểm tra loginIdentifier có null hay không
            String loginIdentifier = request.getLoginIdentifier();
            if (loginIdentifier == null || loginIdentifier.trim().isEmpty()) {
                System.out.println("Login failed: Username or email is required");
                return new ResponseEntity<>("Username or email is required", HttpStatus.BAD_REQUEST);
            }
            
            if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
                System.out.println("Login failed: Password is required");
                return new ResponseEntity<>("Password is required", HttpStatus.BAD_REQUEST);
            }
            
            System.out.println("Login attempt for user: " + loginIdentifier);
            
            AuthResponseDTO response = authService.attemptLogin(loginIdentifier, request.getPassword());
            System.out.println("Login successful for: " + loginIdentifier);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Login failed: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Authentication failed: " + e.getMessage(), HttpStatus.UNAUTHORIZED);
        }
    }

    @GetMapping("/secured")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> secured(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            String message = "If you see this, then you're logged in as user " + principal.getEmail() + ", User ID: " + principal.getUserId();
            return new ResponseEntity<>(message, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error in secured endpoint: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> admin(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            String message = "If you see this, then you're admin " + principal.getEmail() + ", User ID: " + principal.getUserId();
            return new ResponseEntity<>(message, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error in admin endpoint: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/users/{userId}/bookings")
    public ResponseEntity<List<BookingDashboardDTO>> getUserBookings(@PathVariable Long userId) {
        System.out.println("Fetching bookings for user ID: " + userId);
        try {
            if (!userRepository.existsById(userId)) {
                System.out.println("User not found with ID: " + userId);
                return ResponseEntity.notFound().build();
            }
            
            List<BookingEntity> bookings = bookingRepository.findByUserId(userId);
            System.out.println("Found " + bookings.size() + " raw bookings from repository");
            
            List<BookingDashboardDTO> bookingDTOs = bookings.stream()
                .map(booking -> {
                    System.out.println("Processing booking ID: " + booking.getId());
                    BookingDashboardDTO dto = new BookingDashboardDTO();
                    dto.setId(booking.getId());
                    dto.setTourId(booking.getTour().getId());
                    dto.setTourName(booking.getTour().getName());
                    dto.setBookingTime(booking.getBookingTime());
                    dto.setCheckInDate(booking.getCheckInDate());
                    dto.setCheckOutDate(booking.getCheckOutDate());
                    dto.setStatus(booking.getStatus().getName());
                    dto.setTotalAmount(booking.getInvoice() != null ? booking.getInvoice().getTotalAmount() : 0.0);
                    System.out.println("Mapped DTO: " + dto);
                    return dto;
                })
                .collect(Collectors.toList());
            
            System.out.println("Found " + bookingDTOs.size() + " bookings for user ID: " + userId);
            return ResponseEntity.ok(bookingDTOs);
        } catch (Exception e) {
            System.err.println("Error fetching bookings for user ID " + userId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
