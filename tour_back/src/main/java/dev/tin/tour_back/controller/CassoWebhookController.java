package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.entity.PaymentEntity;
import dev.tin.tour_back.repository.BookingRepository;
import dev.tin.tour_back.service.CassoService;
import dev.tin.tour_back.service.PaymentService;
import dev.tin.tour_back.events.PaymentEventPublisher;
import dev.tin.tour_back.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/payment/casso")
@RequiredArgsConstructor
public class CassoWebhookController {

    private final CassoService cassoService;
    private final PaymentService paymentService;
    private final BookingRepository bookingRepository;
    private final EmailService emailService;
    private final PaymentEventPublisher paymentEventPublisher;
    
    @Value("${payment.mock.enabled:false}")
    private boolean mockEnabled;

    @Value("${payment.mock.auto-approve:false}")
    private boolean mockAutoApprove;
    
    @Value("${payment.mock.delay-ms:0}")
    private long mockDelayMs;
    
    /**
     * Webhook endpoint cho Casso
     * Casso sẽ gọi đến endpoint này khi có giao dịch mới
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleCassoWebhook(@RequestBody Map<String, Object> payload) {
        try {
            System.out.println("====== RECEIVED CASSO WEBHOOK ======");
            System.out.println("Webhook payload: " + payload);
            
            // Xử lý dữ liệu từ Casso
            if (payload.containsKey("data") && payload.get("data") instanceof List) {
                List<Map<String, Object>> transactions = (List<Map<String, Object>>) payload.get("data");
                System.out.println("Found " + transactions.size() + " transactions in webhook");
                
                for (Map<String, Object> transaction : transactions) {
                    System.out.println("Processing transaction: " + transaction);
                    System.out.println("Description: " + transaction.get("description"));
                    System.out.println("Amount: " + transaction.get("amount"));
                    // Xử lý từng giao dịch
                    boolean updated = processTransaction(transaction);
                    System.out.println("Transaction processing result: " + (updated ? "UPDATED" : "NO UPDATE NEEDED"));
                }
            } else {
                System.out.println("No transaction data found in webhook or incorrect format");
            }
            
            return ResponseEntity.ok(Map.of("status", "success"));
        } catch (Exception e) {
            System.err.println("====== ERROR PROCESSING CASSO WEBHOOK ======");
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Endpoint thủ công để kiểm tra và cập nhật trạng thái các booking
     * Dùng khi không nhận được webhook từ Casso
     */
    @PostMapping("/check-and-update")
    public ResponseEntity<?> checkAndUpdateBookings() {
        try {
            if (mockEnabled) {
                return ResponseEntity.ok(Map.of(
                    "status", "mock",
                    "processed", 0,
                    "bookings_updated", 0,
                    "message", "Mock mode enabled: skipping external Casso checks"
                ));
            }
            System.out.println("Manually checking for new transactions...");
            
            // Lấy 50 giao dịch gần nhất từ Casso
            Map<String, Object> transactionsData = cassoService.getTransactions(1, 50);
            
            if (transactionsData.containsKey("data") && transactionsData.get("data") instanceof Map) {
                Map<String, Object> data = (Map<String, Object>) transactionsData.get("data");
                
                if (data.containsKey("records") && data.get("records") instanceof List) {
                    List<Map<String, Object>> transactions = (List<Map<String, Object>>) data.get("records");
                    
                    Map<String, Object> results = new HashMap<>();
                    results.put("total", transactions.size());
                    results.put("processed", 0);
                    results.put("bookings_updated", 0);
                    
                    int processed = 0;
                    int updated = 0;
                    
                    // Xử lý từng giao dịch
                    for (Map<String, Object> transaction : transactions) {
                        boolean wasUpdated = processTransaction(transaction);
                        processed++;
                        if (wasUpdated) updated++;
                    }
                    
                    results.put("processed", processed);
                    results.put("bookings_updated", updated);
                    
                    return ResponseEntity.ok(results);
                }
            }
            
            return ResponseEntity.ok(Map.of("status", "error", "message", "No transactions found"));
        } catch (Exception e) {
            System.err.println("Error checking for transactions: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Kiểm tra một booking cụ thể xem đã thanh toán chưa
     */
    @GetMapping("/check-booking/{bookingId}")
    public ResponseEntity<?> checkBookingPayment(@PathVariable Long bookingId,
                                                 @RequestParam(required = false, defaultValue = "false") boolean simulate) {
        try {
            System.out.println("Checking payment for booking ID: " + bookingId);
            
            // Tìm booking
            BookingEntity booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
            
            // Kiểm tra trạng thái hiện tại
            String currentStatus = booking.getStatus() != null ? 
                    (booking.getStatus().getName() != null ? booking.getStatus().getName() : "Unknown") : 
                    "Unknown";
            
            if ("PAID".equals(currentStatus) || "CONFIRMED".equals(currentStatus)) {
                return ResponseEntity.ok(Map.of(
                    "bookingId", bookingId,
                    "status", currentStatus,
                    "isPaid", true,
                    "message", "Booking is already paid"
                ));
            }
            
            if (mockEnabled) {
                Map<String, Object> response = new HashMap<>();
                response.put("bookingId", bookingId);
                response.put("status", currentStatus);
                response.put("isPaid", false);
                if (mockAutoApprove || simulate) {
                    if (mockAutoApprove && mockDelayMs > 0) {
                        try { Thread.sleep(mockDelayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    }
                    Map<String, Object> transaction = new HashMap<>();
                    transaction.put("amount", 9000L);
                    transaction.put("bank", "MOCK");
                    transaction.put("description", "Thanh toan cho tour TOUR" + bookingId);
                    processTransactionForBooking(transaction, booking);
                    response.put("isPaid", true);
                    response.put("message", simulate ? "Mock mode: Payment simulated via request and booking updated" : "Mock mode auto-approve: booking updated");
                    response.put("transaction", transaction);
                    response.put("newStatus", "PAID");
                } else {
                    response.put("message", "Mock mode enabled without auto-approve: call /api/v1/mock/casso/generate-transaction or pass simulate=true to update");
                }
                return ResponseEntity.ok(response);
            }
            
            // Kiểm tra giao dịch từ Casso
            String orderId = String.valueOf(bookingId);
            boolean isPaid = cassoService.verifyPayment(orderId, null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("bookingId", bookingId);
            response.put("status", currentStatus);
            response.put("isPaid", isPaid);
            
            if (isPaid) {
                // Lấy thông tin giao dịch
                Map<String, Object> transaction = cassoService.getLatestTransactionByOrderId(orderId);
                
                if (transaction != null) {
                    // Tạo payment và cập nhật booking
                    processTransactionForBooking(transaction, booking);
                    
                    // Send confirmation email
                    try {
                        if (!emailService.wasPaymentEmailRecentlySent(bookingId)) {
                            boolean sent = emailService.sendPaymentConfirmationEmail(booking);
                            if (sent) {
                                System.out.println("Payment confirmation email sent for booking ID: " + bookingId);
                            } else {
                                System.out.println("Payment confirmation email skipped for booking ID: " + bookingId);
                            }
                        } else {
                            System.out.println("Skipping duplicate payment confirmation email for booking ID: " + bookingId);
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to send payment confirmation email: " + e.getMessage());
                        e.printStackTrace();
                    }
                    
                    response.put("message", "Payment found and booking updated");
                    response.put("transaction", transaction);
                    response.put("newStatus", "PAID");
                } else {
                    response.put("message", "Payment verified but transaction details not found");
                }
            } else {
                response.put("message", "No payment found for this booking");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error checking booking payment: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "status", "error", 
                "bookingId", bookingId,
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Endpoint để lấy danh sách giao dịch gần đây
     * Frontend gọi định kỳ để kiểm tra thanh toán
     */
    @GetMapping("/check/transactions")
    public ResponseEntity<?> getRecentTransactions() {
        try {
            if (mockEnabled) {
                Map<String, Object> data = new HashMap<>();
                data.put("records", List.of());
                Map<String, Object> resp = new HashMap<>();
                resp.put("error", 0);
                resp.put("message", "mock-success");
                resp.put("data", data);
                return ResponseEntity.ok(resp);
            }
            // Lấy 50 giao dịch gần nhất từ Casso
            Map<String, Object> transactionsData = cassoService.getTransactions(1, 50);
            
            return ResponseEntity.ok(transactionsData);
        } catch (Exception e) {
            System.err.println("Error fetching transactions: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> response = new HashMap<>();
            response.put("error", 1);
            response.put("message", "Error: " + e.getMessage());
            
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * Xử lý giao dịch và cập nhật booking nếu có bookingId trong mô tả
     */
    private boolean processTransaction(Map<String, Object> transaction) {
        try {
            String description = (String) transaction.get("description");
            if (description == null) {
                System.out.println("Transaction has no description, skipping");
                return false;
            }
            
            // Tìm bookingId trong description
            Long bookingId = extractBookingIdFromDescription(description);
            if (bookingId == null) {
                System.out.println("No booking ID found in description: " + description);
                return false;
            }
            
            System.out.println("Found booking ID in transaction: " + bookingId);
            
            // Tìm booking
            BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
            if (booking == null) {
                System.out.println("Booking not found with ID: " + bookingId);
                return false;
            }
            
            System.out.println("Found booking: " + booking.getId() + " with user: " + booking.getUser().getUsername());
            
            // Kiểm tra nếu booking đã được thanh toán
            String currentStatus = booking.getStatus() != null ? 
                    (booking.getStatus().getName() != null ? booking.getStatus().getName() : "") : 
                    "";
            
            System.out.println("Current booking status: " + currentStatus);
            
            if ("PAID".equals(currentStatus) || "CONFIRMED".equals(currentStatus)) {
                System.out.println("Booking already paid, skipping update");
                return false;
            }
            
            // Xử lý giao dịch và cập nhật booking
            processTransactionForBooking(transaction, booking);
            System.out.println("Booking status updated to PAID");
            return true;
        } catch (Exception e) {
            System.err.println("Error processing transaction: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * Xử lý giao dịch cụ thể cho một booking
     */
    private void processTransactionForBooking(Map<String, Object> transaction, BookingEntity booking) {
        System.out.println("Processing transaction for booking ID: " + booking.getId());
        
        // Lấy thông tin từ giao dịch
        Long amount = ((Number) transaction.get("amount")).longValue();
        String bankName = (String) transaction.get("bank");
        String method = "Casso Banking Transfer - " + bankName;
        
        System.out.println("Transaction details - Amount: " + amount + ", Bank: " + bankName);
        
        // Tạo payment
        PaymentEntity payment = new PaymentEntity();
        payment.setUser(booking.getUser());
        payment.setAmount(amount.doubleValue());
        payment.setMethod(method);
        payment.setStatus("COMPLETED");
        payment.setIsRefunded(false);
        
        System.out.println("Created payment entity");
        
        PaymentEntity savedPayment = paymentService.addPayment(booking.getUser().getId(), payment);
        System.out.println("Saved payment with ID: " + savedPayment.getId());
        
        // Cập nhật trạng thái booking
        System.out.println("Calling processSuccessfulPayment to update booking status");
        paymentService.processSuccessfulPayment(booking.getId(), savedPayment.getId());
        System.out.println("Successfully processed payment for booking ID: " + booking.getId());
        try {
            String orderId = "TOUR-" + booking.getId();
            paymentEventPublisher.publishVerified(orderId, booking.getId(), payment.getAmount(), method);
        } catch (Exception e) {
            System.err.println("Failed to publish payment event: " + e.getMessage());
        }
        
        // Email sending for checkout completion is maintained
        try {
            // Only send if not recently sent
            if (!emailService.wasPaymentEmailRecentlySent(booking.getId())) {
                boolean sent = emailService.sendPaymentConfirmationEmail(booking);
                if (sent) {
                    System.out.println("Payment confirmation email sent for booking ID: " + booking.getId());
                } else {
                    System.out.println("Payment confirmation email skipped for booking ID: " + booking.getId());
                }
            } else {
                System.out.println("Skipping duplicate payment confirmation email for booking ID: " + booking.getId());
            }
        } catch (Exception e) {
            System.err.println("Failed to send payment confirmation email: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Trích xuất bookingId từ mô tả giao dịch
     * Tìm số sau từ khóa như "booking", "tour", "order", "#", "ID", hoặc bất kỳ số nào
     */
    private Long extractBookingIdFromDescription(String description) {
        System.out.println("Attempting to extract booking ID from description: " + description);
        
        // Các pattern phổ biến trong mô tả chuyển khoản
        String[] patterns = {
            "booking\\s*(id)?\\s*[:#]?\\s*(\\d+)",  // "booking id: 123", "booking #123"
            "tour\\s*(id)?\\s*[:#]?\\s*(\\d+)",     // "tour id: 123", "tour #123" 
            "order\\s*(id)?\\s*[:#]?\\s*(\\d+)",    // "order id: 123", "order #123"
            "#\\s*(\\d+)",                          // "#123"
            "id\\s*[:#]?\\s*(\\d+)",                // "id: 123"
            "ma\\s*[:#]?\\s*(\\d+)",                // "ma: 123" (tiếng Việt)
            "mã\\s*[:#]?\\s*(\\d+)",                // "mã: 123" (tiếng Việt có dấu)
            "tour(\\d+)",                           // "tour123"
            "(\\d+)"                                // Bất kỳ số nào (phương án cuối cùng)
        };
        
        // Thử từng pattern cho đến khi tìm thấy
        for (String patternStr : patterns) {
            System.out.println("Trying pattern: " + patternStr);
            Pattern pattern = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(description.toLowerCase());
            
            if (matcher.find()) {
                // Lấy nhóm cuối cùng trong pattern (số ID)
                String idStr = matcher.group(matcher.groupCount());
                System.out.println("Found match with pattern. Group count: " + matcher.groupCount() + ", ID: " + idStr);
                
                try {
                    Long bookingId = Long.parseLong(idStr);
                    System.out.println("Successfully extracted booking ID: " + bookingId);
                    return bookingId;
                } catch (NumberFormatException e) {
                    // Tiếp tục với pattern khác nếu không parse được số
                    System.out.println("Failed to parse ID as Long: " + idStr);
                    continue;
                }
            }
        }
        
        System.out.println("No booking ID could be extracted from description");
        return null;
    }
}
