package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.BookingEntity;
import dev.tin.tour_back.entity.BookingStatusEntity;
import dev.tin.tour_back.entity.InvoiceEntity;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.BookingStatusRepository;
import dev.tin.tour_back.repository.TourRepository;
import dev.tin.tour_back.repository.UserRepository;
import dev.tin.tour_back.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class BookingController {
    private final BookingService bookingService;
    private final TourRepository tourRepository;
    private final UserRepository userRepository;
    private final BookingStatusRepository bookingStatusRepository;

    @GetMapping
    public ResponseEntity<List<BookingEntity>> getAllBookings() {
        return new ResponseEntity<>(bookingService.getAllBookings(), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        try {
            BookingEntity booking = bookingService.getBookingById(id);
            if (booking == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving booking: " + e.getMessage());
        }
    }

    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE,
                 produces = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> addBooking(@RequestBody Map<String, Object> bookingRequest) {
        try {
            // Log the received request for debugging
            System.out.println("Received booking request: " + bookingRequest);
            
            // Extract data from the request with more robust error handling
            Long tourId;
            Long userId;
            
            // Validate tourId - first check existence, then try to parse
            if (!bookingRequest.containsKey("tourId")) {
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Missing required field: tourId"
                ));
            }
            
            try {
                // Handle different formats (Long, Integer, String)
                Object tourIdObj = bookingRequest.get("tourId");
                if (tourIdObj instanceof Number) {
                    tourId = ((Number) tourIdObj).longValue();
                } else if (tourIdObj instanceof String) {
                    tourId = Long.valueOf((String) tourIdObj);
                } else {
                    return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Invalid tourId format: " + tourIdObj
                    ));
                }
                
                if (tourId <= 0) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Invalid tourId: must be a positive number"
                    ));
                }
            } catch (Exception e) {
                System.err.println("Error parsing tourId: " + e.getMessage());
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Invalid tourId: " + e.getMessage()
                ));
            }
            
            // Validate userId - first check existence, then try to parse
            if (!bookingRequest.containsKey("userId")) {
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Missing required field: userId"
                ));
            }
            
            try {
                // Handle different formats (Long, Integer, String)
                Object userIdObj = bookingRequest.get("userId");
                if (userIdObj instanceof Number) {
                    userId = ((Number) userIdObj).longValue();
                } else if (userIdObj instanceof String) {
                    userId = Long.valueOf((String) userIdObj);
                } else {
                    return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Invalid userId format: " + userIdObj
                    ));
                }
                
                if (userId <= 0) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Invalid userId: must be a positive number"
                    ));
                }
            } catch (Exception e) {
                System.err.println("Error parsing userId: " + e.getMessage());
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Invalid userId: " + e.getMessage()
                ));
            }
            
            // Extract date with validation
            String date = bookingRequest.containsKey("date") ? bookingRequest.get("date").toString() : null;
            if (date != null && date.isEmpty()) {
                date = null;
            }

            // Extract quantity (default 1)
            int quantity = 1;
            if (bookingRequest.containsKey("quantity")) {
                try {
                    Object qObj = bookingRequest.get("quantity");
                    if (qObj instanceof Number) {
                        quantity = ((Number) qObj).intValue();
                    } else if (qObj instanceof String) {
                        quantity = Integer.parseInt((String) qObj);
                    } else {
                        return ResponseEntity.badRequest().body(Map.of(
                            "status", "error",
                            "message", "Invalid quantity format: " + qObj
                        ));
                    }
                    if (quantity <= 0) {
                        return ResponseEntity.badRequest().body(Map.of(
                            "status", "error",
                            "message", "quantity must be a positive integer"
                        ));
                    }
                } catch (Exception e) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Invalid quantity: " + e.getMessage()
                    ));
                }
            }

            System.out.println("Parsed IDs - tourId: " + tourId + ", userId: " + userId + ", date: " + date + ", quantity: " + quantity);

            // Find tour and user with better error messages
            TourEntity tour;
            try {
                tour = tourRepository.findById(tourId)
                        .orElseThrow(() -> new NoSuchElementException("Tour not found with ID: " + tourId));
            } catch (Exception e) {
                System.err.println("Error finding tour: " + e.getMessage());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error",
                    "message", "Tour not found: " + e.getMessage()
                ));
            }

            UserEntity user;
            try {
                user = userRepository.findById(userId)
                        .orElseThrow(() -> new NoSuchElementException("User not found with ID: " + userId));
            } catch (Exception e) {
                System.err.println("Error finding user: " + e.getMessage());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error",
                    "message", "User not found: " + e.getMessage()
                ));
            }

            // Validate and decrease availability
            Integer available = tour.getMaxQuantity();
            if (available == null) available = 0;
            if (available < quantity) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "error",
                    "message", "Not enough available spots for this tour. Available: " + available + ", Requested: " + quantity
                ));
            }

            // Create new booking
            BookingEntity booking = new BookingEntity();
            booking.setTour(tour);
            booking.setUser(user);
            booking.setQuantity(quantity); // Save the quantity
            booking.setBookingTime(LocalDateTime.now());

            // Set dates if provided
            if (date != null) {
                try {
                    // Handle different date formats
                    LocalDateTime bookingDate;
                    if (date.contains("T")) {
                        // ISO format
                        bookingDate = LocalDateTime.parse(date.replace("Z", ""));
                    } else {
                        // Simple date format
                        bookingDate = LocalDateTime.parse(date + "T00:00:00");
                    }
                    booking.setCheckInDate(bookingDate);
                } catch (Exception e) {
                    System.out.println("Failed to parse date: " + date + ". Using now instead: " + e.getMessage());
                    booking.setCheckInDate(LocalDateTime.now());
                }
            } else {
                booking.setCheckInDate(LocalDateTime.now());
            }

            // --- TẠO INVOICE NGHIỆP VỤ ---
            InvoiceEntity invoice = new InvoiceEntity();
            // Tính tổng tiền đơn giản: lấy giá tour (nếu có), hoặc 0
            Double unitPrice = 0.0;
            if (tour.getTourPrices() != null && !tour.getTourPrices().isEmpty()) {
                // Lấy giá đầu tiên (hoặc bạn có thể lấy theo loại khách...)
                unitPrice = tour.getTourPrices().get(0).getPrice() != null ? tour.getTourPrices().get(0).getPrice().doubleValue() : 0.0;
            }
            Double totalAmount = unitPrice * quantity;
            invoice.setTotalAmount(totalAmount);
            invoice.setDescription("Invoice for booking tour: " + tour.getName() + " x" + quantity);
            invoice.setBillingDate(LocalDateTime.now());
            invoice.setCreatedAt(LocalDateTime.now());
            booking.setInvoice(invoice);
            // --- END INVOICE ---
            
            // Set default pending status
            BookingStatusEntity pendingStatus;
            try {
                pendingStatus = bookingStatusRepository.findByName("PENDING")
                        .orElseGet(() -> {
                            // Create PENDING status if it doesn't exist
                            System.out.println("Creating new PENDING status as it doesn't exist");
                            BookingStatusEntity newStatus = new BookingStatusEntity();
                            newStatus.setName("PENDING");
                            newStatus.setDescription("Booking is pending payment");
                            return bookingStatusRepository.save(newStatus);
                        });
            } catch (Exception e) {
                System.err.println("Error handling booking status: " + e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Error handling booking status: " + e.getMessage()
                ));
            }
                    
            booking.setStatus(pendingStatus);
            
            // Save booking with detailed error handling
            BookingEntity savedBooking;
            try {
                System.out.println("Attempting to save booking: " + booking);
                savedBooking = bookingService.addBooking(booking);
                System.out.println("Successfully saved booking with ID: " + savedBooking.getId());
            } catch (Exception e) {
                System.err.println("Error saving booking: " + e.getMessage());
                e.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Error saving booking: " + e.getMessage()
                ));
            }
            
            // Prepare success response
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedBooking.getId());
            response.put("status", "success");
            response.put("message", "Booking created successfully");
            
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (Exception e) {
            System.err.println("Unexpected error in addBooking: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Failed to create booking: " + e.getMessage());
            errorResponse.put("stackTrace", e.getStackTrace());
            
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateBookingStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusRequest) {
        try {
            String statusName = statusRequest.get("status");
            if (statusName == null) {
                return ResponseEntity.badRequest().body("Status is required");
            }
            
            BookingStatusEntity status = bookingStatusRepository.findByName(statusName)
                    .orElseGet(() -> {
                        // Create the status if it doesn't exist
                        BookingStatusEntity newStatus = new BookingStatusEntity();
                        newStatus.setName(statusName);
                        newStatus.setDescription("Status: " + statusName);
                        return bookingStatusRepository.save(newStatus);
                    });
            
            BookingEntity booking = bookingService.getBookingById(id);
            if (booking == null) {
                return ResponseEntity.notFound().build();
            }

            BookingStatusEntity oldStatus = booking.getStatus();
            String oldStatusName = (oldStatus != null) ? oldStatus.getName() : "";
            String newStatusName = status.getName();

            boolean isConfirmedOrCompleted = newStatusName.equals("CONFIRMED") || newStatusName.equals("COMPLETED");
            boolean wasConfirmedOrCompleted = oldStatusName.equals("CONFIRMED") || oldStatusName.equals("COMPLETED");

            // Logic to decrease max_quantity
            if (isConfirmedOrCompleted && !wasConfirmedOrCompleted) {
                TourEntity tour = booking.getTour();
                int quantity = (booking.getQuantity() != null) ? booking.getQuantity() : 0;
                if (tour.getMaxQuantity() < quantity) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body("Not enough available spots.");
                }
                tour.setMaxQuantity(tour.getMaxQuantity() - quantity);
                tourRepository.save(tour);
            }
            // Logic to increase max_quantity if a confirmed booking is cancelled
            else if (wasConfirmedOrCompleted && (newStatusName.equals("CANCELLED") || newStatusName.equals("REJECTED"))) {
                TourEntity tour = booking.getTour();
                int quantity = (booking.getQuantity() != null) ? booking.getQuantity() : 0;
                tour.setMaxQuantity(tour.getMaxQuantity() + quantity);
                tourRepository.save(tour);
            }

            booking.setStatus(status);
            BookingEntity updatedBooking = bookingService.addBooking(booking);

            return ResponseEntity.ok(updatedBooking);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating booking status: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        bookingService.deleteBooking(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}