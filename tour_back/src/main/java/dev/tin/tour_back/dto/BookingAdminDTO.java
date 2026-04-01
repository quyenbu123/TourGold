package dev.tin.tour_back.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookingAdminDTO {
    private Long id;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private Long tourId;
    private String tourName;
    private Long invoiceId;
    private Double totalAmount;
    private LocalDateTime bookingTime;
    private LocalDateTime checkInDate;
    private LocalDateTime checkOutDate;
    private String status;
    private String statusDescription;
} 