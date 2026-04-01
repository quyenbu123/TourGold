package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.BookingStatusEntity;
import dev.tin.tour_back.service.BookingStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/booking-status")
@RequiredArgsConstructor
public class BookingStatusController {

    private final BookingStatusService bookingStatusService;

    @GetMapping
    public ResponseEntity<List<BookingStatusEntity>> getAllBookingStatuses() {
        return ResponseEntity.ok(bookingStatusService.getAllBookingStatuses());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingStatusEntity> getBookingStatusById(@PathVariable Long id) {
        BookingStatusEntity status = bookingStatusService.getBookingStatusById(id);
        return status != null ? ResponseEntity.ok(status) : ResponseEntity.notFound().build();
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<BookingStatusEntity> getBookingStatusByName(@PathVariable String name) {
        BookingStatusEntity status = bookingStatusService.getBookingStatusByName(name);
        return status != null ? ResponseEntity.ok(status) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<BookingStatusEntity> createBookingStatus(@RequestBody BookingStatusEntity bookingStatus) {
        return new ResponseEntity<>(bookingStatusService.saveBookingStatus(bookingStatus), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookingStatusEntity> updateBookingStatus(
            @PathVariable Long id,
            @RequestBody BookingStatusEntity bookingStatus) {
        bookingStatus.setId(id);
        return ResponseEntity.ok(bookingStatusService.saveBookingStatus(bookingStatus));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBookingStatus(@PathVariable Long id) {
        bookingStatusService.deleteBookingStatus(id);
        return ResponseEntity.noContent().build();
    }
}