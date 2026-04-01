package dev.tin.tour_back.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ServiceDTO {
    private String name;
    private String description;
    private Long price;
    private boolean available = true;
    private LocalDateTime createdAt;
    private Long tourId;
    private Long typeOfTourId;
}
