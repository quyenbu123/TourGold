package dev.tin.tour_back.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "itinerary")
@AllArgsConstructor
@NoArgsConstructor
public class ItineraryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(columnDefinition = "TEXT")
    private String itinerary;
    
    private LocalDateTime date_time;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    @JsonBackReference
    private TourEntity tour;
}
