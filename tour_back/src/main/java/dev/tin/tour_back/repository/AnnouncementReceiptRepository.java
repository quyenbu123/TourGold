package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.AnnouncementReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AnnouncementReceiptRepository extends JpaRepository<AnnouncementReceipt, Long> {
    long countByUser_IdAndSeenFalse(Long userId);

    List<AnnouncementReceipt> findTop50ByUser_IdOrderByAnnouncement_CreatedAtDesc(Long userId);

    @Query("select r from AnnouncementReceipt r join fetch r.announcement a where r.user.id = :userId order by a.createdAt desc")
    List<AnnouncementReceipt> findTop50WithAnnouncementByUserOrderByAnnouncementCreatedAtDesc(@Param("userId") Long userId);
}
