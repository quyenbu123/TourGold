package dev.tin.tour_back.repository;

import dev.tin.tour_back.model.FeaturedTour;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

@Repository
public class FeaturedTourRepositoryImpl implements FeaturedTourRepository {

    private static final Logger logger = Logger.getLogger(FeaturedTourRepositoryImpl.class.getName());
    
    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<FeaturedTour> getFeaturedTourList() {
        try {
            // Set higher log level to ensure visibility
            logger.setLevel(Level.ALL);
            
            System.out.println("************* FEATURED TOUR DATA RETRIEVAL STARTING *************");
            logger.severe("FEATURED TOUR DATA RETRIEVAL STARTING - USING SEVERE LEVEL");
            
            // Direct SQL approach for debugging
            try {
                System.out.println("Direct SQL check for comments:");
                Query nativeCommentQuery = entityManager.createNativeQuery(
                    "SELECT c.tour_id, c.rating FROM comment c");
                List<Object[]> directComments = nativeCommentQuery.getResultList();
                
                for (Object[] comment : directComments) {
                    System.out.println("COMMENT DATA (SQL): Tour ID=" + comment[0] + 
                                      ", Rating=" + comment[1]);
                }
                
                System.out.println("Direct SQL check for bookings:");
                Query nativeBookingQuery = entityManager.createNativeQuery(
                    "SELECT b.tour_id, COUNT(*) FROM booking b GROUP BY b.tour_id");
                List<Object[]> directBookings = nativeBookingQuery.getResultList();
                
                for (Object[] booking : directBookings) {
                    System.out.println("BOOKING DATA (SQL): Tour ID=" + booking[0] + 
                                      ", Count=" + booking[1]);
                }
            } catch (Exception e) {
                System.out.println("Error in direct SQL: " + e.getMessage());
                e.printStackTrace();
            }
            
            // JPQL approach
            System.out.println("JPQL check for comments:");
            try {
                String commentQuery = 
                    "SELECT c.tour.id, c.rating FROM CommentEntity c ORDER BY c.tour.id";
                List<Object[]> comments = entityManager.createQuery(commentQuery).getResultList();
                
                for (Object[] comment : comments) {
                    System.out.println("COMMENT DATA (JPQL): Tour ID=" + comment[0] + 
                                      ", Rating=" + comment[1]);
                }
            } catch (Exception e) {
                System.out.println("Error in JPQL comments: " + e.getMessage());
                e.printStackTrace();
            }
            
            System.out.println("JPQL check for bookings:");
            try {
                String bookingQuery = 
                    "SELECT b.tour.id, COUNT(b.id) FROM BookingEntity b GROUP BY b.tour.id";
                List<Object[]> bookings = entityManager.createQuery(bookingQuery).getResultList();
                
                for (Object[] booking : bookings) {
                    System.out.println("BOOKING DATA (JPQL): Tour ID=" + booking[0] + 
                                      ", Count=" + booking[1]);
                }
            } catch (Exception e) {
                System.out.println("Error in JPQL bookings: " + e.getMessage());
                e.printStackTrace();
            }
            
            // Main query for featured tour calculation
            System.out.println("Executing main featured tour query");
            try {
                String queryString = 
                    "SELECT NEW dev.tin.tour_back.model.FeaturedTour(t.id, COALESCE(AVG(c.rating), 0.0), COUNT(DISTINCT b.id)) " +
                    "FROM TourEntity t " +
                    "LEFT JOIN CommentEntity c ON t.id = c.tour.id " +
                    "LEFT JOIN BookingEntity b ON t.id = b.tour.id " +
                    "GROUP BY t.id";
                
                List<FeaturedTour> result = entityManager.createQuery(queryString, FeaturedTour.class)
                        .getResultList();
                
                System.out.println("Found " + result.size() + " tours with featured data");
                
                // Print results with System.out to ensure visibility
                for (FeaturedTour tour : result) {
                    System.out.println("FEATURED TOUR: ID=" + tour.getTourId() + 
                                      ", Avg Rating=" + tour.getAverageRating() + 
                                      ", Bookings=" + tour.getBookTracking());
                }
                
                System.out.println("************* FEATURED TOUR DATA RETRIEVAL COMPLETE *************");
                return result;
            } catch (Exception e) {
                System.out.println("Error in main featured tour query: " + e.getMessage());
                e.printStackTrace();
            }
            
            // Fallback to manual approach if the query fails
            System.out.println("Falling back to manual approach for featured tours");
            List<FeaturedTour> manualResult = new ArrayList<>();
            
            // Get all tour IDs
            List<Long> tourIds = entityManager.createQuery("SELECT t.id FROM TourEntity t", Long.class)
                .getResultList();
            
            for (Long tourId : tourIds) {
                // For each tour, manually calculate average rating
                String ratingQuery = "SELECT COALESCE(AVG(c.rating), 0.0) FROM CommentEntity c WHERE c.tour.id = :tourId";
                Double avgRating = entityManager.createQuery(ratingQuery, Double.class)
                    .setParameter("tourId", tourId)
                    .getSingleResult();
                
                // For each tour, manually count bookings
                String bookingQuery = "SELECT COUNT(b.id) FROM BookingEntity b WHERE b.tour.id = :tourId";
                Long bookingCount = entityManager.createQuery(bookingQuery, Long.class)
                    .setParameter("tourId", tourId)
                    .getSingleResult();
                
                FeaturedTour ft = new FeaturedTour(tourId, avgRating, bookingCount);
                manualResult.add(ft);
                
                System.out.println("MANUAL FEATURED TOUR: ID=" + tourId + 
                                  ", Avg Rating=" + avgRating + 
                                  ", Bookings=" + bookingCount);
            }
            
            System.out.println("************* MANUAL FEATURED TOUR DATA RETRIEVAL COMPLETE *************");
            return manualResult;
            
        } catch (Exception e) {
            System.out.println("CRITICAL ERROR in getFeaturedTourList: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
}
