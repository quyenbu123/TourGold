package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.PromotionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromotionRepository extends JpaRepository<PromotionEntity, Long> {
} 