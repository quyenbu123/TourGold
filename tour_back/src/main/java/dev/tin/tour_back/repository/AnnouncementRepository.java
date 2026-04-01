package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
	java.util.List<Announcement> findTop20ByOrderByCreatedAtDesc();
}
