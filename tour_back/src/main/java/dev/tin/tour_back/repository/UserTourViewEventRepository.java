package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.UserTourViewEventEntity;
import dev.tin.tour_back.entity.UserTourViewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UserTourViewEventRepository extends JpaRepository<UserTourViewEventEntity, Long> {

    List<UserTourViewEventEntity> findByUserTourViewOrderByViewedAtDesc(UserTourViewEntity view);

    @Query("select e from UserTourViewEventEntity e where e.userTourView.user.id = :userId order by e.viewedAt desc")
    List<UserTourViewEventEntity> findRecentEventsForUser(@Param("userId") Long userId);

    long countByUserTourView_User_IdAndViewedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    /**
     * Aggregate counts per tour for a user since a given timestamp, ordered by count desc.
     */
    @Query("select e.userTourView.tour.id as tourId, count(e.id) as cnt " +
            "from UserTourViewEventEntity e " +
            "where e.userTourView.user.id = :userId and e.viewedAt >= :since " +
            "group by e.userTourView.tour.id " +
            "order by cnt desc")
    List<Object[]> findTopTourCountsSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
