package dev.tin.tour_back.controller;

import dev.tin.tour_back.dto.CommentDTO;
import dev.tin.tour_back.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/comment")
@CrossOrigin(origins = "*")
public class CommentController {
    @Autowired
    private CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentDTO> addComment(@RequestBody Map<String, Object> payload) {
        System.out.println("Received comment payload: " + payload);
        
        try {
            Long userId = Long.valueOf(payload.get("userId").toString());
            Long tourId = Long.valueOf(payload.get("tourId").toString());
            String content = payload.get("content").toString();
            String reply = payload.containsKey("reply") ? payload.get("reply").toString() : "";
            Boolean isHidden = payload.containsKey("isHidden") ? Boolean.valueOf(payload.get("isHidden").toString()) : false;
            Integer rating = payload.containsKey("rating") ? Integer.valueOf(payload.get("rating").toString()) : 5;

            CommentDTO comment = commentService.addComment(content, userId, tourId, reply, isHidden, rating);
            return new ResponseEntity<>(comment, HttpStatus.CREATED);
        } catch (Exception e) {
            System.out.println("Error processing comment: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }
    
    @GetMapping("/{tourId}")
    public ResponseEntity<List<CommentDTO>> getCommentsByTour(@PathVariable Long tourId) {
        try {
            List<CommentDTO> comments = commentService.getCommentsByTour(tourId);
            return new ResponseEntity<>(comments, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error getting comments: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @DeleteMapping("/delete/{tourId}/{userId}/{timestamp}")
    public ResponseEntity<CommentDTO> deleteComment(
            @PathVariable Long tourId,
            @PathVariable Long userId,
            @PathVariable String timestamp) {
        System.out.println("Deleting comment - tourId: " + tourId + ", userId: " + userId + ", timestamp: " + timestamp);
        
        Long timestampMillis;
        try {
            // Try parsing as milliseconds first
            timestampMillis = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            // If not milliseconds, try parsing as date string
            try {
                // Try different date formats
                LocalDateTime dateTime;
                if (timestamp.contains("+") || timestamp.endsWith("Z")) {
                    // If timestamp includes timezone offset or Z, parse it directly
                    dateTime = LocalDateTime.parse(timestamp);
                } else if (timestamp.contains("T")) {
                    // If it's an ISO format without timezone, assume UTC
                    dateTime = LocalDateTime.parse(timestamp);
                } else {
                    // Try parsing as a simple date format (yyyy-MM-dd HH:mm:ss)
                    dateTime = LocalDateTime.parse(timestamp.replace(" ", "T"));
                }
                // Convert LocalDateTime to epoch milliseconds using Timestamp
                timestampMillis = Timestamp.valueOf(dateTime).getTime();
            } catch (Exception ex) {
                System.out.println("Invalid timestamp format: " + timestamp);
                ex.printStackTrace();
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
        }
        
        try {
            CommentDTO deletedComment = commentService.deleteComment(userId, tourId, timestampMillis);
            return new ResponseEntity<>(deletedComment, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error deleting comment: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
