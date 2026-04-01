// d:\DACS\tour_back\src\main\java\dev\tin\tour_back\service\EmailService.java
package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.BookingEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final String FROM_EMAIL = "caodangquyen.pt04@gmail.com";
    
    // Track sent payment confirmation emails to prevent duplication
    private final Map<Long, LocalDateTime> sentPaymentEmails = new ConcurrentHashMap<>();
    // Email cooldown period in minutes
    private static final int EMAIL_COOLDOWN_MINUTES = 30;

    public void sendPaymentSuccessEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(FROM_EMAIL);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    /**
     * Gửi email chứa đường dẫn đặt lại mật khẩu.
     */
    public void sendPasswordResetEmail(String to, String fullName, String resetLink, String token) {
        if (to == null || to.isBlank()) {
            logger.warn("Cannot send password reset email because destination email is missing");
            return;
        }

        String recipientName = (fullName != null && !fullName.isBlank()) ? fullName : "bạn";

        StringBuilder messageBuilder = new StringBuilder();
        messageBuilder.append("Xin chào ").append(recipientName).append(",\n\n");
        messageBuilder.append("Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản Tour Gold của bạn.\n");
        messageBuilder.append("Vui lòng nhấp vào liên kết bên dưới để đặt lại mật khẩu:\n\n");
        messageBuilder.append(resetLink).append("\n\n");
        messageBuilder.append("Liên kết này sẽ hết hạn sau 1 giờ.\n");
        messageBuilder.append("Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n");
        messageBuilder.append("Trân trọng,\nĐội ngũ Tour Gold\n");

        // Optional: thêm token thuần nếu người dùng muốn nhập thủ công
        messageBuilder.append("\nNếu liên kết không hoạt động, bạn có thể sao chép và nhập mã sau: ").append(token);

        sendPaymentSuccessEmail(to, "Đặt lại mật khẩu Tour Gold", messageBuilder.toString());
    }
    
    /**
     * Send booking confirmation email to user
     * @param booking The booking entity with all details
     */
    public void sendBookingConfirmationEmail(BookingEntity booking) {
        if (booking == null || booking.getUser() == null || booking.getUser().getEmail() == null) {
            logger.error("Cannot send booking confirmation: invalid booking or missing user email");
            return;
        }
        
        String to = booking.getUser().getEmail();
        String subject = "Xác nhận đặt tour - Tour Gold";
        
        StringBuilder messageBuilder = new StringBuilder();
        messageBuilder.append("Kính gửi ").append(booking.getUser().getFullName()).append(",\n\n");
        messageBuilder.append("Cảm ơn bạn đã đặt tour với Tour Gold!\n\n");
        messageBuilder.append("Đơn đặt tour của bạn đã được xác nhận với các thông tin sau:\n\n");
        messageBuilder.append("Mã đặt tour: ").append(booking.getId()).append("\n");
        messageBuilder.append("Tour: ").append(booking.getTour() != null ? booking.getTour().getName() : "N/A").append("\n");
        messageBuilder.append("Ngày check-in: ").append(booking.getCheckInDate()).append("\n");
        
        if (booking.getInvoice() != null) {
            messageBuilder.append("Tổng tiền: ").append(String.format("%,.0f", booking.getInvoice().getTotalAmount())).append(" VND\n");
        }
        
        messageBuilder.append("\nVui lòng giữ email này để tham khảo. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với dịch vụ khách hàng của chúng tôi.\n\n");
        messageBuilder.append("Trân trọng,\nĐội ngũ Tour Gold");
        
        try {
            sendPaymentSuccessEmail(to, subject, messageBuilder.toString());
            logger.info("Booking confirmation email sent to: {}", to);
        } catch (Exception e) {
            logger.error("Failed to send booking confirmation email: {}", e.getMessage());
        }
    }
    
    /**
     * Send payment confirmation email to user
     * @param booking The booking entity with payment details
     * @return boolean indicating if email was sent (true) or skipped due to duplicate (false)
     */
    public boolean sendPaymentConfirmationEmail(BookingEntity booking) {
        if (booking == null || booking.getUser() == null || booking.getUser().getEmail() == null) {
            logger.error("Cannot send payment confirmation: invalid booking or missing user email");
            return false;
        }
        
        // Check if we already sent an email for this booking recently
        Long bookingId = booking.getId();
        LocalDateTime lastSent = sentPaymentEmails.get(bookingId);
        LocalDateTime now = LocalDateTime.now();
        
        // If email was sent in the last X minutes, skip sending
        if (lastSent != null && lastSent.plusMinutes(EMAIL_COOLDOWN_MINUTES).isAfter(now)) {
            logger.info("Skipping duplicate payment confirmation email for booking ID {}, last sent at {}",
                    bookingId, lastSent);
            return false;
        }
        
        String to = booking.getUser().getEmail();
        String subject = "Xác nhận thanh toán - Tour Gold";
        
        StringBuilder messageBuilder = new StringBuilder();
        messageBuilder.append("Kính gửi ").append(booking.getUser().getFullName()).append(",\n\n");
        messageBuilder.append("Chúng tôi xin thông báo rằng thanh toán cho đơn đặt tour của bạn đã được xử lý thành công.\n\n");
        messageBuilder.append("Chi tiết thanh toán:\n");
        messageBuilder.append("Mã đặt tour: ").append(booking.getId()).append("\n");
        messageBuilder.append("Tour: ").append(booking.getTour() != null ? booking.getTour().getName() : "N/A").append("\n");
        
        if (booking.getInvoice() != null) {
            messageBuilder.append("Số tiền đã thanh toán: ").append(String.format("%,.0f", booking.getInvoice().getTotalAmount())).append(" VND\n");
        }
        
        messageBuilder.append("Ngày thanh toán: ").append(now.toString()).append("\n\n");
        messageBuilder.append("Đơn đặt tour của bạn đã được xác nhận. Bạn có thể xem chi tiết đặt tour bất kỳ lúc nào bằng cách đăng nhập vào tài khoản của mình.\n\n");
        messageBuilder.append("Cảm ơn bạn đã chọn Tour Gold!\n\n");
        messageBuilder.append("Trân trọng,\nĐội ngũ Tour Gold");
        
        try {
            sendPaymentSuccessEmail(to, subject, messageBuilder.toString());
            // Record this email as sent
            sentPaymentEmails.put(bookingId, now);
            logger.info("Payment confirmation email sent to: {}", to);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send payment confirmation email: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if payment confirmation email was recently sent for a booking
     * @param bookingId The booking ID
     * @return true if email was sent recently (within cooldown period)
     */
    public boolean wasPaymentEmailRecentlySent(Long bookingId) {
        LocalDateTime lastSent = sentPaymentEmails.get(bookingId);
        return lastSent != null && lastSent.plusMinutes(EMAIL_COOLDOWN_MINUTES).isAfter(LocalDateTime.now());
    }
}