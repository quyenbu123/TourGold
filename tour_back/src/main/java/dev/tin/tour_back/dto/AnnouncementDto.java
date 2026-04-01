package dev.tin.tour_back.dto;

import dev.tin.tour_back.entity.Announcement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementDto {
    private Long id;
    private String content;
    private OffsetDateTime createdAt;
    private String createdBy;

    public static AnnouncementDto from(Announcement a) {
        if (a == null) return null;
        return AnnouncementDto.builder()
                .id(a.getId())
                .content(a.getContent())
                .createdAt(a.getCreatedAt())
                .createdBy(a.getCreatedBy())
                .build();
    }
}
