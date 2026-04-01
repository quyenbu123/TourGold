package dev.tin.tour_back.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "host_registrations")
@Getter
@Setter
public class HostRegistrationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HostRegistrationStatus status = HostRegistrationStatus.PENDING;

    @Column(name = "request_date", nullable = false)
    private LocalDateTime requestDate = LocalDateTime.now();

    @Column(name = "processed_date")
    private LocalDateTime processedDate;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "contact_name", length = 120)
    private String contactName;

    @Column(name = "contact_phone", length = 40)
    private String contactPhone;

    @Column(name = "business_name", length = 200)
    private String businessName;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "tax_code", length = 30)
    private String taxCode;

    @Column(name = "business_license_number", length = 60)
    private String businessLicenseNumber;

    @Column(name = "business_address", length = 255)
    private String businessAddress;

    @Column(name = "supporting_document_url", length = 255)
    private String supportingDocumentUrl;
}

