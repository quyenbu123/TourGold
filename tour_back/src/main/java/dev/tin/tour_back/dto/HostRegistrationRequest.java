package dev.tin.tour_back.dto;

import lombok.Data;

@Data
public class HostRegistrationRequest {
    private String contactName;
    private String contactPhone;
    private String businessName;
    private String message;
    private String taxCode;
    private String businessLicenseNumber;
    private String businessAddress;
    private String supportingDocumentUrl;
}
