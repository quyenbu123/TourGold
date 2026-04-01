package dev.tin.tour_back.controller;

import dev.tin.tour_back.config.UserPrincipal;
import dev.tin.tour_back.dto.HostRegistrationDTO;
import dev.tin.tour_back.dto.HostRegistrationRequest;
import dev.tin.tour_back.entity.HostRegistrationEntity;
import dev.tin.tour_back.entity.HostRegistrationStatus;
import dev.tin.tour_back.service.HostRegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class HostRegistrationController {

    private final HostRegistrationService service;

    // User gửi yêu cầu đăng ký Host
    @PostMapping("/host/register")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> requestHost(Authentication authentication, @RequestBody HostRegistrationRequest request) {
        try {
            UserPrincipal principal = (authentication != null && authentication.getPrincipal() instanceof UserPrincipal)
                    ? (UserPrincipal) authentication.getPrincipal() : null;
            if (principal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
            }
            HostRegistrationEntity reg = service.requestHost(principal.getUserId(), request);
            return ResponseEntity.ok(reg);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create host request");
        }
    }

    // Admin: danh sách yêu cầu
    @GetMapping("/admin/host-registrations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<HostRegistrationDTO>> list(@RequestParam(value = "status", required = false) String status) {
        HostRegistrationStatus st = null;
        if (status != null && !status.isBlank()) {
            st = HostRegistrationStatus.valueOf(status.toUpperCase());
        }
        List<HostRegistrationDTO> out = service.listAll(st).stream()
                .map(HostRegistrationDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(out);
    }

    // Admin: phê duyệt
    @PostMapping("/admin/host-registrations/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approve(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String note = body != null ? body.getOrDefault("note", null) : null;
            HostRegistrationEntity reg = service.approve(id, note);
            return ResponseEntity.ok(HostRegistrationDTO.fromEntity(reg));
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to approve host request");
        }
    }

    // Admin: từ chối
    @PostMapping("/admin/host-registrations/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> reject(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String note = body != null ? body.getOrDefault("note", null) : null;
            HostRegistrationEntity reg = service.reject(id, note);
            return ResponseEntity.ok(HostRegistrationDTO.fromEntity(reg));
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to reject host request");
        }
    }
}

