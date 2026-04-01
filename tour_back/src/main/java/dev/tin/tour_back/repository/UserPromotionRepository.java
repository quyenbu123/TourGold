package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.UserPromotionEntity;
import dev.tin.tour_back.entity.UserPromotionEntity.UserPromotionId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserPromotionRepository extends JpaRepository<UserPromotionEntity, UserPromotionId> {
    List<UserPromotionEntity> findByIdUserId(Long userId);
    List<UserPromotionEntity> findByIdPromotionId(Long promotionId);
    Optional<UserPromotionEntity> findById_UserIdAndId_PromotionId(Long userId, Long promotionId);
} 