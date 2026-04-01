package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.BookingStatusEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingStatusRepository extends JpaRepository<BookingStatusEntity, Long> {
    // Thêm vào BookingStatusRepository:
    Optional<BookingStatusEntity> findByName(String name);
}