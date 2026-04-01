package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.repository.BookingRepository;
import dev.tin.tour_back.repository.BookingStatusRepository;
import dev.tin.tour_back.dto.BookingAdminDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/bookings")
@RequiredArgsConstructor
public class AdminBookingController {
    private final BookingRepository bookingRepository;
    private final BookingStatusRepository bookingStatusRepository;

    @GetMapping
    public ResponseEntity<List<BookingAdminDTO>> getAllBookings() {
        List<BookingEntity> bookings = bookingRepository.findAll();
        List<BookingAdminDTO> dtos = bookings.stream().map(b -> {
            BookingAdminDTO dto = new BookingAdminDTO();
            dto.setId(b.getId());
            
            // Map user info
            if (b.getUser() != null) {
                dto.setUserId(b.getUser().getId());
                dto.setUserFullName(b.getUser().getFullName());
                dto.setUserEmail(b.getUser().getEmail());
            }
            
            // Map tour info
            if (b.getTour() != null) {
                dto.setTourId(b.getTour().getId());
                dto.setTourName(b.getTour().getName());
            }
            
            // Map invoice info
            if (b.getInvoice() != null) {
                dto.setInvoiceId(b.getInvoice().getId());
                dto.setTotalAmount(b.getInvoice().getTotalAmount());
            }
            
            // Map dates
            dto.setBookingTime(b.getBookingTime());
            dto.setCheckInDate(b.getCheckInDate());
            dto.setCheckOutDate(b.getCheckOutDate());
            
            // Map status
            if (b.getStatus() != null) {
                dto.setStatus(b.getStatus().getName());
                dto.setStatusDescription(b.getStatus().getDescription());
            }
            
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{bookingId}/approve")
    public ResponseEntity<?> approveBooking(@PathVariable Long bookingId) {
        var bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var booking = bookingOpt.get();
        var confirmedStatus = bookingStatusRepository.findByName("CONFIRMED")
            .orElseThrow(() -> new RuntimeException("Status CONFIRMED not found"));
        booking.setStatus(confirmedStatus);
        bookingRepository.save(booking);
        return ResponseEntity.ok("Booking approved");
    }

    @PostMapping("/{bookingId}/reject")
    public ResponseEntity<?> rejectBooking(@PathVariable Long bookingId, @RequestBody(required = false) java.util.Map<String, String> body) {
        var bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var booking = bookingOpt.get();
        var rejectedStatus = bookingStatusRepository.findByName("REJECTED")
            .orElseThrow(() -> new RuntimeException("Status REJECTED not found"));
        booking.setStatus(rejectedStatus);
        // Nếu muốn lưu lý do từ chối:
        if (body != null && body.containsKey("reason")) {
            // booking.setNotes(body.get("reason"));
        }
        bookingRepository.save(booking);
        return ResponseEntity.ok("Booking rejected");
    }

    @DeleteMapping("/{bookingId}")
    public ResponseEntity<?> deleteBooking(@PathVariable Long bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            return ResponseEntity.notFound().build();
        }
        bookingRepository.deleteById(bookingId);
        return ResponseEntity.ok("Booking deleted");
    }
}
