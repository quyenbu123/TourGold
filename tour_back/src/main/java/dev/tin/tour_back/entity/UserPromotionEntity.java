package dev.tin.tour_back.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Entity
@Table(name = "USER_PROMOTION")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserPromotionEntity {

    @EmbeddedId
    private UserPromotionId id;

    @ManyToOne
    @MapsId("userId")
    @JoinColumn(name = "USER_ID")
    private UserEntity user;

    @ManyToOne
    @MapsId("promotionId")
    @JoinColumn(name = "PROMOTION_ID")
    private PromotionEntity promotion;

    // EmbeddedId class
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserPromotionId implements Serializable {
        private Long userId;
        private Long promotionId;
    }
} 