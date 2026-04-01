package dev.tin.tour_back.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {
    private Long tourId;
    private Long userId;
    private String username;
    private String content;
    private String reply;
    private Boolean isHidden;
    private Integer rating;
    private LocalDateTime commentDate;
} 