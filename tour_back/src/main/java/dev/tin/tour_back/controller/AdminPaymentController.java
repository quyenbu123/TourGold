package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.repository.BookingRepository;
import dev.tin.tour_back.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/payments")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final PaymentService paymentService;
    private final BookingRepository bookingRepository;
    
    /**
     * Lấy danh sách các booking có trạng thái PAID (đã thanh toán nhưng chưa xác nhận)
     */
    @GetMapping("/pending-approval")
    public ResponseEntity<?> getPendingApprovals() {
        try {
            // Tìm các booking có trạng thái PAID
            List<BookingEntity> pendingBookings = bookingRepository.findAll().stream()
                    .filter(booking -> booking.getStatus() != null && 
                            "PAID".equals(booking.getStatus().getName()))
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(pendingBookings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi lấy danh sách: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Phê duyệt thanh toán
     */
    @PostMapping("/approve/{bookingId}")
    public ResponseEntity<?> approvePayment(
            @PathVariable Long bookingId,
            @RequestBody(required = false) Map<String, String> payload) {
        try {
            String adminNote = payload != null ? payload.get("note") : null;
            
            BookingEntity updatedBooking = paymentService.approvePayment(bookingId, adminNote);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Thanh toán đã được phê duyệt thành công",
                "booking", updatedBooking
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi phê duyệt thanh toán: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Từ chối thanh toán
     */
    @PostMapping("/reject/{bookingId}")
    public ResponseEntity<?> rejectPayment(
            @PathVariable Long bookingId,
            @RequestBody Map<String, String> payload) {
        try {
            String reason = payload.get("reason");
            if (reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Vui lòng cung cấp lý do từ chối thanh toán"
                ));
            }
            
            BookingEntity updatedBooking = paymentService.rejectPayment(bookingId, reason);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Thanh toán đã bị từ chối",
                "booking", updatedBooking
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi từ chối thanh toán: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Lấy chi tiết booking và payment để xem xét
     */
    @GetMapping("/booking-details/{bookingId}")
    public ResponseEntity<?> getBookingDetails(@PathVariable Long bookingId) {
        try {
            BookingEntity booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
            
            Map<String, Object> response = new HashMap<>();
            response.put("booking", booking);
            
            // Thêm thông tin chi tiết khác nếu cần
            if (booking.getInvoice() != null) {
                response.put("invoice", booking.getInvoice());
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Lỗi khi lấy thông tin chi tiết: " + e.getMessage()
            ));
        }
    }
} 