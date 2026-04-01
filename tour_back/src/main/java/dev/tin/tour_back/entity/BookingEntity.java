package dev.tin.tour_back.entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "booking")
public class BookingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"bookings", "password", "roles"})
    private UserEntity user;

    @ManyToOne
    @JoinColumn(name = "tour_id", nullable = false)
    @JsonIgnoreProperties({"bookings"})
    private TourEntity tour;
    private Integer quantity;


    private LocalDateTime checkInDate;
    private LocalDateTime checkOutDate;
    private LocalDateTime bookingTime;

    @ManyToOne
    @JoinColumn(name = "status_id", nullable = false)
    @JsonIgnoreProperties({"bookings"})
    private BookingStatusEntity status;

    @OneToOne
    @JoinColumn(name = "invoice_id")
    @JsonIgnoreProperties({"booking"})
    private InvoiceEntity invoice;

    @Override
    public String toString() {
        return "BookingEntity{" +
                "id=" + id +
                ", userId=" + (user != null ? user.getId() : null) +
                ", tourId=" + (tour != null ? tour.getId() : null) +
                ", statusName=" + (status != null ? status.getName() : null) +
                ", invoiceId=" + (invoice != null ? invoice.getId() : null) +
                ", checkInDate=" + checkInDate +
                ", checkOutDate=" + checkOutDate +
                ", bookingTime=" + bookingTime +
                '}';
    }
}