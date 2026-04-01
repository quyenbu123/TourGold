package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<NotificationEntity> findByUserIdAndIsReadFalse(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);
    void deleteByUserId(Long userId);
} 