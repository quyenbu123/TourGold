package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.exception.CassoPaymentException;
import dev.tin.tour_back.repository.BookingRepository;
import dev.tin.tour_back.service.BookingService;
import dev.tin.tour_back.service.CassoService;
import dev.tin.tour_back.service.EmailService;
import dev.tin.tour_back.service.MockPaymentService;
import dev.tin.tour_back.events.PaymentEventPublisher;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/v1/payment/check")
@CrossOrigin(origins = "http://localhost:3000")
public class CheckoutController {

    @Autowired
    private CassoService cassoService;
    
    @Autowired
    private MockPaymentService mockPaymentService;
    
    @Autowired
    private PaymentEventPublisher paymentEventPublisher;
    
    @Value("${payment.mock.enabled:false}")
    private boolean mockEnabled;

    @Value("${payment.mock.auto-approve:false}")
    private boolean mockAutoApprove;
    
    @Value("${payment.mock.delay-ms:0}")
    private long mockDelayMs;
        
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private BookingRepository bookingRepository;
    
    @Autowired
    private BookingService bookingService;

    /**
     * Xử lý Exception từ CassoService
     * 
     * @param e Exception cần xử lý
     * @return ResponseEntity chứa thông tin lỗi
     */
    private ResponseEntity<Map<String, Object>> handleCassoError(CassoPaymentException e) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", 1);
        errorResponse.put("errorCode", e.getErrorCode());
        errorResponse.put("message", e.getMessage());
        errorResponse.put("path", e.getRequestPath());
        
        System.err.println("CassoPaymentException: " + e.toString());
        e.printStackTrace();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Lấy danh sách giao dịch từ Casso
     * Endpoint này dùng cho frontend để tránh gọi trực tiếp đến Casso API
     */
    @GetMapping("/transactions")
    public ResponseEntity<Map<String, Object>> getTransactions(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit) {
        System.out.println("Handling request for transactions via local endpoint: /api/v1/payment/check/transactions");
        System.out.println("Parameters: page=" + page + ", limit=" + limit);
        
        try {
            Map<String, Object> transactions = mockEnabled
                ? mockPaymentService.getTransactions(page, limit)
                : cassoService.getTransactions(page, limit);
            
            // Kiểm tra nếu có lỗi - handle both Boolean and Integer error values
            if (transactions.containsKey("error")) {
                Object errorValue = transactions.get("error");
                boolean hasError = false;
                
                // Check if error is a Boolean or Integer (1 = true)
                if (errorValue instanceof Boolean) {
                    hasError = (Boolean) errorValue;
                } else if (errorValue instanceof Integer) {
                    hasError = ((Integer) errorValue) == 1;
                }
                
                if (hasError) {
                    System.err.println("Error getting transactions: " + transactions.get("message"));
                }
            }
            
            // Log transaction count
            try {
                if (transactions.containsKey("data") && transactions.get("data") instanceof Map) {
                    Map<String, Object> data = (Map<String, Object>) transactions.get("data");
                    if (data != null && data.containsKey("records")) {
                        List<Map<String, Object>> records = (List<Map<String, Object>>) data.get("records");
                        System.out.println("Received " + records.size() + " transactions from Casso API via local endpoint");
                        
                        // Log pagination info
                        if (data.containsKey("totalPages")) {
                            System.out.println("Total pages: " + data.get("totalPages"));
                        }
                        if (data.containsKey("totalRecords")) {
                            System.out.println("Total records: " + data.get("totalRecords"));
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error parsing transaction data: " + e.getMessage());
            }
            
            return ResponseEntity.ok(transactions);
        } catch (CassoPaymentException e) {
            return handleCassoError(e);
        } catch (Exception e) {
            System.err.println("Exception in getTransactions endpoint: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);
            errorResponse.put("message", "Failed to retrieve transactions: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Lấy tất cả giao dịch từ Casso (tự động phân trang)
     */
    @GetMapping("/transactions/all")
    public ResponseEntity<Map<String, Object>> getAllTransactions() {
        try {
            Map<String, Object> transactions = mockEnabled
                ? mockPaymentService.getTransactions(1, 100)
                : cassoService.getAllTransactions();
            
            // Log transaction count
            try {
                if (transactions.containsKey("data") && transactions.get("data") instanceof Map) {
                    Map<String, Object> data = (Map<String, Object>) transactions.get("data");
                    if (data != null && data.containsKey("records")) {
                        List<Map<String, Object>> records = (List<Map<String, Object>>) data.get("records");
                        System.out.println("Received total of " + records.size() + " transactions from Casso API");
                    }
                }
            } catch (Exception e) {
                System.err.println("Error parsing transaction data: " + e.getMessage());
            }
            
            return ResponseEntity.ok(transactions);
        } catch (CassoPaymentException e) {
            return handleCassoError(e);
        } catch (Exception e) {
            System.err.println("Exception in getAllTransactions endpoint: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);
            errorResponse.put("message", "Failed to retrieve all transactions: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Kiểm tra trạng thái thanh toán
     */
    @GetMapping("/status/{orderId}")
    public ResponseEntity<Map<String, Object>> getPaymentStatus(@PathVariable String orderId) {
        System.out.println("Checking payment status for orderId: " + orderId);
        
        try {
            Map<String, Object> response = new HashMap<>();
            Map<String, Object> transaction = null;
            if (mockEnabled && mockAutoApprove) {
                if (mockDelayMs > 0) {
                    try { Thread.sleep(mockDelayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                }
                transaction = mockPaymentService.getLatestTransactionByOrderId(orderId, null);
            } else if (!mockEnabled) {
                transaction = cassoService.getLatestTransactionByOrderId(orderId);
            }
    
            if (transaction != null) {
                response.put("orderId", orderId);
                response.put("status", "paid");
                response.put("transaction", transaction);
                System.out.println("Payment found for orderId " + orderId + ": " + transaction.get("description"));
                
                // Extract booking ID from orderId (assuming format is "TOUR-{bookingId}")
                String bookingIdStr = orderId.replace("TOUR-", "");
                try {
                    Long bookingId = Long.parseLong(bookingIdStr);
                    
                    // Update booking status to PAID (ID 5)
                    BookingEntity updatedBooking = bookingService.updateBookingStatusToPaid(bookingId);
                    if (updatedBooking != null) {
                        System.out.println("Successfully updated booking status to PAID for booking ID: " + bookingId);
                        response.put("bookingStatus", "PAID");
                        try {
                            paymentEventPublisher.publishVerified(orderId, bookingId, ((Number)transaction.get("amount")).doubleValue(), (String)transaction.get("method"));
                        } catch (Exception ignore) {}
                    } else {
                        System.out.println("Failed to update booking status for booking ID: " + bookingId);
                    }
                    
                    // Look up the booking and send confirmation email
                    bookingRepository.findById(bookingId).ifPresent(booking -> {
                        try {
                            // Only send if not recently sent
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
                    });
                } catch (NumberFormatException e) {
                    System.err.println("Could not parse booking ID from orderId: " + orderId);
                }
            } else {
                response.put("orderId", orderId);
                response.put("status", mockEnabled ? "pending (mock)" : "pending");
                if (mockEnabled) {
                    response.put("message", "Mock mode enabled: use /api/v1/mock/casso/generate-transaction or admin approval to update status");
                }
                System.out.println("No payment found for orderId: " + orderId);
            }
    
            return ResponseEntity.ok(response);
        } catch (CassoPaymentException e) {
            return handleCassoError(e);
        } catch (Exception e) {
            System.err.println("Exception in getPaymentStatus endpoint: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);
            errorResponse.put("message", "Failed to check payment status: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Kiểm tra giao dịch theo orderId
     */
    @GetMapping("/verify/{orderId}")
    public ResponseEntity<Map<String, Object>> verifyPayment(
            @PathVariable String orderId,
            @RequestParam(required = false) Long amount) {
        System.out.println("Verifying payment for orderId: " + orderId + (amount != null ? ", amount: " + amount : ""));
        
        try {
            Map<String, Object> response = new HashMap<>();
            boolean isVerified;
            if (mockEnabled) {
                if (mockAutoApprove) {
                    if (mockDelayMs > 0) {
                        try { Thread.sleep(mockDelayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    }
                    isVerified = mockPaymentService.verifyPayment(orderId, amount);
                } else {
                    isVerified = false;
                }
            } else {
                isVerified = cassoService.verifyPayment(orderId, amount);
            }
            response.put("orderId", orderId);
            response.put("verified", isVerified);
    
            if (isVerified) {
                Map<String, Object> transaction = null;
                if (mockEnabled && mockAutoApprove) {
                    transaction = mockPaymentService.getLatestTransactionByOrderId(orderId, amount);
                } else if (!mockEnabled) {
                    transaction = cassoService.getLatestTransactionByOrderId(orderId);
                }
                if (transaction != null) {
                    response.put("transaction", transaction);
                    System.out.println("Found transaction for orderId " + orderId + ": " + transaction.get("description"));
                    
                    // Extract booking ID from orderId (assuming format is "TOUR-{bookingId}")
                    String bookingIdStr = orderId.replace("TOUR-", "");
                    try {
                        Long bookingId = Long.parseLong(bookingIdStr);
                        
                        // Update booking status to PAID (ID 5)
                        BookingEntity updatedBooking = bookingService.updateBookingStatusToPaid(bookingId);
                        if (updatedBooking != null) {
                            System.out.println("Successfully updated booking status to PAID for booking ID: " + bookingId);
                            response.put("bookingStatus", "PAID");
                        } else {
                            System.out.println("Failed to update booking status for booking ID: " + bookingId);
                        }
                    } catch (NumberFormatException e) {
                        System.err.println("Could not parse booking ID from orderId: " + orderId);
                    }
                }
            } else {
                System.out.println("No payment verified for orderId: " + orderId);
                if (mockEnabled && !mockAutoApprove) {
                    response.put("message", "Mock mode enabled without auto-approve: payment not verified unless simulated");
                }
            }
    
            return ResponseEntity.ok(response);
        } catch (CassoPaymentException e) {
            return handleCassoError(e);
        } catch (Exception e) {
            System.err.println("Exception in verifyPayment endpoint: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);
            errorResponse.put("message", "Failed to verify payment: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}