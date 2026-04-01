package dev.tin.tour_back.controller;

import dev.tin.tour_back.model.FeaturedTour;
import dev.tin.tour_back.service.FeaturedTourService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/debug")
public class DebugController {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private FeaturedTourService featuredTourService;

    @GetMapping("/featured-tour-data")
    public ResponseEntity<Map<String, Object>> getFeaturedTourDebugData() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Query comments
            String commentQuery = "SELECT c.tour.id, c.rating FROM CommentEntity c";
            List<Object[]> comments = entityManager.createQuery(commentQuery).getResultList();
            result.put("comments", comments);
            
            // Query bookings
            String bookingQuery = "SELECT b.tour.id, COUNT(b.id) FROM BookingEntity b GROUP BY b.tour.id";
            List<Object[]> bookings = entityManager.createQuery(bookingQuery).getResultList();
            result.put("bookings", bookings);
            
            // Additional diagnostic info
            result.put("success", true);
            result.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.ok(result);
        }
    }

    @GetMapping("/featured-ranking")
    public String getFeaturedRanking() {
        StringBuilder result = new StringBuilder("FEATURED TOUR RANKING:\n\n");
        
        try {
            List<FeaturedTour> topTours = featuredTourService.getTopFeaturedTours(10);
            
            if (topTours.isEmpty()) {
                return "No featured tours found";
            }
            
            for (int i = 0; i < topTours.size(); i++) {
                FeaturedTour tour = topTours.get(i);
                result.append("RANK #").append(i + 1).append(": ")
                      .append("Tour ID ").append(tour.getTourId())
                      .append(" (Score: ").append(tour.getScore())
                      .append(", Rating: ").append(tour.getAverageRating())
                      .append(", Bookings: ").append(tour.getBookTracking())
                      .append(")\n");
            }
            
            return result.toString();
        } catch (Exception e) {
            return "Error getting featured tours: " + e.getMessage();
        }
    }
}
