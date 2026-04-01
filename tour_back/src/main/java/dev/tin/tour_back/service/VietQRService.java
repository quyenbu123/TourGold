package dev.tin.tour_back.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
public class VietQRService {

    @Value("${payment.vietqr.bankCode}")
    private String bankCode;

    @Value("${payment.vietqr.accountNumber}")
    private String accountNumber;

    @Value("${payment.vietqr.accountName}")
    private String accountName;
    
    @Value("${payment.vietqr.description}")
    private String defaultDescription;

    /**
     * Tạo URL QR Code thanh toán VietQR
     * 
     * @param amount Số tiền thanh toán
     * @param orderId Mã đơn hàng
     * @return URL hình ảnh QR code
     */
    public String generateQRUrl(String amount, String orderId) {
        try {
            // Tạo nội dung thanh toán với mã đơn hàng
            String description = defaultDescription + " #" + orderId;
            String encodedDescription = URLEncoder.encode(description, StandardCharsets.UTF_8);
            String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
            
            // Tạo URL VietQR trực tiếp (sử dụng API public của VietQR)
            return String.format(
                "https://img.vietqr.io/image/%s-%s-compact.png?accountName=%s&amount=%s&addInfo=%s",
                bankCode, 
                accountNumber,
                encodedAccountName,
                amount,
                encodedDescription
            );
        } catch (Exception e) {
            throw new RuntimeException("Error generating VietQR URL", e);
        }
    }
    
    /**
     * Tạo thông tin thanh toán đầy đủ
     * 
     * @param amount Số tiền thanh toán
     * @param orderId Mã đơn hàng
     * @return Thông tin thanh toán
     */
    public Map<String, String> generatePaymentInfo(String amount, String orderId) {
        Map<String, String> paymentInfo = new HashMap<>();
        paymentInfo.put("qrUrl", generateQRUrl(amount, orderId));
        paymentInfo.put("bankCode", bankCode);
        paymentInfo.put("accountNumber", accountNumber);
        paymentInfo.put("accountName", accountName);
        paymentInfo.put("amount", amount);
        paymentInfo.put("description", defaultDescription + " #" + orderId);
        paymentInfo.put("orderId", orderId);
        return paymentInfo;
    }
}