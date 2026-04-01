package dev.tin.tour_back.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "PROMOTION")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PromotionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PROMOTION_ID")
    private Long promotionId;

    @Column(name = "NAME")
    private String name;

    @Column(name = "DESCRIPTION")
    private String description;

    @Column(name = "START_DATE")
    private LocalDateTime startDate;

    @Column(name = "END_DATE")
    private LocalDateTime endDate;

    @Column(name = "DISCOUNT_AMOUNT")
    private Double discountAmount;

    @Column(name = "ELIGIBILITY_CRITERIA")
    private String eligibilityCriteria;

    @Column(name = "STATUS")
    private String status;
} 