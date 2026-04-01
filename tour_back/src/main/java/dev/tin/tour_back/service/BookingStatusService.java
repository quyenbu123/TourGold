package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.BookingStatusEntity;
import dev.tin.tour_back.repository.BookingStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingStatusService {
    private final BookingStatusRepository bookingStatusRepository;

    public List<BookingStatusEntity> getAllBookingStatuses() {
        return bookingStatusRepository.findAll();
    }

    public BookingStatusEntity getBookingStatusById(Long id) {
        return bookingStatusRepository.findById(id).orElse(null);
    }

    public BookingStatusEntity getBookingStatusByName(String name) {
        return bookingStatusRepository.findByName(name).orElse(null);
    }

    public BookingStatusEntity saveBookingStatus(BookingStatusEntity bookingStatus) {
        return bookingStatusRepository.save(bookingStatus);
    }

    public void deleteBookingStatus(Long id) {
        bookingStatusRepository.deleteById(id);
    }
}