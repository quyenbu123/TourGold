package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.TourImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TourImageRepository extends JpaRepository<TourImageEntity, Long> {
    List<TourImageEntity> findByTour(TourEntity tour);
    
    /**
     * Tìm hình ảnh có ID thấp nhất của một tour
     */
    @Query("SELECT ti FROM TourImageEntity ti WHERE ti.tour.id = :tourId ORDER BY ti.id ASC LIMIT 1")
    Optional<TourImageEntity> findFirstByTourIdOrderByIdAsc(@Param("tourId") Long tourId);
    
    /**
     * Tìm tất cả hình ảnh của một tour, sắp xếp theo ID tăng dần
     */
    List<TourImageEntity> findByTourIdOrderByIdAsc(Long tourId);
}
