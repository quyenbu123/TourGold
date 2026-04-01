package dev.tin.tour_back.service;

import dev.tin.tour_back.dto.ServiceDTO;
import dev.tin.tour_back.entity.*;
import dev.tin.tour_back.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;
    private final TypeOfTourRepository typeOfTourRepository;
    private final TourPriceRepository tourPriceRepository;
    private final ServiceRepository serviceRepository;
    private final TypeOfServiceRepository typeOfServiceRepository;
    private final ItineraryRepository itineraryRepository;

    @Transactional(readOnly = true)
    public List<dev.tin.tour_back.dto.TourSummaryDTO> getAllToursAsSummary() {
        List<TourEntity> allTours = tourRepository.findAll();
        System.out.println("[TourService] getAllToursAsSummary -> total from DB: " + (allTours != null ? allTours.size() : -1));
    // Debug distribution of display flags to understand filtering
    long displayTrue = allTours.stream().filter(t -> Boolean.TRUE.equals(t.getIsDisplayed())).count();
    long displayFalse = allTours.stream().filter(t -> Boolean.FALSE.equals(t.getIsDisplayed())).count();
    long displayNull = allTours.stream().filter(t -> t.getIsDisplayed() == null).count();
    System.out.println("[TourService] getAllToursAsSummary -> isDisplayed distribution: true=" + displayTrue + ", false=" + displayFalse + ", null=" + displayNull);

    List<dev.tin.tour_back.dto.TourSummaryDTO> result = allTours.stream()
        // Only exclude tours explicitly marked as deleted; include regardless of isDisplayed to avoid empty lists in seeded data
        .filter(tour -> tour.getIsDeleted() == null || !tour.getIsDeleted())
                .map(tour -> {
                    dev.tin.tour_back.dto.TourSummaryDTO dto = new dev.tin.tour_back.dto.TourSummaryDTO();
                    dto.setId(tour.getId());
                    dto.setName(tour.getName());
                    dto.setMainImageUrl(tour.getMainImageUrl()); // Safe to call within transaction
                    if (tour.getTourPrices() != null && !tour.getTourPrices().isEmpty()) {
                        Long minPrice = tour.getTourPrices().stream()
                                .map(TourPriceEntity::getPrice)
                                .min(Long::compare)
                                .orElse(0L);
                        dto.setPrice(minPrice);
                    }
                    dto.setIsDisplayed(tour.getIsDisplayed());
                    return dto;
                })
                .collect(Collectors.toList());
        System.out.println("[TourService] getAllToursAsSummary -> returned: " + (result != null ? result.size() : -1));
        return result;
    }

    private final TourImageService tourImageService;

    public List<TourEntity> getAllTours() {
        return tourRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<TourEntity> getDisplayedToursByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return java.util.Collections.emptyList();
        List<TourEntity> found = tourRepository.findDisplayedByIds(ids);
        // Reorder to match input order
        java.util.Map<Long, Integer> orderMap = new java.util.HashMap<>();
        for (int i = 0; i < ids.size(); i++) orderMap.put(ids.get(i), i);
        found.sort((a, b) -> Integer.compare(orderMap.getOrDefault(a.getId(), Integer.MAX_VALUE),
                orderMap.getOrDefault(b.getId(), Integer.MAX_VALUE)));
        return found;
    }

    public List<TourEntity> getToursByOwnerId(Long ownerId) {
        if (ownerId == null) {
            return java.util.Collections.emptyList();
        }
        return tourRepository.findByOwner_Id(ownerId);
    }

    public Optional<TourEntity> getTourById(Long tourId) {
        return tourRepository.findById(tourId);
    }

    public void deleteTour(Long tourId) {
        Optional<TourEntity> existingTourOptional = tourRepository.findById(tourId);
        if (existingTourOptional.isPresent()) {
            TourEntity existingTour = existingTourOptional.get();

            // Clear the tour types association first
            existingTour.getTypeOfTourEntities().clear();

            // Save the tour with cleared associations
            tourRepository.save(existingTour);

            // Now delete the tour (this will cascade delete images through the entity relationship)
            tourRepository.deleteById(tourId);
        }
    }

    public TourEntity addTour(String name, String description,
                              MultipartFile mainImage, LocalDateTime startDate,
                              LocalDateTime endDate, Integer maxQuantity,
                              List<TourPriceEntity> tourPrices, String approvalStatus,
                              List<Long> typeOfTourIds, List<MultipartFile> additionalImages,
                              List<Long> destinationIds,
                              List<ServiceDTO> serviceDTOList, List<ItineraryEntity> itineraries,
                              UserEntity owner) {

        TourEntity tour = new TourEntity();
        tour.setName(name);
        tour.setDescription(description);
        tour.setStartDate(startDate);
        tour.setEndDate(endDate);
        tour.setMaxQuantity(maxQuantity);
        tour.setApprovalStatus(approvalStatus);
        if (owner != null) {
            tour.setOwner(owner);
        }
        if (typeOfTourIds != null) {
            List<TypeOfTourEntity> types = typeOfTourRepository.findAllById(typeOfTourIds);
            tour.setTypeOfTourEntities(types);
        }

        // Lưu tour trước để có ID
        TourEntity savedTour = tourRepository.save(tour);
        Long tourId = savedTour.getId();

        // Lưu hình ảnh chính (nếu có) - giờ đã chuyển sang TourImageService
        if (mainImage != null && !mainImage.isEmpty()) {
            tourImageService.addMainImageToTour(savedTour, mainImage);
        }

        // Lưu các hình ảnh bổ sung - giờ đã chuyển sang TourImageService
        if (additionalImages != null && !additionalImages.isEmpty()) {
            tourImageService.addImagesToTour(savedTour, additionalImages);
        }

        // Lưu giá tour
        if (tourPrices != null) {
            for (TourPriceEntity tourPrice : tourPrices) {
                if (tourPrice != null) {
                    tourPrice.setTour(savedTour);
                    tourPriceRepository.save(tourPrice);
                }
            }
        }

        // Lưu lịch trình
        if (itineraries != null) {
            List<ItineraryEntity> savedItineraries = new ArrayList<>();
            for (ItineraryEntity itinerary : itineraries) {
                if (itinerary != null) {
                    ItineraryEntity newItinerary = new ItineraryEntity();
                    newItinerary.setItinerary(itinerary.getItinerary());
                    newItinerary.setDate_time(itinerary.getDate_time());
                    newItinerary.setTour(savedTour);
                    savedItineraries.add(newItinerary);
                }
            }
            // Lưu tất cả itineraries trong một lần
            itineraryRepository.saveAll(savedItineraries);
        }

        // Lưu dịch vụ
        if (serviceDTOList != null) {
            for (ServiceDTO serviceDTO : serviceDTOList) {
                if (serviceDTO != null && serviceDTO.getTypeOfTourId() != null) {
                    ServiceEntity service = new ServiceEntity();
                    service.setTour(savedTour);
                    Optional<TypeOfServiceEntity> typeOfServiceS = typeOfServiceRepository.findById(serviceDTO.getTypeOfTourId());
                    if (typeOfServiceS.isPresent()) {
                        service.setTypeOfService(typeOfServiceS.get());
                        service.setName(serviceDTO.getName());
                        service.setDescription(serviceDTO.getDescription());
                        service.setPrice(serviceDTO.getPrice());
                        service.setAvailable(serviceDTO.isAvailable());
                        serviceRepository.save(service);
                    }
                }
            }
        }

        // Tải lại tour từ database để có tất cả các mối quan hệ
        return tourRepository.findById(tourId).orElse(savedTour);
    }

    public TourEntity updateTour(Long tourId, String name,
                                 String description, MultipartFile mainImage,
                                 LocalDateTime startDate, LocalDateTime endDate,
                                 Integer maxQuantity, List<TourPriceEntity> prices,
                                 String approvalStatus, List<Long> typeOfTourIds,
                                 List<MultipartFile> additionalImages, List<Long> destinationIds,
                                 List<String> itineraryStrings, List<ServiceDTO> serviceDTOList) {
        Optional<TourEntity> existingTourOptional = tourRepository.findById(tourId);
        if (existingTourOptional.isPresent()) {
            TourEntity existingTour = existingTourOptional.get();
            System.out.println("Processing update for tour: " + tourId + " - " + name);

            // Cập nhật thông tin tour
            existingTour.setName(name);
            existingTour.setDescription(description);
            existingTour.setApprovalStatus(approvalStatus);
            existingTour.setStartDate(startDate);
            existingTour.setEndDate(endDate);
            existingTour.setMaxQuantity(maxQuantity);
            if (typeOfTourIds != null) {
                List<TypeOfTourEntity> types = typeOfTourRepository.findAllById(typeOfTourIds);
                existingTour.setTypeOfTourEntities(types);
            }

            // Lưu tour trước khi xử lý các mối quan hệ
            existingTour = tourRepository.save(existingTour);

            // Xử lý hình ảnh - giờ đã chuyển sang TourImageService
            if (mainImage != null && !mainImage.isEmpty()) {
                tourImageService.addMainImageToTour(existingTour, mainImage);
            }

            if (additionalImages != null && !additionalImages.isEmpty()) {
                tourImageService.addImagesToTour(existingTour, additionalImages);
            }

            // Xử lý itineraries
            if (itineraryStrings != null && !itineraryStrings.isEmpty()) {
                // Xóa itineraries cũ
                List<ItineraryEntity> oldItineraries = itineraryRepository.findByTour(existingTour);
                for (ItineraryEntity oldItinerary : oldItineraries) {
                    itineraryRepository.delete(oldItinerary);
                }

                // Thêm itineraries mới
                for (String itineraryString : itineraryStrings) {
                    ItineraryEntity itinerary = new ItineraryEntity();
                    itinerary.setItinerary(itineraryString);
                    itinerary.setTour(existingTour);
                    itineraryRepository.save(itinerary);
                }
            }

            // Xử lý tour prices
            try {
                // Xóa tất cả các giá cũ của tour bằng native query để tránh lỗi Optimistic Locking
                tourPriceRepository.deleteAllByTourId(existingTour.getId());

                // Thêm các giá mới
                if (prices != null && !prices.isEmpty()) {
                    List<TourPriceEntity> newPrices = new ArrayList<>();
                    for (TourPriceEntity price : prices) {
                        if (price != null) {
                            // Tạo mới hoàn toàn đối tượng TourPriceEntity
                            TourPriceEntity newPrice = new TourPriceEntity();
                            newPrice.setName(price.getName());
                            newPrice.setPrice(price.getPrice());
                            newPrice.setDescription(price.getDescription());
                            newPrice.setTour(existingTour);
                            newPrices.add(newPrice);
                        }
                    }

                    // Lưu tất cả cùng một lúc
                    if (!newPrices.isEmpty()) {
                        tourPriceRepository.saveAll(newPrices);
                    }
                }
            } catch (Exception e) {
                System.err.println("Error handling tour prices: " + e.getMessage());
                e.printStackTrace();
                // Vẫn cho phép hoàn thành quá trình update tour mặc dù có lỗi với giá
            }

            // Xử lý services
            System.out.println("Services before processing: " + (existingTour.getTourServices() != null ? existingTour.getTourServices().size() : "null"));
            existingTour.getTourServices().clear();
            System.out.println("Services after clearing: " + existingTour.getTourServices().size());

            List<ServiceEntity> oldServices = serviceRepository.findByTour(existingTour);
            System.out.println("Found " + oldServices.size() + " old services to delete");
            for (ServiceEntity oldService : oldServices) {
                serviceRepository.delete(oldService);
            }

            if (serviceDTOList != null) {
                System.out.println("Processing " + serviceDTOList.size() + " new services");
                int validServiceCount = 0;
                for (ServiceDTO serviceDTO : serviceDTOList) {
                    if (serviceDTO != null) {
                        System.out.println("Processing service: " + serviceDTO.getName() + ", typeOfTourId: " + serviceDTO.getTypeOfTourId());
                    }

                    if (serviceDTO != null && serviceDTO.getTypeOfTourId() != null) {
                        ServiceEntity service = new ServiceEntity();
                        service.setTour(existingTour);
                        Optional<TypeOfServiceEntity> typeOfServiceS = typeOfServiceRepository.findById(serviceDTO.getTypeOfTourId());
                        if (typeOfServiceS.isPresent()) {
                            validServiceCount++;
                            service.setTypeOfService(typeOfServiceS.get());
                            service.setName(serviceDTO.getName());
                            service.setDescription(serviceDTO.getDescription());
                            service.setPrice(serviceDTO.getPrice());
                            service.setAvailable(serviceDTO.isAvailable());
                            serviceRepository.save(service);
                            System.out.println("Saved service: " + service.getName() + " with ID: " + service.getId());
                        } else {
                            System.out.println("TypeOfService not found for ID: " + serviceDTO.getTypeOfTourId());
                        }
                    } else {
                        System.out.println("Invalid service data: " + (serviceDTO == null ? "null" : "missing typeOfTourId"));
                    }
                }
                System.out.println("Saved " + validServiceCount + " valid services out of " + serviceDTOList.size() + " total");
            } else {
                System.out.println("No services provided (serviceDTOList is null)");
            }

            // Tải lại tour từ database để có tất cả các mối quan hệ
            return tourRepository.findById(tourId).orElse(existingTour);
        }
        return null; // Nếu tour không tồn tại, trả về null
    }
}
