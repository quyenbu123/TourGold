package dev.tin.tour_back.controller;

import dev.tin.tour_back.dto.AnnouncementMessage;
import dev.tin.tour_back.entity.Announcement;
import dev.tin.tour_back.repository.AnnouncementRepository;
import dev.tin.tour_back.repository.AnnouncementReceiptRepository;
import dev.tin.tour_back.repository.UserRepository;
import dev.tin.tour_back.entity.AnnouncementReceipt;
import dev.tin.tour_back.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/announcements")
@RequiredArgsConstructor
public class AnnouncementRestController {
    private final AnnouncementRepository repository;
    private final AnnouncementReceiptRepository receiptRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<Announcement> list() {
        return repository.findTop20ByOrderByCreatedAtDesc();
    }

    @GetMapping("/public")
    public List<Announcement> listPublic() {
        return repository.findTop20ByOrderByCreatedAtDesc();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Announcement> create(@RequestBody AnnouncementMessage req,
                                               Authentication auth) {
        String createdBy = null;
        if (auth != null && auth.getPrincipal() != null) {
            try {
                createdBy = (String) auth.getPrincipal().getClass().getMethod("getUsername").invoke(auth.getPrincipal());
            } catch (Exception ignored) {}
        }
    Announcement saved = repository.save(
                Announcement.builder().content(req.getContent()).createdBy(createdBy).build()
        );

    // Create per-user receipts (basic all-users broadcast)
    java.util.List<UserEntity> users = userRepository.findAll();
    java.util.List<AnnouncementReceipt> receipts = new java.util.ArrayList<>(users.size());
    for (UserEntity u : users) {
        receipts.add(AnnouncementReceipt.builder()
            .announcement(saved)
            .user(u)
            .seen(false)
            .build());
    }
    receiptRepository.saveAll(receipts);

        // Broadcast to all subscribers
        messagingTemplate.convertAndSend("/topic/announcements", new AnnouncementMessage(saved.getContent()));

        return ResponseEntity.ok(saved);
    }
}
