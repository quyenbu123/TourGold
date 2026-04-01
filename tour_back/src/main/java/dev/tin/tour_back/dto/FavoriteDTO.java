package dev.tin.tour_back.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class FavoriteDTO {
    private Long id;
    private Long userId;
    private Long tourId;
    private String tourName;
    private String tourDescription;
    private Long tourPrice;
    private String tourImageUrl;
    private LocalDateTime createdAt;
} 