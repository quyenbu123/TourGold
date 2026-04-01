package dev.tin.tour_back.service;

import dev.tin.tour_back.dto.CommentDTO;
import dev.tin.tour_back.entity.CommentEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.repository.CommentRepository;
import dev.tin.tour_back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import dev.tin.tour_back.repository.TourRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.List;
import java.util.stream.Collectors;
import dev.tin.tour_back.entity.CommentId;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final TourRepository tourRepository;

    public CommentDTO addComment(String content, Long userId, Long tourId, String reply, Boolean isHidden, Integer rating) {
        Optional<UserEntity> user = userRepository.findById(userId);
        Optional<TourEntity> tour = tourRepository.findById(tourId);

        if (user.isEmpty() || tour.isEmpty()) {
            throw new RuntimeException("User or Tour not found");
        }

        CommentEntity comment = new CommentEntity();
        comment.setTour(tour.get());
        comment.setUser(user.get());

        // Set time in UTC with zero nanoseconds for consistency
        LocalDateTime commentDate = LocalDateTime.now(ZoneOffset.UTC).withNano(0);
        CommentId commentId = new CommentId(tourId, userId, commentDate);
        comment.setId(commentId);

        comment.setContent(content);
        comment.setReply(reply);
        comment.setIsHidden(isHidden);
        comment.setRating(rating);

        comment = commentRepository.save(comment);
        return convertToDTO(comment);
    }

    public CommentDTO deleteComment(Long userId, Long tourId, Long timestampMillis) {
        // Convert epoch milliseconds to UTC LocalDateTime
        LocalDateTime targetDate = Instant.ofEpochMilli(timestampMillis)
            .atZone(ZoneOffset.UTC)
            .withZoneSameInstant(ZoneOffset.of("+07:00")) // Convert to UTC+7
            .toLocalDateTime()
            .withNano(0);
            
        System.out.println("Looking for comment with target date: " + targetDate);
        
        // Find all comments for this tour and user
        List<CommentEntity> comments = commentRepository.findByTourId(tourId);
        System.out.println("Found " + comments.size() + " comments for tour " + tourId);
        
        // Print all comments for debugging
        comments.forEach(c -> {
            System.out.println("Comment - User: " + c.getUser().getId() + 
                             ", Date: " + c.getId().getCommentDate() + 
                             ", Content: " + c.getContent());
        });
        
        // Find the comment with matching userId and closest timestamp
        CommentEntity commentToDelete = comments.stream()
            .filter(c -> c.getUser().getId().equals(userId))
            .filter(c -> {
                LocalDateTime commentDate = c.getId().getCommentDate();
                // Compare only up to seconds, ignore milliseconds
                return commentDate.truncatedTo(ChronoUnit.SECONDS)
                    .equals(targetDate.truncatedTo(ChronoUnit.SECONDS));
            })
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Comment not found for tourId: " + tourId + 
                                                  ", userId: " + userId + 
                                                  ", timestamp: " + targetDate));

        commentRepository.delete(commentToDelete);
        return convertToDTO(commentToDelete);
    }

    public List<CommentDTO> getCommentsByTour(Long tourId) {
        return commentRepository.findByTourId(tourId).stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    private CommentDTO convertToDTO(CommentEntity comment) {
        return new CommentDTO(
            comment.getTour().getId(),
            comment.getUser().getId(),
            comment.getUser().getUsername(),
            comment.getContent(),
            comment.getReply(),
            comment.getIsHidden(),
            comment.getRating(),
            comment.getId().getCommentDate()
        );
    }
}