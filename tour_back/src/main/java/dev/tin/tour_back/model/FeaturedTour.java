package dev.tin.tour_back.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FeaturedTour {
    private Long tourId;
    private Double averageRating;
    private Long bookTracking;
    private Double score; // Added to store the calculated score
    
    public FeaturedTour(Long tourId, Double averageRating, Long bookTracking) {
        this.tourId = tourId;
        this.averageRating = averageRating;
        this.bookTracking = bookTracking;
        this.score = 0.0;
    }
    
    // Add default constructor
    public FeaturedTour() {
        this.score = 0.0;
    }
}
