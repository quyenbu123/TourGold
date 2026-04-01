package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.NotificationEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.NotificationRepository;
import dev.tin.tour_back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    
    /**
     * Tạo thông báo cho một người dùng cụ thể
     */
    public NotificationEntity createUserNotification(Long userId, String title, String content, String type, Long referenceId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        NotificationEntity notification = new NotificationEntity();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setIsRead(false);
        
        return notificationRepository.save(notification);
    }
    
    /**
     * Tạo thông báo cho tất cả admin
     */
    public List<NotificationEntity> createAdminNotification(String title, String content, String type, Long referenceId) {
        // Tìm tất cả người dùng có vai trò ADMIN
        List<UserEntity> admins = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> "ROLE_ADMIN".equals(role.getName())))
                .collect(Collectors.toList());
        
        if (admins.isEmpty()) {
            System.out.println("Không tìm thấy admin nào để gửi thông báo");
            return List.of();
        }
        
        // Tạo thông báo cho mỗi admin
        return admins.stream()
                .map(admin -> {
                    NotificationEntity notification = new NotificationEntity();
                    notification.setUser(admin);
                    notification.setTitle(title);
                    notification.setContent(content);
                    notification.setType(type);
                    notification.setReferenceId(referenceId);
                    notification.setCreatedAt(LocalDateTime.now());
                    notification.setIsRead(false);
                    
                    return notificationRepository.save(notification);
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Lấy tất cả thông báo của một người dùng
     */
    public List<NotificationEntity> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    /**
     * Đánh dấu thông báo đã đọc
     */
    public NotificationEntity markAsRead(Long notificationId) {
        NotificationEntity notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        
        return notificationRepository.save(notification);
    }
    
    /**
     * Đánh dấu tất cả thông báo của người dùng đã đọc
     */
    public List<NotificationEntity> markAllAsRead(Long userId) {
        List<NotificationEntity> unreadNotifications = notificationRepository.findByUserIdAndIsReadFalse(userId);
        
        LocalDateTime now = LocalDateTime.now();
        unreadNotifications.forEach(notification -> {
            notification.setIsRead(true);
            notification.setReadAt(now);
        });
        
        return notificationRepository.saveAll(unreadNotifications);
    }
    
    /**
     * Đếm số thông báo chưa đọc của người dùng
     */
    public long countUnreadNotifications(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
} 