package dev.tin.tour_back.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tour")  // Chỉ định đây là entity của MySQL
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TourEntity {

    @Id// ID tự tăng
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime startDate;
    private LocalDateTime endDate;
    @Column(name = "max_quantity")
    private Integer maxQuantity;
    private Boolean isDeleted = false;
    private String approvalStatus;
    private Boolean isDisplayed = true;

    @ManyToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(name = "tour_type_of_tour", joinColumns = @JoinColumn(name = "tour_id", referencedColumnName = "id"),
            inverseJoinColumns = @JoinColumn(name = "type_of_tour_id", referencedColumnName = "id"))
    private List<TypeOfTourEntity> typeOfTourEntities = new ArrayList<>();

    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<TourImageEntity> images = new ArrayList<>();

    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<TourPriceEntity> tourPrices = new ArrayList<>();

    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<ServiceEntity> tourServices = new ArrayList<>();

    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<ItineraryEntity> itineraries = new ArrayList<>();

    // Chủ sở hữu tour (Host)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    @JsonIgnore
    private UserEntity owner;

    /**
     * Lấy hình ảnh chính của tour (hình có ID thấp nhất)
     * @return URL của hình ảnh chính hoặc null nếu không có hình
     */
    @Transient
    public String getMainImageUrl() {
        if (images == null || images.isEmpty()) {
            return null;
        }

        // Tìm hình có ID thấp nhất
        TourImageEntity mainImage = images.stream()
            .min((img1, img2) -> img1.getId().compareTo(img2.getId()))
            .orElse(null);

        return mainImage != null ? mainImage.getUrl() : null;
    }
}
