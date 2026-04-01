package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.ServiceEntity;
import dev.tin.tour_back.entity.TourEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {
    List<ServiceEntity> findByTour(TourEntity tour);
}
