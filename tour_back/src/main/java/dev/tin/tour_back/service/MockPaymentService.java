package dev.tin.tour_back.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class MockPaymentService {

    public Map<String, Object> getTransactions(Integer page, Integer limit) {
        Map<String, Object> data = new HashMap<>();
        data.put("page", page != null ? page : 1);
        data.put("pageSize", limit != null ? limit : 50);
        data.put("nextPage", 1);
        data.put("prevPage", 1);
        data.put("totalPages", 1);
        data.put("totalRecords", 0);
        data.put("records", new ArrayList<>());

        Map<String, Object> response = new HashMap<>();
        response.put("error", 0);
        response.put("message", "mock-success");
        response.put("data", data);
        return response;
    }

    public boolean verifyPayment(String orderId, Long amount) {
        // Deterministic: any non-empty orderId is treated as paid in mock mode
        return orderId != null && !orderId.trim().isEmpty();
    }

    public Map<String, Object> getLatestTransactionByOrderId(String orderId, Long amount) {
        if (orderId == null || orderId.trim().isEmpty()) return null;

        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
        String formattedTime = now.format(formatter);

        Map<String, Object> transaction = new HashMap<>();
        transaction.put("id", System.currentTimeMillis());
        transaction.put("tid", "mock-" + System.nanoTime());
        transaction.put("description", "Thanh toan cho tour " + orderId.replace("-", ""));
        transaction.put("amount", amount != null ? amount : 9000L);
        transaction.put("when", formattedTime);
        transaction.put("bank", "MOCK");
        transaction.put("bankCodeName", "mockbank");
        return transaction;
    }
}
