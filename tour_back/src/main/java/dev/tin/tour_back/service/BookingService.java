package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.entity.BookingStatusEntity;
import dev.tin.tour_back.entity.InvoiceEntity;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.repository.BookingRepository;
import dev.tin.tour_back.repository.BookingStatusRepository;
import dev.tin.tour_back.repository.InvoiceRepository;
import dev.tin.tour_back.repository.TourRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingService {
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final EmailService emailService;
    private final BookingStatusRepository bookingStatusRepository;

    public List<BookingEntity> getAllBookings() {
        return bookingRepository.findAll();
    }

    public BookingEntity getBookingById(Long id) {
        return bookingRepository.findById(id).orElse(null);
    }

    @Transactional
    public BookingEntity addBooking(BookingEntity booking) {
        try {
            if (booking == null) {
                throw new IllegalArgumentException("Booking cannot be null");
            }
            
            System.out.println("Saving booking for tour: " + 
                (booking.getTour() != null ? booking.getTour().getId() : "null") + 
                ", user: " + (booking.getUser() != null ? booking.getUser().getId() : "null"));
            
            // Validate essential booking data
            if (booking.getTour() == null) {
                throw new IllegalArgumentException("Tour information is missing from booking");
            }
            
            if (booking.getUser() == null) {
                throw new IllegalArgumentException("User information is missing from booking");
            }
            
            // Set booking time if not already set
            if (booking.getBookingTime() == null) {
                booking.setBookingTime(LocalDateTime.now());
                System.out.println("Setting booking time to now: " + booking.getBookingTime());
            }
            
            // Handle invoice if present
            if (booking.getInvoice() != null) {
                System.out.println("Processing invoice for booking");
                
                // Set billing date if not already set
                if (booking.getInvoice().getBillingDate() == null) {
                    booking.getInvoice().setBillingDate(LocalDateTime.now());
                    System.out.println("Setting invoice billing date to now: " + booking.getInvoice().getBillingDate());
                }
                
                try {
                    System.out.println("Saving invoice data: " + booking.getInvoice());
                    InvoiceEntity savedInvoice = invoiceRepository.save(booking.getInvoice());
                    booking.setInvoice(savedInvoice);
                    System.out.println("Invoice saved with ID: " + savedInvoice.getId());
                } catch (Exception e) {
                    System.err.println("Error saving invoice: " + e.getMessage());
                    e.printStackTrace();
                    throw new RuntimeException("Failed to save invoice: " + e.getMessage(), e);
                }
            } else {
                System.out.println("No invoice data attached to booking");
            }
            
            // Save the booking entity
            try {
                System.out.println("Saving booking entity to database");
                BookingEntity savedBooking = bookingRepository.save(booking);
                System.out.println("Booking saved successfully with ID: " + savedBooking.getId());
                
                return savedBooking;
            } catch (Exception e) {
                System.err.println("Error saving booking to database: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to save booking: " + e.getMessage(), e);
            }
        } catch (Exception e) {
            System.err.println("Error in addBooking service method: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    public void deleteBooking(Long id) {
        bookingRepository.deleteById(id);
    }

    /**
     * Update booking status to PAID when payment is confirmed
     * @param bookingId The ID of the booking to update
     * @return The updated booking entity or null if booking not found
     */
    @Transactional
    public BookingEntity updateBookingStatusToPaid(Long bookingId) {
        try {
            System.out.println("Updating booking status to PAID for booking ID: " + bookingId);
            
            BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
            if (booking == null) {
                System.err.println("Booking not found with ID: " + bookingId);
                return null;
            }
            
            // Get PAID status (id=5) from repository
            BookingStatusEntity paidStatus = bookingStatusRepository.findById(5L).orElse(null);
            
            if (paidStatus == null) {
                // If PAID status doesn't exist with ID 5, try to find by name
                paidStatus = bookingStatusRepository.findByName("PAID").orElse(null);
                
                if (paidStatus == null) {
                    // Create new PAID status if it doesn't exist
                    System.out.println("Creating new PAID status as it doesn't exist");
                    paidStatus = new BookingStatusEntity();
                    paidStatus.setId(5L); // Set ID to 5
                    paidStatus.setName("PAID");
                    paidStatus.setDescription("Payment has been received");
                    paidStatus = bookingStatusRepository.save(paidStatus);
                }
            }
            
            booking.setStatus(paidStatus);
            System.out.println("Updated booking status to PAID for booking ID: " + bookingId);
            
            return bookingRepository.save(booking);
        } catch (Exception e) {
            System.err.println("Error updating booking status to PAID: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}