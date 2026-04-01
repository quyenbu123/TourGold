package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.FavoriteEntity;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.repository.FavoriteRepository;
import dev.tin.tour_back.repository.TourRepository;
import dev.tin.tour_back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import dev.tin.tour_back.dto.FavoriteDTO;

@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final TourRepository tourRepository;

    public List<FavoriteDTO> getUserFavorites(Long userId) {
        List<FavoriteEntity> favorites = favoriteRepository.findByUserId(userId);
        return favorites.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private FavoriteDTO convertToDto(FavoriteEntity favorite) {
        TourEntity tour = favorite.getTour();
        String imageUrl = null;
        if (tour != null && tour.getImages() != null && !tour.getImages().isEmpty()) {
            // Assuming TourEntity has a getImages() method returning a List<TourImageEntity>
            // and TourImageEntity has a getUrl() method
            imageUrl = tour.getImages().get(0).getUrl();
        }
        return FavoriteDTO.builder()
                .id(favorite.getId())
                .userId(favorite.getUser().getId())
                .tourId(tour.getId())
                .tourName(tour.getName())
                .tourDescription(tour.getDescription())
                .tourPrice(tour.getTourPrices() != null && !tour.getTourPrices().isEmpty() ? tour.getTourPrices().get(0).getPrice() : null) // Assuming getTourPrices returns List<TourPriceEntity>
                .tourImageUrl(imageUrl)
                .createdAt(favorite.getCreatedAt())
                .build();
    }

    @Transactional
    public FavoriteEntity addToFavorites(Long userId, Long tourId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        TourEntity tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        if (favoriteRepository.existsByUserAndTour(user, tour)) {
            throw new RuntimeException("Tour is already in favorites");
        }

        FavoriteEntity favorite = new FavoriteEntity();
        favorite.setUser(user);
        favorite.setTour(tour);
        return favoriteRepository.save(favorite);
    }

    @Transactional
    public void removeFromFavorites(Long userId, Long tourId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        TourEntity tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        favoriteRepository.deleteByUserAndTour(user, tour);
    }

    public boolean isFavorite(Long userId, Long tourId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        TourEntity tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        return favoriteRepository.existsByUserAndTour(user, tour);
    }
} 