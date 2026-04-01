package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.NotificationEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.UserRepository;
import dev.tin.tour_back.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    
    /**
     * Lấy thông báo của người dùng hiện tại
     */
    @GetMapping
    public ResponseEntity<?> getUserNotifications(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Unauthorized"
                ));
            }
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String username = userDetails.getUsername();
            
            // TODO: Lấy ID người dùng từ username
            // Đây là giả định, cần triển khai dựa trên cấu trúc ứng dụng của bạn
            Long userId = getUserIdFromUsername(username);
            
            List<NotificationEntity> notifications = notificationService.getUserNotifications(userId);
            
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi lấy thông báo: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Đánh dấu thông báo đã đọc
     */
    @PostMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId, Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Unauthorized"
                ));
            }
            
            NotificationEntity notification = notificationService.markAsRead(notificationId);
            
            return ResponseEntity.ok(notification);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi đánh dấu đã đọc: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Đánh dấu tất cả thông báo đã đọc
     */
    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Unauthorized"
                ));
            }
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String username = userDetails.getUsername();
            
            // TODO: Lấy ID người dùng từ username
            Long userId = getUserIdFromUsername(username);
            
            List<NotificationEntity> notifications = notificationService.markAllAsRead(userId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "markedCount", notifications.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi đánh dấu đã đọc: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Đếm số thông báo chưa đọc
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Unauthorized"
                ));
            }
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String username = userDetails.getUsername();
            
            // TODO: Lấy ID người dùng từ username
            Long userId = getUserIdFromUsername(username);
            
            long count = notificationService.countUnreadNotifications(userId);
            
            return ResponseEntity.ok(Map.of("count", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi đếm thông báo: " + e.getMessage()
            ));
        }
    }
    
    // Helper method để lấy userId từ username
    private Long getUserIdFromUsername(String username) {
        Optional<UserEntity> user = userRepository.findByUsername(username);
        if (user.isPresent()) {
            return user.get().getId();
        } else {
            throw new RuntimeException("Không tìm thấy người dùng với username: " + username);
        }
    }
} 