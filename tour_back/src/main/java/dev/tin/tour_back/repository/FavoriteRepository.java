package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.FavoriteEntity;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<FavoriteEntity, Long> {
    List<FavoriteEntity> findByUser(UserEntity user);
    List<FavoriteEntity> findByUserId(Long userId);
    Optional<FavoriteEntity> findByUserAndTour(UserEntity user, TourEntity tour);
    boolean existsByUserAndTour(UserEntity user, TourEntity tour);
    void deleteByUserAndTour(UserEntity user, TourEntity tour);
    void deleteByUser_Id(Long userId);
    void deleteByTour_Id(Long tourId);
} 