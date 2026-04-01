package dev.tin.tour_back.service;

import dev.tin.tour_back.dto.HostRegistrationRequest;
import dev.tin.tour_back.entity.HostRegistrationEntity;
import dev.tin.tour_back.entity.HostRegistrationStatus;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.HostRegistrationRepository;
import dev.tin.tour_back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.springframework.util.StringUtils.hasText;

@Service
@RequiredArgsConstructor
public class HostRegistrationService {
    private final HostRegistrationRepository repository;
    private final UserRepository userRepository;
    private final UserService userService;

    public HostRegistrationEntity requestHost(Long userId, HostRegistrationRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isHost = user.getRoles().stream().anyMatch(r -> "ROLE_HOST".equals(r.getName()));
        if (isHost) {
            throw new IllegalStateException("Tài khoản đã là Host.");
        }
        if (request == null
                || !hasText(request.getContactName())
                || !hasText(request.getContactPhone())
                || !hasText(request.getMessage())
                || !hasText(request.getTaxCode())
                || !hasText(request.getBusinessLicenseNumber())) {
            throw new IllegalArgumentException("Vui lòng cung cấp đầy đủ thông tin liên hệ, mã số thuế và giấy phép kinh doanh.");
        }

        Optional<HostRegistrationEntity> existingPending =
                repository.findFirstByUser_IdAndStatusOrderByRequestDateDesc(userId, HostRegistrationStatus.PENDING);

        HostRegistrationEntity reg = existingPending.orElseGet(HostRegistrationEntity::new);
        reg.setUser(user);
        reg.setStatus(HostRegistrationStatus.PENDING);
        reg.setRequestDate(LocalDateTime.now());
        reg.setProcessedDate(null);
        reg.setAdminNotes(null);
        reg.setContactName(request.getContactName().trim());
        reg.setContactPhone(request.getContactPhone().trim());
        reg.setBusinessName(hasText(request.getBusinessName()) ? request.getBusinessName().trim() : null);
        reg.setMessage(request.getMessage().trim());
        reg.setTaxCode(request.getTaxCode().trim());
        reg.setBusinessLicenseNumber(request.getBusinessLicenseNumber().trim());
        reg.setBusinessAddress(hasText(request.getBusinessAddress()) ? request.getBusinessAddress().trim() : null);
        reg.setSupportingDocumentUrl(hasText(request.getSupportingDocumentUrl()) ? request.getSupportingDocumentUrl().trim() : null);
        return repository.save(reg);
    }

    public List<HostRegistrationEntity> listAll(HostRegistrationStatus status) {
        if (status == null) return repository.findAll();
        return repository.findAllByStatus(status);
    }

    public HostRegistrationEntity approve(Long registrationId, String adminNote) {
        HostRegistrationEntity reg = repository.findById(registrationId)
                .orElseThrow(() -> new IllegalArgumentException("Registration not found"));
        if (reg.getStatus() != HostRegistrationStatus.PENDING) {
            throw new IllegalStateException("Trạng thái không hợp lệ để phê duyệt");
        }
        userService.addRole(reg.getUser().getId(), "ROLE_HOST");
        reg.setStatus(HostRegistrationStatus.APPROVED);
        reg.setProcessedDate(LocalDateTime.now());
        reg.setAdminNotes(hasText(adminNote) ? adminNote.trim() : null);
        return repository.save(reg);
    }

    public HostRegistrationEntity reject(Long registrationId, String adminNote) {
        HostRegistrationEntity reg = repository.findById(registrationId)
                .orElseThrow(() -> new IllegalArgumentException("Registration not found"));
        if (reg.getStatus() != HostRegistrationStatus.PENDING) {
            throw new IllegalStateException("Trạng thái không hợp lệ để từ chối");
        }
        reg.setStatus(HostRegistrationStatus.REJECTED);
        reg.setProcessedDate(LocalDateTime.now());
        reg.setAdminNotes(hasText(adminNote) ? adminNote.trim() : null);
        return repository.save(reg);
    }
}

