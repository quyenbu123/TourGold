package dev.tin.tour_back.controller;

import dev.tin.tour_back.dto.AnnouncementReceiptDto;
import dev.tin.tour_back.entity.AnnouncementReceipt;
import dev.tin.tour_back.repository.AnnouncementReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/announcements")
@RequiredArgsConstructor
public class UserAnnouncementController {
    private final AnnouncementReceiptRepository receiptRepository;

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(Authentication auth) {
        Long userId = extractUserId(auth);
        long unread = receiptRepository.countByUser_IdAndSeenFalse(userId);
        return ResponseEntity.ok(java.util.Map.of("unread", unread));
    }

    @GetMapping("/mine")
    public List<AnnouncementReceiptDto> mine(Authentication auth) {
        Long userId = extractUserId(auth);
        var receipts = receiptRepository.findTop50WithAnnouncementByUserOrderByAnnouncementCreatedAtDesc(userId);
        return receipts.stream().map(AnnouncementReceiptDto::from).collect(Collectors.toList());
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        Long userId = extractUserId(auth);
        var items = receiptRepository.findTop50ByUser_IdOrderByAnnouncement_CreatedAtDesc(userId);
        for (var r : items) {
            if (!r.isSeen()) {
                r.setSeen(true);
                r.setSeenAt(OffsetDateTime.now());
            }
        }
        receiptRepository.saveAll(items);
        return ResponseEntity.ok().build();
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalStateException("No authentication");
        }
        try {
            Object p = authentication.getPrincipal();
            return (Long) p.getClass().getMethod("getUserId").invoke(p);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot extract userId", e);
        }
    }
}
