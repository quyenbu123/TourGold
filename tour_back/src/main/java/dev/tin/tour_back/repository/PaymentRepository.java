package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.PaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {
    void deleteByUserId(Long userId);
}