package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.BookingEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<BookingEntity, Long> {
    @EntityGraph(attributePaths = {"user", "tour", "invoice", "status"})
    List<BookingEntity> findAll();
    
    @EntityGraph(attributePaths = {"user", "tour", "invoice", "status"})
    List<BookingEntity> findByUserId(Long userId);
    
    @EntityGraph(attributePaths = {"user", "tour", "invoice", "status"})
    List<BookingEntity> findByTourId(Long tourId);
    
    void deleteByUserId(Long userId);
    void deleteByTour_Id(Long tourId);
}