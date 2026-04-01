package dev.tin.tour_back.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Aggregated per-user per-tour view statistics.
 */
@Entity
@Table(name = "user_tour_view",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "tour_id"}),
        indexes = {
                @Index(name = "idx_user_tour_view_user", columnList = "user_id"),
                @Index(name = "idx_user_tour_view_tour", columnList = "tour_id"),
                @Index(name = "idx_user_tour_view_last", columnList = "last_viewed_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTourViewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tour_id", nullable = false)
    private TourEntity tour;

    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;

    @Column(name = "first_viewed_at")
    private LocalDateTime firstViewedAt;

    @Column(name = "last_viewed_at")
    private LocalDateTime lastViewedAt;

    @Version
    private Long version; // optimistic locking for concurrent updates
}
