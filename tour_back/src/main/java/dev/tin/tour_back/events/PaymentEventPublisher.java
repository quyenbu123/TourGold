package dev.tin.tour_back.events;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Component
public class PaymentEventPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    public PaymentEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishVerified(String orderId, Long bookingId, Double amount, String method) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "payment.verified");
        payload.put("orderId", orderId);
        payload.put("bookingId", bookingId);
        payload.put("amount", amount);
        payload.put("method", method);
        payload.put("timestamp", Instant.now().toString());

        // Publish by order and booking topics
        messagingTemplate.convertAndSend("/topic/payments/" + orderId, payload);
        if (bookingId != null) {
            messagingTemplate.convertAndSend("/topic/bookings/" + bookingId, payload);
        }
    }
}
