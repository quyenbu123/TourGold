package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.entity.PaymentEntity;
import dev.tin.tour_back.repository.BookingRepository;
import dev.tin.tour_back.service.CassoService;
import dev.tin.tour_back.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    private final CassoService cassoService;
    private final BookingRepository bookingRepository;

    @PostMapping("/{userId}")
    public ResponseEntity<PaymentEntity> addPayment(@PathVariable Long userId, @RequestBody PaymentEntity payment) {
        PaymentEntity savedPayment = paymentService.addPayment(userId, payment);
        return new ResponseEntity<>(savedPayment, HttpStatus.CREATED);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<PaymentEntity>> getPaymentsByUserId(@PathVariable Long userId) {
        List<PaymentEntity> payments = paymentService.getPaymentsByUserId(userId);
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    /**
     * Check payment status for a specific booking
     */
    @GetMapping("/check-payment/{bookingId}")
    public ResponseEntity<?> checkBookingPayment(@PathVariable Long bookingId) {
        try {
            BookingEntity booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
            
            String orderId = "TOUR-" + bookingId;
            
            // Check payment status through Casso
            Map<String, Object> transaction = cassoService.getLatestTransactionByOrderId(orderId);
            boolean isPaid = transaction != null;
            
            Map<String, Object> response = new HashMap<>();
            response.put("bookingId", bookingId);
            response.put("isPaid", isPaid);
            
            if (isPaid) {
                response.put("transaction", transaction);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to check payment: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Check and update payment status for a specific booking
     */
    @PostMapping("/check-payment/{bookingId}/update")
    public ResponseEntity<?> checkAndUpdateBookingPayment(@PathVariable Long bookingId) {
        try {
            BookingEntity booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
            
            String orderId = "TOUR-" + bookingId;
            
            // Check payment status through Casso
            Map<String, Object> transaction = cassoService.getLatestTransactionByOrderId(orderId);
            boolean isPaid = transaction != null;
            
            boolean statusUpdated = false;
            if (isPaid) {
                // If transaction is found, make sure booking status is updated to PAID
                String currentStatus = booking.getStatus() != null ? booking.getStatus().getName() : null;
                if (!"PAID".equals(currentStatus) && !"CONFIRMED".equals(currentStatus) && !"COMPLETED".equals(currentStatus)) {
                    statusUpdated = paymentService.checkAndUpdateBookingPaymentStatus(bookingId);
                } else {
                    // Already in correct status
                    statusUpdated = true;
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("bookingId", bookingId);
            response.put("isPaid", isPaid);
            response.put("statusUpdated", statusUpdated);
            
            if (isPaid) {
                response.put("transaction", transaction);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to update payment status: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Trigger manual check and update for all pending bookings
     */
    @PostMapping("/check-and-update")
    public ResponseEntity<?> checkAndUpdateAllBookings() {
        try {
            // Find all bookings in PENDING or PAYMENT_PENDING status
            int updatedCount = 0;
            
            for (BookingEntity booking : bookingRepository.findAll()) {
                if (booking.getStatus() != null && 
                    ("PENDING".equals(booking.getStatus().getName()) || 
                     "PAYMENT_PENDING".equals(booking.getStatus().getName()))) {
                    
                    String orderId = "TOUR-" + booking.getId();
                    Map<String, Object> transaction = cassoService.getLatestTransactionByOrderId(orderId);
                    
                    if (transaction != null) {
                        boolean updated = paymentService.checkAndUpdateBookingPaymentStatus(booking.getId());
                        if (updated) {
                            updatedCount++;
                        }
                    }
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "updatedBookings", updatedCount,
                "message", "Successfully checked and updated bookings"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to check and update bookings: " + e.getMessage()
            ));
        }
    }
}