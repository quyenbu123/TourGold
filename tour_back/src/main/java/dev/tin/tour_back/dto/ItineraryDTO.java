package dev.tin.tour_back.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ItineraryDTO {
    private String itinerary;
    private LocalDateTime date_time;
} 