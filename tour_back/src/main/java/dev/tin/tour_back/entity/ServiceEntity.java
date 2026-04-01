package dev.tin.tour_back.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Table(name = "service")
public class ServiceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private Long price;
    private boolean available = true;
    private LocalDateTime createdAt;

    //join table tour lấy id tour
    @ManyToOne
    @JoinColumn(name = "tour_id", nullable = false)
    @JsonBackReference
    private TourEntity tour;

    //join table Type Of Service lấy id type of service
    @ManyToOne
    @JoinColumn(name = "type_of_service_id", nullable = false)
    private TypeOfServiceEntity typeOfService;
}
