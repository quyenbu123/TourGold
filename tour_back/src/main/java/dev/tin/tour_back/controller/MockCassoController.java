package dev.tin.tour_back.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Controller to simulate Casso API responses for testing purposes
 */
@RestController
@RequestMapping("/api/v1/mock/casso")
@CrossOrigin(origins = "*")
public class MockCassoController {

    @Autowired
    private CassoWebhookController cassoWebhookController;

    /**
     * Generates a mock Casso transaction for testing
     * @param bookingId The booking ID to include in the transaction description
     * @param amount The amount for the transaction (optional)
     * @return Mock Casso API response with a transaction matching the booking ID
     */
    @PostMapping("/generate-transaction")
    public ResponseEntity<?> generateMockTransaction(
            @RequestParam Long bookingId,
            @RequestParam(required = false) Long amount) {
        
        System.out.println("Generating mock Casso transaction for bookingId: " + bookingId);
        
        if (amount == null) {
            // Default amount
            amount = 9000L;
        }
        
        // Get current timestamp
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
        String formattedTime = now.format(formatter);
        
        // Create a basic transaction ID with timestamp
        String tid = "mock" + now.getNano() + "-" + System.currentTimeMillis();
        
        // Create a description that matches the pattern expected by the backend
        // Format: [bank_acc_number] Thanh toan cho tour TOUR[bookingId]
        String description = "8815231869 Thanh toan cho tour TOUR" + bookingId;
        
        // Create the transaction record
        Map<String, Object> transaction = new HashMap<>();
        transaction.put("id", System.currentTimeMillis());
        transaction.put("tid", tid);
        transaction.put("description", description);
        transaction.put("amount", amount);
        transaction.put("cusumBalance", amount * 2);
        transaction.put("when", formattedTime);
        transaction.put("bankSubAccId", "8815231869");
        transaction.put("paymentChannel", "");
        transaction.put("virtualAccount", "");
        transaction.put("virtualAccountName", "");
        transaction.put("corresponsiveName", "");
        transaction.put("corresponsiveAccount", "");
        transaction.put("corresponsiveBankId", "");
        transaction.put("corresponsiveBankName", "");
        transaction.put("accountId", 12083);
        transaction.put("bankCodeName", "bidv");
        transaction.put("bank", "BIDV");
        
        // Create the response structure
        List<Map<String, Object>> records = new ArrayList<>();
        records.add(transaction);
        
        Map<String, Object> data = new HashMap<>();
        data.put("page", 1);
        data.put("pageSize", 10);
        data.put("nextPage", 1);
        data.put("prevPage", 1);
        data.put("totalPages", 1);
        data.put("totalRecords", 1);
        data.put("records", records);
        
        Map<String, Object> response = new HashMap<>();
        response.put("error", 0);
        response.put("message", "success");
        response.put("data", data);
        
        // Trigger webhook processing to update the booking status
        try {
            triggerWebhookProcessing(records);
        } catch (Exception e) {
            System.err.println("Error triggering webhook processing: " + e.getMessage());
            e.printStackTrace();
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Programmatically trigger webhook processing for mock transactions
     * This simulates what Casso would do when sending a webhook notification
     */
    private void triggerWebhookProcessing(List<Map<String, Object>> transactions) {
        try {
            // Create the webhook payload
            Map<String, Object> webhookPayload = new HashMap<>();
            webhookPayload.put("data", transactions);
            
            // Use the autowired webhook controller
            System.out.println("=============================================");
            System.out.println("Programmatically triggering webhook processing for mock transaction");
            System.out.println("Transaction details: " + transactions);
            System.out.println("=============================================");
            
            // Gọi webhook handler
            ResponseEntity<?> result = cassoWebhookController.handleCassoWebhook(webhookPayload);
            
            System.out.println("=============================================");
            System.out.println("Webhook processing completed with result: " + result.getBody());
            System.out.println("=============================================");
        } catch (Exception e) {
            System.err.println("=============================================");
            System.err.println("ERROR in webhook processing: " + e.getMessage());
            e.printStackTrace();
            System.err.println("=============================================");
        }
    }
} 