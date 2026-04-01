package dev.tin.tour_back.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "type_of_service")
@NoArgsConstructor
@AllArgsConstructor
public class TypeOfServiceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
}
