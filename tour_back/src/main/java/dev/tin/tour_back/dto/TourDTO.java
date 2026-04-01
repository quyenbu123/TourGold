package dev.tin.tour_back.dto;

import dev.tin.tour_back.entity.ItineraryEntity;
import dev.tin.tour_back.entity.TourPriceEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TourDTO {
    private String name;
    private String description;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer maxQuantity;
    private String approvalStatus;
    private List<TourPriceEntity> tourPrices;
    private List<Long> typeOfTourIds;
    private List<ItineraryEntity> itineraries;
    private List<String> itineraryStrings;
    private List<ServiceDTO> services;
    // Control flags
    private boolean clearAllPrices;
    private boolean clearAllServices;
} 