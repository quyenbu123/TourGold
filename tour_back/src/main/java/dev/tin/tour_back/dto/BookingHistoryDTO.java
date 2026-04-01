package dev.tin.tour_back.dto;

import dev.tin.tour_back.entity.BookingEntity;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingHistoryDTO {
    private Long id;
    private LocalDateTime bookingTime;
    private LocalDateTime checkInDate;
    private LocalDateTime checkOutDate;
    private BookingStatusDTO status;
    private TourDTO tour;
    private Double totalAmount;
    private String paymentStatus;

    @Data
    public static class TourDTO {
        private Long id;
        private String name;
        private String description;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String mainImageUrl;
    }

    @Data
    public static class BookingStatusDTO {
        private Long id;
        private String name;
        private String description;
    }

    public static BookingHistoryDTO fromEntity(BookingEntity booking) {
        BookingHistoryDTO dto = new BookingHistoryDTO();
        dto.setId(booking.getId());
        dto.setBookingTime(booking.getBookingTime());
        dto.setCheckInDate(booking.getCheckInDate());
        dto.setCheckOutDate(booking.getCheckOutDate());
        
        if (booking.getStatus() != null) {
            BookingStatusDTO statusDTO = new BookingStatusDTO();
            statusDTO.setId(booking.getStatus().getId());
            statusDTO.setName(booking.getStatus().getName());
            statusDTO.setDescription(booking.getStatus().getDescription());
            dto.setStatus(statusDTO);
        }
        
        if (booking.getTour() != null) {
            TourDTO tourDTO = new TourDTO();
            tourDTO.setId(booking.getTour().getId());
            tourDTO.setName(booking.getTour().getName());
            tourDTO.setDescription(booking.getTour().getDescription());
            tourDTO.setStartDate(booking.getTour().getStartDate());
            tourDTO.setEndDate(booking.getTour().getEndDate());
            
            // Lấy ảnh đầu tiên làm ảnh chính
            if (!booking.getTour().getImages().isEmpty()) {
                tourDTO.setMainImageUrl(booking.getTour().getImages().get(0).getUrl());
            }
            
            dto.setTour(tourDTO);
        }
        
        if (booking.getInvoice() != null) {
            dto.setTotalAmount(booking.getInvoice().getTotalAmount());
            
            // Lấy trạng thái thanh toán từ invoice detail
            if (!booking.getInvoice().getInvoiceDetails().isEmpty()) {
                dto.setPaymentStatus(booking.getInvoice().getInvoiceDetails().get(0).getStatus());
            } else {
                dto.setPaymentStatus("PENDING");
            }
        }
        
        return dto;
    }
} 