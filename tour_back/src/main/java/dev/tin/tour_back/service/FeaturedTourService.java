package dev.tin.tour_back.service;

import dev.tin.tour_back.model.FeaturedTour;
import dev.tin.tour_back.repository.FeaturedTourRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.Comparator;
import java.util.List;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Service
public class FeaturedTourService {

    private static final Logger logger = Logger.getLogger(FeaturedTourService.class.getName());

    @Autowired
    private FeaturedTourRepository featuredTourRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    public List<FeaturedTour> getTopFeaturedTours(int limit) {
        try {
            // Use System.out for guaranteed visibility in console
            System.out.println("\n\n========== FEATURED TOUR DEBUG START ==========");
            
            // Get direct query results from the database for debugging
            try {
                System.out.println("CHECKING COMMENT DATA:");
                // Use simpler queries that are less likely to cause issues
                List<?> comments = entityManager.createNativeQuery("SELECT * FROM comment LIMIT 10").getResultList();
                System.out.println("Found " + comments.size() + " comments");
                
                if (!comments.isEmpty()) {
                    System.out.println("First comment data: " + comments.get(0));
                }
                
                System.out.println("CHECKING BOOKING DATA:");
                List<?> bookings = entityManager.createNativeQuery("SELECT * FROM booking LIMIT 10").getResultList();
                System.out.println("Found " + bookings.size() + " bookings");
                
                if (!bookings.isEmpty()) {
                    System.out.println("First booking data: " + bookings.get(0));
                }
            } catch (Exception e) {
                System.out.println("ERROR in direct database query: " + e.getMessage());
            }
            
            // Get featured tours from repository
            List<FeaturedTour> allTours = featuredTourRepository.getFeaturedTourList();
            System.out.println("FEATURED TOURS: Found " + allTours.size() + " tours");
            
            // Print each tour's raw data
            for (FeaturedTour tour : allTours) {
                System.out.println("Tour ID: " + tour.getTourId() + 
                                   ", Rating: " + tour.getAverageRating() + 
                                   ", Bookings: " + tour.getBookTracking());
            }
            
            if (allTours.isEmpty()) {
                System.out.println("No tours found for scoring");
                return allTours;
            }
            
            // Find min and max values for normalization
            double maxRating = allTours.stream()
                    .mapToDouble(tour -> tour.getAverageRating() != null ? tour.getAverageRating() : 0.0)
                    .max()
                    .orElse(5.0);
            
            double minRating = allTours.stream()
                    .mapToDouble(tour -> tour.getAverageRating() != null ? tour.getAverageRating() : 0.0)
                    .min()
                    .orElse(0.0);
            
            long maxTracking = allTours.stream()
                    .mapToLong(tour -> tour.getBookTracking() != null ? tour.getBookTracking() : 0L)
                    .max()
                    .orElse(1L);
            
            long minTracking = allTours.stream()
                    .mapToLong(tour -> tour.getBookTracking() != null ? tour.getBookTracking() : 0L)
                    .min()
                    .orElse(0L);
            
            System.out.println("NORMALIZATION PARAMETERS:");
            System.out.println("Rating Range: " + minRating + " to " + maxRating);
            System.out.println("Booking Range: " + minTracking + " to " + maxTracking);
                    
            // Avoid division by zero
            double ratingDivisor = maxRating - minRating > 0 ? maxRating - minRating : 1.0;
            long trackingDivisor = maxTracking - minTracking > 0 ? maxTracking - minTracking : 1L;
            
            // Calculate score for each tour and sort
            List<FeaturedTour> scoredTours = allTours.stream()
                    .map(tour -> {
                        double currentRating = tour.getAverageRating() != null ? tour.getAverageRating() : 0.0;
                        long currentTracking = tour.getBookTracking() != null ? tour.getBookTracking() : 0L;
                        
                        double ratingScore = (currentRating - minRating) / ratingDivisor;
                        double trackingScore = (double)(currentTracking - minTracking) / trackingDivisor;
                        double finalScore = ratingScore + trackingScore;
                        
                        tour.setScore(finalScore);
                        
                        System.out.println("SCORING - Tour " + tour.getTourId() + 
                                          ": Rating=" + currentRating +
                                          ", Bookings=" + currentTracking + 
                                          ", Rating Score=" + ratingScore +
                                          ", Booking Score=" + trackingScore +
                                          ", FINAL SCORE=" + finalScore);
                        
                        return tour;
                    })
                    .sorted(Comparator.comparingDouble(FeaturedTour::getScore).reversed())
                    .collect(Collectors.toList());
            
            // Print final ranking
            System.out.println("\nFINAL RANKINGS:");
            for (int i = 0; i < Math.min(limit, scoredTours.size()); i++) {
                FeaturedTour tour = scoredTours.get(i);
                System.out.println("RANK #" + (i+1) + ": Tour ID " + tour.getTourId() + 
                                  " with score " + tour.getScore() +
                                  " (Rating: " + tour.getAverageRating() + 
                                  ", Bookings: " + tour.getBookTracking() + ")");
            }
            
            List<FeaturedTour> topTours = scoredTours.stream()
                    .limit(limit)
                    .collect(Collectors.toList());
            
            System.out.println("Returning top " + topTours.size() + " tours");
            System.out.println("========== FEATURED TOUR DEBUG END ==========\n\n");
            
            return topTours;
            
        } catch (Exception e) {
            System.out.println("ERROR in getTopFeaturedTours: " + e.getMessage());
            e.printStackTrace();
            return java.util.Collections.emptyList();
        }
    }
}
