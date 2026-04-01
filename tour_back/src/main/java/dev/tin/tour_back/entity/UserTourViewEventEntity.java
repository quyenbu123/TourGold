package dev.tin.tour_back.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Individual view events for a user-tour pair. Can optionally capture duration.
 */
@Entity
@Table(name = "user_tour_view_event",
        indexes = {
                @Index(name = "idx_utve_viewed_at", columnList = "viewed_at"),
                @Index(name = "idx_utve_utv", columnList = "user_tour_view_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTourViewEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_tour_view_id")
    private UserTourViewEntity userTourView;

    @Column(name = "viewed_at", nullable = false)
    private LocalDateTime viewedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds; // optional, if client reports dwell time

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "referer", length = 1024)
    private String referer;

    @Column(name = "client_ip", length = 64)
    private String clientIp;
}
