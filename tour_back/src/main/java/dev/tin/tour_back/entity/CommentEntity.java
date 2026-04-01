package dev.tin.tour_back.entity;

import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "comment")
public class CommentEntity {
    @EmbeddedId
    private CommentId id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @MapsId("userId")
    private UserEntity user;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    @MapsId("tourId")
    private TourEntity tour;

    private String content;
    private String reply;
    private Boolean isHidden;
    private Integer rating;
}