package dev.tin.tour_back.dto;

import lombok.Data;

@Data
public class TourSummaryDTO {
    private Long id;
    private String name;
    private String mainImageUrl;
    private Long price;
    private Boolean isDisplayed;
}

