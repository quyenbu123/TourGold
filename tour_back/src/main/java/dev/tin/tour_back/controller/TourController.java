package dev.tin.tour_back.controller;

import dev.tin.tour_back.dto.TourDTO;
import dev.tin.tour_back.entity.ItineraryEntity;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.TourImageEntity;
import dev.tin.tour_back.entity.TourPriceEntity;
import dev.tin.tour_back.model.FeaturedTour;
import dev.tin.tour_back.repository.ItineraryRepository;
import dev.tin.tour_back.repository.TourRepository;
import dev.tin.tour_back.service.FeaturedTourService;
import dev.tin.tour_back.service.TourImageService;
import dev.tin.tour_back.service.TourService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/tours")
public class TourController {

    @Autowired
    private TourService tourService;

    @Autowired
    private TourImageService tourImageService;

    @Autowired
    private ItineraryRepository itineraryRepository;

    @Autowired
    private TourRepository tourRepository;

    @Autowired
    private FeaturedTourService featuredTourService;

    @Autowired
    private dev.tin.tour_back.repository.UserRepository userRepository;

    @Autowired
    private dev.tin.tour_back.service.TourViewService tourViewService;

    @Autowired
    private dev.tin.tour_back.service.TourRecommendationService tourRecommendationService;

    private static final Logger logger = Logger.getLogger(TourController.class.getName());

    // Lấy danh sách tất cả sản phẩm
    @GetMapping
    public ResponseEntity<List<dev.tin.tour_back.dto.TourSummaryDTO>> getAllTours() {
        List<dev.tin.tour_back.dto.TourSummaryDTO> tourDTOs = tourService.getAllToursAsSummary();
        return new ResponseEntity<>(tourDTOs, HttpStatus.OK);
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN','HOST')")
    public ResponseEntity<List<TourEntity>> getAllToursForAdmin() {
        return new ResponseEntity<>(tourService.getAllTours(), HttpStatus.OK);
    }


    @PreAuthorize("hasAnyRole('ADMIN','HOST')")
    @GetMapping("/my")
    public ResponseEntity<List<TourEntity>> getMyTours(Authentication authentication, @RequestParam(value = "ownerId", required = false) Long ownerId) {
        try {
            Long resolvedOwnerId = ownerId;

            if (resolvedOwnerId == null) {
                if (authentication == null || authentication.getPrincipal() == null) {
                    return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
                }

                dev.tin.tour_back.config.UserPrincipal principal = null;
                if (authentication.getPrincipal() instanceof dev.tin.tour_back.config.UserPrincipal) {
                    principal = (dev.tin.tour_back.config.UserPrincipal) authentication.getPrincipal();
                } else {
                    try {
                        Object principalObj = authentication.getPrincipal();
                        resolvedOwnerId = (Long) principalObj.getClass().getMethod("getUserId").invoke(principalObj);
                    } catch (Exception reflectionError) {
                        logger.warning("Không thể lấy userId từ principal: " + reflectionError.getMessage());
                    }
                }

                if (principal != null) {
                    resolvedOwnerId = principal.getUserId();
                }
            } else if (authentication != null && authentication.getAuthorities().stream().noneMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"))) {
                // Only admins can request other owner's tours
                resolvedOwnerId = null;
            }

            if (resolvedOwnerId == null) {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }

            List<TourEntity> tours = tourService.getToursByOwnerId(resolvedOwnerId);
            return new ResponseEntity<>(tours, HttpStatus.OK);
        } catch (Exception e) {
            logger.warning("Lỗi khi lấy danh sách tour của host: " + e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Lấy thông tin sản phẩm theo productId
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{tourId}")
    public ResponseEntity<Optional<TourEntity>> getTourById(@PathVariable Long tourId) {
        return new ResponseEntity<>(tourService.getTourById(tourId), HttpStatus.OK);
    }

    // Public endpoint for accessing tour details
    @GetMapping("/public/{tourId}")
    public ResponseEntity<Optional<TourEntity>> getPublicTourById(@PathVariable Long tourId,
                                                                  Authentication authentication,
                                                                  @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                                                  @RequestHeader(value = "Referer", required = false) String referer,
                                                                  @RequestHeader(value = "X-Forwarded-For", required = false) String xForwardedFor,
                                                                  @RequestHeader(value = "X-Real-IP", required = false) String xRealIp) {
        Optional<TourEntity> tourOpt = tourService.getTourById(tourId);
        // Log view only for authenticated users
        if (tourOpt.isPresent() && authentication != null && authentication.getPrincipal() instanceof dev.tin.tour_back.config.UserPrincipal principal) {
            dev.tin.tour_back.entity.UserEntity u = userRepository.findById(principal.getUserId()).orElse(null);
            String clientIp = xForwardedFor != null ? xForwardedFor : (xRealIp != null ? xRealIp : null);
            tourViewService.logView(u, tourOpt.get(), userAgent, referer, clientIp);
        }
        return new ResponseEntity<>(tourOpt, HttpStatus.OK);
    }

    // Endpoint để thêm itineraries
    @PostMapping("/itineraries")
    public ResponseEntity<?> addItineraries(@RequestBody List<Map<String, Object>> itineraryData) {
        System.out.println("Received request to add itineraries: " + itineraryData.size());

        List<ItineraryEntity> itineraries = new ArrayList<>();

        for (Map<String, Object> data : itineraryData) {
            System.out.println("Processing data: " + data);

            ItineraryEntity entity = new ItineraryEntity();

            if (data.containsKey("itinerary")) {
                entity.setItinerary(data.get("itinerary").toString());
            }

            if (data.containsKey("date_time")) {
                String dateTimeStr = data.get("date_time").toString();
                try {
                    LocalDateTime dateTime = LocalDateTime.parse(dateTimeStr);
                    entity.setDate_time(dateTime);
                } catch (Exception e) {
                    System.out.println("Error parsing date: " + e.getMessage());
                    return new ResponseEntity<>("Invalid date format. Use ISO format (e.g. 2025-06-01T08:00:00)", HttpStatus.BAD_REQUEST);
                }
            }

            itineraries.add(entity);
        }

        try {
            List<ItineraryEntity> savedItineraries = itineraryRepository.saveAll(itineraries);
            System.out.println("Successfully saved " + savedItineraries.size() + " itineraries");
            return new ResponseEntity<>(savedItineraries, HttpStatus.CREATED);
        } catch (Exception e) {
            System.out.println("Error saving itineraries: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Error saving itineraries: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Endpoint để lấy tất cả itineraries
    @GetMapping("/itineraries")
    public ResponseEntity<List<ItineraryEntity>> getAllItineraries() {
        List<ItineraryEntity> itineraries = itineraryRepository.findAll();
        System.out.println("Found " + itineraries.size() + " itineraries");
        return new ResponseEntity<>(itineraries, HttpStatus.OK);
    }

    // Thêm một tour mới (không bao gồm hình ảnh)
    @PreAuthorize("hasAnyRole('ADMIN','HOST')")
    @PostMapping
    public ResponseEntity<TourEntity> addTour(@RequestBody TourDTO tourDTO, Authentication authentication) {
        try {
            dev.tin.tour_back.config.UserPrincipal principal = (authentication != null && authentication.getPrincipal() instanceof dev.tin.tour_back.config.UserPrincipal)
                    ? (dev.tin.tour_back.config.UserPrincipal) authentication.getPrincipal()
                    : null;
            dev.tin.tour_back.entity.UserEntity owner = null;
            if (principal != null) {
                owner = userRepository.findById(principal.getUserId()).orElse(null);
            }

            TourEntity savedTour = tourService.addTour(
                tourDTO.getName(),
                tourDTO.getDescription(),
                null, // mainImage - sẽ được thêm sau qua endpoint riêng
                tourDTO.getStartDate(),
                tourDTO.getEndDate(),
                tourDTO.getMaxQuantity(),
                tourDTO.getTourPrices(),
                tourDTO.getApprovalStatus(),
                tourDTO.getTypeOfTourIds(),
                null, // additionalImages - sẽ được thêm sau qua endpoint riêng
                null, // destinationIds - đã bỏ
                tourDTO.getServices(),
                tourDTO.getItineraries(),
                owner
            );
            return new ResponseEntity<>(savedTour, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Endpoint riêng để thêm hình ảnh chính cho tour
    @PostMapping("/{tourId}/main-image")
    public ResponseEntity<TourImageEntity> addMainImage(
            @PathVariable Long tourId,
            @RequestParam("image") MultipartFile image) {
        try {
            Optional<TourEntity> tourOpt = tourService.getTourById(tourId);
            if (!tourOpt.isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }

            TourImageEntity mainImage = tourImageService.addMainImageToTour(tourOpt.get(), image);
            return new ResponseEntity<>(mainImage, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Endpoint riêng để thêm nhiều hình ảnh bổ sung cho tour
    @PostMapping("/{tourId}/additional-images")
    public ResponseEntity<List<TourImageEntity>> addAdditionalImages(
            @PathVariable Long tourId,
            @RequestParam("images") List<MultipartFile> images) {
        try {
            Optional<TourEntity> tourOpt = tourService.getTourById(tourId);
            if (!tourOpt.isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }

            List<TourImageEntity> addedImages = tourImageService.addImagesToTour(tourOpt.get(), images);
            return new ResponseEntity<>(addedImages, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Xóa hình ảnh của tour
    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<String> deleteTourImage(@PathVariable Long imageId) {
        try {
            tourImageService.deleteImage(imageId);
            return new ResponseEntity<>("Hình ảnh đã được xóa", HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>("Không thể xóa hình ảnh: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Lấy tất cả hình ảnh của một tour
    @GetMapping("/{tourId}/images")
    public ResponseEntity<List<TourImageEntity>> getTourImages(@PathVariable Long tourId) {
        try {
            Optional<TourEntity> tourOpt = tourService.getTourById(tourId);
            if (!tourOpt.isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }

            List<TourImageEntity> images = tourImageService.getImagesByTour(tourOpt.get());
            return new ResponseEntity<>(images, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Xóa sản phẩm theo productId
    @PreAuthorize("hasRole('ADMIN') or @tourSecurity.isOwner(#tourId, authentication)")
    @DeleteMapping("/{tourId}")
    public ResponseEntity<String> deleteTour(@PathVariable Long tourId) {
        tourService.deleteTour(tourId);
        return new ResponseEntity<>("Sản phẩm đã bị xóa!", HttpStatus.OK);
    }

    // Cập nhật tour (không bao gồm hình ảnh)
    @PreAuthorize("hasRole('ADMIN') or @tourSecurity.isOwner(#tourId, authentication)")
    @PutMapping("/{tourId}")
    public ResponseEntity<?> updateTour(
            @PathVariable Long tourId,
            @RequestBody TourDTO tourDTO) {
        try {
            System.out.println("Received update request for tourId: " + tourId);
            System.out.println("TourDTO services: " + (tourDTO.getServices() != null ? tourDTO.getServices().size() : "null"));
            System.out.println("Flags: clearAllServices=" + tourDTO.isClearAllServices() + ", clearAllPrices=" + tourDTO.isClearAllPrices());

            TourEntity updatedTour = tourService.updateTour(
                tourId,
                tourDTO.getName(),
                tourDTO.getDescription(),
                null, // mainImage - sẽ được cập nhật qua endpoint riêng
                tourDTO.getStartDate(),
                tourDTO.getEndDate(),
                tourDTO.getMaxQuantity(),
                tourDTO.getTourPrices(),
                tourDTO.getApprovalStatus(),
                tourDTO.getTypeOfTourIds(),
                null, // additionalImages - sẽ được cập nhật qua endpoint riêng
                null, // destinationIds - đã bỏ
                tourDTO.getItineraryStrings(),
                tourDTO.getServices()
            );

            if (updatedTour == null) {
                return new ResponseEntity<>("Tour not found with ID: " + tourId, HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(updatedTour, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>("Error updating tour: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @PreAuthorize("hasAnyRole('ADMIN','HOST')")
    @PutMapping("/{tourId}/toggle-display")
    public ResponseEntity<?> toggleTourDisplay(@PathVariable Long tourId) {
        try {
            Optional<TourEntity> tourOpt = tourService.getTourById(tourId);
            if (tourOpt.isEmpty()) {
                return new ResponseEntity<>("Tour not found with ID: " + tourId, HttpStatus.NOT_FOUND);
            }
            TourEntity tour = tourOpt.get();
            tour.setIsDisplayed(!Boolean.TRUE.equals(tour.getIsDisplayed()));
            TourEntity updatedTour = tourRepository.save(tour);
            return new ResponseEntity<>(updatedTour, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>("Error toggling tour display status: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Add this new endpoint
    @GetMapping("/featured")
    public ResponseEntity<List<FeaturedTour>> getFeaturedTours() {
        // Return top 5 featured tours
        return new ResponseEntity<>(featuredTourService.getTopFeaturedTours(5), HttpStatus.OK);
    }

    @GetMapping("/featured-ids")
    public ResponseEntity<List<Long>> getFeaturedTourIds() {
        try {
            // Use the FeaturedTourService to get properly ranked tours instead of just the first 5 tours
            List<FeaturedTour> featuredTours = featuredTourService.getTopFeaturedTours(5);
            List<Long> tourIds = featuredTours.stream()
                    .map(FeaturedTour::getTourId)
                    .collect(Collectors.toList());

            System.out.println("Returning featured tour IDs based on rankings: " + tourIds);
            return new ResponseEntity<>(tourIds, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // New endpoint: fetch tours by IDs (displayed only)
    @GetMapping("/by-ids")
    public ResponseEntity<List<TourEntity>> getToursByIds(@RequestParam(name = "ids") List<Long> ids) {
        try {
            if (ids == null || ids.isEmpty()) {
                return new ResponseEntity<>(java.util.Collections.emptyList(), HttpStatus.OK);
            }
            List<TourEntity> tours = tourService.getDisplayedToursByIds(ids);
            return new ResponseEntity<>(tours, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<TourEntity>> getRecommendations(Authentication authentication,
                                                               @RequestParam(name = "limit", defaultValue = "10") int limit) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof dev.tin.tour_back.config.UserPrincipal principal)) {
                return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
            }
            dev.tin.tour_back.entity.UserEntity user = userRepository.findById(principal.getUserId()).orElse(null);
            if (user == null) {
                return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
            }
            List<TourEntity> recommendations = tourRecommendationService.recommendForUser(user, Math.min(Math.max(limit, 1), 50));
            return new ResponseEntity<>(recommendations, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
