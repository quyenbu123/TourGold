package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.UserTourViewEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.entity.TourEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;

public interface UserTourViewRepository extends JpaRepository<UserTourViewEntity, Long> {

    Optional<UserTourViewEntity> findByUserAndTour(UserEntity user, TourEntity tour);

    @Lock(LockModeType.OPTIMISTIC)
    @Query("select v from UserTourViewEntity v where v.id = :id")
    Optional<UserTourViewEntity> lockById(@Param("id") Long id);

    List<UserTourViewEntity> findByUser_IdOrderByLastViewedAtDesc(Long userId);

    List<UserTourViewEntity> findTop10ByUser_IdOrderByViewCountDesc(Long userId);
}
