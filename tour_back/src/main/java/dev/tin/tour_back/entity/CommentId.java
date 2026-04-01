package dev.tin.tour_back.entity;

import java.time.LocalDateTime;
import java.io.Serializable;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Embeddable
@Getter
@Setter
public class CommentId implements Serializable {
    private Long tourId;
    private Long userId;
    private LocalDateTime commentDate;
}
