package dev.tin.tour_back.controller;

import dev.tin.tour_back.service.VietQRService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payment/vietqr")
@CrossOrigin(origins = "http://localhost:3000")
public class VietQRController {

    @Autowired
    private VietQRService vietQRService;

    @GetMapping("/generate")
    public ResponseEntity<Map<String, String>> generateQR(
            @RequestParam String amount,
            @RequestParam String orderId) {
        Map<String, String> paymentInfo = vietQRService.generatePaymentInfo(amount, orderId);
        return ResponseEntity.ok(paymentInfo);
    }
    
    // Xử lý callback khi thanh toán hoàn tất (nếu cần)
    @PostMapping("/callback")
    public ResponseEntity<String> handleCallback(@RequestBody Map<String, Object> payload) {
        // Xử lý thông tin callback từ ngân hàng (nếu có)
        return ResponseEntity.ok("Payment notification received");
    }
}