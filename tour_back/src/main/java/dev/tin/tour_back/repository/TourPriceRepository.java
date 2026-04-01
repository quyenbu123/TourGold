package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.TourPriceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TourPriceRepository extends JpaRepository<TourPriceEntity, Long> {
    List<TourPriceEntity> findByTour(TourEntity tour);
    
    // Xóa tất cả giá tour theo tour_id bằng Native Query để tránh Optimistic Locking
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM tour_price WHERE tour_id = ?1", nativeQuery = true)
    void deleteAllByTourId(Long tourId);
}
