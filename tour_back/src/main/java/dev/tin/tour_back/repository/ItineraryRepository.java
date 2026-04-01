package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.ItineraryEntity;
import dev.tin.tour_back.entity.TourEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItineraryRepository extends JpaRepository<ItineraryEntity, Long> {
    List<ItineraryEntity> findByTour(TourEntity tour);
}
