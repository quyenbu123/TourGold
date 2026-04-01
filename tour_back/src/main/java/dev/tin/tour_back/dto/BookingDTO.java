package dev.tin.tour_back.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingDTO {
    private Long id;
    private LocalDateTime bookingTime;
    private LocalDateTime checkInDate;
    private LocalDateTime checkOutDate;
    private TourDTO tour;
    private StatusDTO status;
    private InvoiceDTO invoice;
    
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TourDTO {
        private Long id;
        private String name;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String imageUrl;
        private Long price;
    }
    
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class StatusDTO {
        private Long id;
        private String name;
    }
    
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class InvoiceDTO {
        private Long id;
        private Double totalAmount;
        private LocalDateTime billingDate;
        private String paymentStatus;
    }
} 