package dev.tin.tour_back.dto;

import dev.tin.tour_back.entity.HostRegistrationEntity;
import dev.tin.tour_back.entity.HostRegistrationStatus;
import dev.tin.tour_back.entity.UserEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostRegistrationDTO {
    private Long id;
    private HostRegistrationStatus status;
    private LocalDateTime requestDate;
    private LocalDateTime processedDate;
    private String adminNotes;
    private UserSummaryDTO user;
    private String contactName;
    private String contactPhone;
    private String businessName;
    private String message;
    private String taxCode;
    private String businessLicenseNumber;
    private String businessAddress;
    private String supportingDocumentUrl;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummaryDTO {
        private Long id;
        private String username;
        private String email;
        private String fullName;
    }

    public static HostRegistrationDTO fromEntity(HostRegistrationEntity e) {
        if (e == null) return null;
        UserEntity u = e.getUser();
        UserSummaryDTO userDto = null;
        if (u != null) {
            userDto = UserSummaryDTO.builder()
                    .id(u.getId())
                    .username(u.getUsername())
                    .email(u.getEmail())
                    .fullName(u.getFullName())
                    .build();
        }
        return HostRegistrationDTO.builder()
                .id(e.getId())
                .status(e.getStatus())
                .requestDate(e.getRequestDate())
                .processedDate(e.getProcessedDate())
                .adminNotes(e.getAdminNotes())
                .user(userDto)
                .contactName(e.getContactName())
                .contactPhone(e.getContactPhone())
                .businessName(e.getBusinessName())
                .message(e.getMessage())
                .taxCode(e.getTaxCode())
                .businessLicenseNumber(e.getBusinessLicenseNumber())
                .businessAddress(e.getBusinessAddress())
                .supportingDocumentUrl(e.getSupportingDocumentUrl())
                .build();
    }
}

