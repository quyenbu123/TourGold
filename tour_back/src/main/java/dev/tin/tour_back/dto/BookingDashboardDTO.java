package dev.tin.tour_back.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookingDashboardDTO {
    private Long id;
    private String tourName;
    private LocalDateTime bookingTime;
    private LocalDateTime checkInDate;
    private LocalDateTime checkOutDate;
    private String status;
    private Double totalAmount;
    private Long tourId;
} 