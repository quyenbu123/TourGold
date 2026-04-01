package dev.tin.tour_back.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@Table(name = "tour_price")
@AllArgsConstructor
@NoArgsConstructor
public class TourPriceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private Long price;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    @JsonBackReference
    private TourEntity tour;
}
