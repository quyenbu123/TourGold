package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.*;
import dev.tin.tour_back.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final BookingStatusRepository bookingStatusRepository;
    private final InvoiceDetailRepository invoiceDetailRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    public PaymentEntity addPayment(Long userId, PaymentEntity payment) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        payment.setUser(user);
        return paymentRepository.save(payment);
    }

    public List<PaymentEntity> getPaymentsByUserId(Long userId) {
        return paymentRepository.findAll().stream()
                .filter(payment -> payment.getUser().getId().equals(userId))
                .toList();
    }

    public PaymentEntity createPaymentFromCallback(Long userId, String method, Double amount, String status) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        PaymentEntity payment = new PaymentEntity();
        payment.setUser(user);
        payment.setDate(LocalDateTime.now());
        payment.setMethod(method);
        payment.setAmount(amount);
        payment.setStatus(status);
        payment.setIsRefunded(false);
        
        return paymentRepository.save(payment);
    }

    public void processSuccessfulPayment(Long bookingId, Long paymentId) {
        // Lấy booking
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        // Cập nhật trạng thái booking
        BookingStatusEntity paidStatus;
        try {
            paidStatus = bookingStatusRepository.findByName("PAID")
                    .orElseGet(() -> {
                        // Tạo trạng thái PAID nếu không tồn tại
                        System.out.println("Creating new PAID status as it doesn't exist");
                        BookingStatusEntity newStatus = new BookingStatusEntity();
                        newStatus.setName("PAID");
                        newStatus.setDescription("Payment has been received");
                        return bookingStatusRepository.save(newStatus);
                    });
        } catch (Exception e) {
            System.err.println("Error handling PAID status: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error handling payment status: " + e.getMessage());
        }
        
        // Only update the status if it's not already in a final state like CONFIRMED or COMPLETED
        String currentStatus = booking.getStatus() != null ? booking.getStatus().getName() : null;
        if (!"CONFIRMED".equals(currentStatus) && !"COMPLETED".equals(currentStatus)) {
            booking.setStatus(paidStatus);
            bookingRepository.save(booking);
            System.out.println("Updated booking " + bookingId + " status to PAID");
        } else {
            System.out.println("Booking " + bookingId + " already in " + currentStatus + " state, not changing to PAID");
        }
        
        // Liên kết payment với invoice
        InvoiceEntity invoice = booking.getInvoice();
        if (invoice != null) {
            PaymentEntity payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found"));
            
            // Tạo invoice detail
            InvoiceDetailEntity invoiceDetail = new InvoiceDetailEntity();
            invoiceDetail.setInvoice(invoice);
            invoiceDetail.setPayment(payment);
            invoiceDetail.setPaidAmount(payment.getAmount());
            invoiceDetail.setPaymentDate(LocalDateTime.now());
            invoiceDetail.setStatus("COMPLETED");
            
            invoiceDetailRepository.save(invoiceDetail);
            
            // Gửi thông báo tới admin để phê duyệt
            createAdminApprovalRequest(booking, payment, invoice);
            
            // Gửi email xác nhận thanh toán đến người dùng
            try {
                // Always try to send the email when payment is successfully processed
                boolean sent = emailService.sendPaymentConfirmationEmail(booking);
                if (sent) {
                    System.out.println("[EMAIL SENT] Payment confirmation email sent to user for booking ID: " + bookingId);
                } else {
                    System.out.println("Payment confirmation email skipped for booking ID: " + bookingId);
                }
            } catch (Exception e) {
                System.err.println("Failed to send payment confirmation email: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }
    
    /**
     * Tạo yêu cầu phê duyệt thanh toán cho admin
     */
    private void createAdminApprovalRequest(BookingEntity booking, PaymentEntity payment, InvoiceEntity invoice) {
        try {
            // Lấy thông tin liên quan
            UserEntity customer = booking.getUser();
            TourEntity tour = booking.getTour();
            
            // Tạo thông báo cho admin
            String subject = "Yêu cầu phê duyệt thanh toán mới";
            String content = String.format(
                "Có thanh toán mới cần phê duyệt:\n" +
                "- Booking ID: %d\n" +
                "- Tour: %s\n" +
                "- Khách hàng: %s (ID: %d)\n" +
                "- Số tiền: %.2f\n" +
                "- Phương thức: %s\n" +
                "- Thời gian thanh toán: %s\n\n" +
                "Vui lòng kiểm tra và xác nhận trong phần quản lý.",
                booking.getId(),
                tour.getName(),
                customer.getFullName(),
                customer.getId(),
                payment.getAmount(),
                payment.getMethod(),
                payment.getDate()
            );
            
            // Gửi thông báo tới tất cả admin
            notificationService.createAdminNotification(subject, content, "PAYMENT_APPROVAL", booking.getId());
            
            System.out.println("Đã gửi thông báo phê duyệt thanh toán tới admin cho booking: " + booking.getId());
        } catch (Exception e) {
            System.err.println("Lỗi khi tạo thông báo phê duyệt cho admin: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Phê duyệt thanh toán bởi admin
     */
    public BookingEntity approvePayment(Long bookingId, String adminNote) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        // Cập nhật trạng thái booking sang CONFIRMED
        BookingStatusEntity confirmedStatus;
        try {
            confirmedStatus = bookingStatusRepository.findByName("CONFIRMED")
                    .orElseGet(() -> {
                        // Tạo trạng thái CONFIRMED nếu không tồn tại
                        System.out.println("Creating new CONFIRMED status as it doesn't exist");
                        BookingStatusEntity newStatus = new BookingStatusEntity();
                        newStatus.setName("CONFIRMED");
                        newStatus.setDescription("Booking has been confirmed");
                        return bookingStatusRepository.save(newStatus);
                    });
        } catch (Exception e) {
            System.err.println("Error handling CONFIRMED status: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error handling confirmation status: " + e.getMessage());
        }
        
        booking.setStatus(confirmedStatus);
        
        // Cập nhật ghi chú nếu có
        if (booking.getInvoice() != null && adminNote != null && !adminNote.isEmpty()) {
            InvoiceEntity invoice = booking.getInvoice();
            invoice.setNote(adminNote);
            // Invoice sẽ được lưu khi booking được lưu do cascade
        }
        
        // Lưu booking
        BookingEntity updatedBooking = bookingRepository.save(booking);
        
        // Thông báo cho khách hàng
        notifyCustomerAboutApproval(updatedBooking);
        
        // Gửi email xác nhận thanh toán đến người dùng (giữ lại phần này)
        try {
            // Only send if not recently sent
            if (!emailService.wasPaymentEmailRecentlySent(bookingId)) {
                boolean sent = emailService.sendPaymentConfirmationEmail(updatedBooking);
                if (sent) {
                    System.out.println("Payment approval confirmation email sent to user for booking ID: " + bookingId);
                }
            } else {
                System.out.println("Skipping duplicate payment approval confirmation email for booking ID: " + bookingId);
            }
        } catch (Exception e) {
            // Log lỗi nhưng không làm ảnh hưởng đến việc cập nhật booking
            System.err.println("Failed to send payment confirmation email: " + e.getMessage());
        }
        
        return updatedBooking;
    }
    
    /**
     * Gửi thông báo xác nhận thanh toán tới khách hàng
     */
    private void notifyCustomerAboutApproval(BookingEntity booking) {
        try {
            UserEntity customer = booking.getUser();
            TourEntity tour = booking.getTour();
            
            String subject = "Xác nhận thanh toán thành công";
            String content = String.format(
                "Kính gửi %s,\n\n" +
                "Thanh toán của bạn cho đặt tour \"%s\" đã được xác nhận thành công.\n" +
                "Mã đặt tour: %d\n" +
                "Ngày check-in: %s\n\n" +
                "Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!\n" +
                "Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hỗ trợ.",
                customer.getFullName(),
                tour.getName(),
                booking.getId(),
                booking.getCheckInDate()
            );
            
            notificationService.createUserNotification(customer.getId(), subject, content, "PAYMENT_CONFIRMED", booking.getId());
            
            System.out.println("Đã gửi thông báo xác nhận thanh toán tới khách hàng: " + customer.getId());
        } catch (Exception e) {
            System.err.println("Lỗi khi gửi thông báo tới khách hàng: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Từ chối thanh toán
     */
    public BookingEntity rejectPayment(Long bookingId, String reason) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        
        // Cập nhật trạng thái booking sang PAYMENT_REJECTED
        Optional<BookingStatusEntity> rejectedStatus = bookingStatusRepository.findByName("PAYMENT_REJECTED");
        if (rejectedStatus.isEmpty()) {
            // Nếu chưa có trạng thái này, tạo mới
            BookingStatusEntity newStatus = new BookingStatusEntity();
            newStatus.setName("PAYMENT_REJECTED");
            newStatus.setDescription("Thanh toán đã bị từ chối");
            newStatus.setCreatedAt(LocalDateTime.now());
            rejectedStatus = Optional.of(bookingStatusRepository.save(newStatus));
        }
        
        booking.setStatus(rejectedStatus.get());
        
        // Cập nhật ghi chú từ chối
        if (booking.getInvoice() != null) {
            InvoiceEntity invoice = booking.getInvoice();
            invoice.setNote("Thanh toán bị từ chối: " + reason);
            // Invoice sẽ được lưu khi booking được lưu do cascade
        }
        
        // Lưu booking
        BookingEntity updatedBooking = bookingRepository.save(booking);
        
        // Thông báo cho khách hàng
        notifyCustomerAboutRejection(updatedBooking, reason);
        
        return updatedBooking;
    }
    
    /**
     * Gửi thông báo từ chối thanh toán tới khách hàng
     */
    private void notifyCustomerAboutRejection(BookingEntity booking, String reason) {
        try {
            UserEntity customer = booking.getUser();
            TourEntity tour = booking.getTour();
            
            String subject = "Thông báo về vấn đề thanh toán";
            String content = String.format(
                "Kính gửi %s,\n\n" +
                "Rất tiếc, chúng tôi không thể xác nhận thanh toán của bạn cho đặt tour \"%s\".\n" +
                "Mã đặt tour: %d\n" +
                "Lý do: %s\n\n" +
                "Vui lòng liên hệ với bộ phận hỗ trợ khách hàng để được giải quyết.\n" +
                "Xin lỗi vì sự bất tiện này.",
                customer.getFullName(),
                tour.getName(),
                booking.getId(),
                reason
            );
            
            notificationService.createUserNotification(customer.getId(), subject, content, "PAYMENT_REJECTED", booking.getId());
            
            System.out.println("Đã gửi thông báo từ chối thanh toán tới khách hàng: " + customer.getId());
        } catch (Exception e) {
            System.err.println("Lỗi khi gửi thông báo tới khách hàng: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Check if a booking is paid but not yet updated to PAID status
     * @param bookingId The booking ID to check
     * @return true if payment was found and status was updated
     */
    public boolean checkAndUpdateBookingPaymentStatus(Long bookingId) {
        try {
            BookingEntity booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
            
            // Skip if already in PAID, CONFIRMED or COMPLETED state
            String currentStatus = booking.getStatus() != null ? booking.getStatus().getName() : null;
            if ("PAID".equals(currentStatus) || "CONFIRMED".equals(currentStatus) || "COMPLETED".equals(currentStatus)) {
                System.out.println("Booking " + bookingId + " already in " + currentStatus + " state, no update needed");
                return false;
            }
            
            // Check for payment evidence in invoice details
            if (booking.getInvoice() != null && booking.getInvoice().getInvoiceDetails() != null && 
                    !booking.getInvoice().getInvoiceDetails().isEmpty()) {
                
                // Found payment record, update to PAID status
                BookingStatusEntity paidStatus = bookingStatusRepository.findByName("PAID")
                        .orElseGet(() -> {
                            // Create PAID status if it doesn't exist
                            BookingStatusEntity newStatus = new BookingStatusEntity();
                            newStatus.setName("PAID");
                            newStatus.setDescription("Payment has been received");
                            return bookingStatusRepository.save(newStatus);
                        });
                
                booking.setStatus(paidStatus);
                bookingRepository.save(booking);
                System.out.println("Updated booking " + bookingId + " status to PAID based on invoice details");
                return true;
            }
            
            // No payment found
            return false;
        } catch (Exception e) {
            System.err.println("Error checking and updating booking payment status: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
}