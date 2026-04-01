package dev.tin.tour_back.dto;

import dev.tin.tour_back.entity.AnnouncementReceipt;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementReceiptDto {
    private Long id;
    private AnnouncementDto announcement;
    private boolean seen;
    private OffsetDateTime seenAt;
    private OffsetDateTime createdAt;

    public static AnnouncementReceiptDto from(AnnouncementReceipt r) {
        if (r == null) return null;
        return AnnouncementReceiptDto.builder()
                .id(r.getId())
                .announcement(AnnouncementDto.from(r.getAnnouncement()))
                .seen(r.isSeen())
                .seenAt(r.getSeenAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
