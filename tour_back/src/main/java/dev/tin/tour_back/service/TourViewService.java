package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.*;
import dev.tin.tour_back.repository.UserTourViewEventRepository;
import dev.tin.tour_back.repository.UserTourViewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TourViewService {

    private final UserTourViewRepository userTourViewRepository;
    private final UserTourViewEventRepository userTourViewEventRepository;

    public TourViewService(UserTourViewRepository userTourViewRepository,
                           UserTourViewEventRepository userTourViewEventRepository) {
        this.userTourViewRepository = userTourViewRepository;
        this.userTourViewEventRepository = userTourViewEventRepository;
    }

    /**
     * Log that a user viewed a tour. Creates both aggregated record (if absent) and an event row.
     */
    @Transactional
    public void logView(UserEntity user, TourEntity tour, String userAgent, String referer, String clientIp) {
        if (user == null || tour == null) return;

        UserTourViewEntity aggregate = userTourViewRepository.findByUserAndTour(user, tour)
                .orElseGet(() -> {
                    UserTourViewEntity created = UserTourViewEntity.builder()
                            .user(user)
                            .tour(tour)
                            .viewCount(0L)
                            .firstViewedAt(LocalDateTime.now())
                            .lastViewedAt(LocalDateTime.now())
                            .build();
                    return userTourViewRepository.save(created);
                });

        // Update aggregate
        aggregate.setViewCount(aggregate.getViewCount() + 1);
        aggregate.setLastViewedAt(LocalDateTime.now());
        userTourViewRepository.save(aggregate);

        // Create event record
        UserTourViewEventEntity event = UserTourViewEventEntity.builder()
                .userTourView(aggregate)
                .viewedAt(LocalDateTime.now())
                .userAgent(userAgent)
                .referer(referer)
                .clientIp(clientIp)
                .build();
        userTourViewEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<TourEntity> getRecentlyViewedTours(Long userId, int limit) {
        return userTourViewRepository.findByUser_IdOrderByLastViewedAtDesc(userId).stream()
                .limit(limit)
                .map(UserTourViewEntity::getTour)
                .collect(Collectors.toList());
    }
}
