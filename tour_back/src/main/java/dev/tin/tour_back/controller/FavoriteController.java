package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.FavoriteEntity;
import dev.tin.tour_back.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import dev.tin.tour_back.dto.FavoriteDTO;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteService favoriteService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<FavoriteDTO>> getUserFavorites(@PathVariable Long userId) {
        return ResponseEntity.ok(favoriteService.getUserFavorites(userId));
    }

    @PostMapping("/user/{userId}/tour/{tourId}")
    public ResponseEntity<FavoriteEntity> addToFavorites(
            @PathVariable Long userId,
            @PathVariable Long tourId) {
        return ResponseEntity.ok(favoriteService.addToFavorites(userId, tourId));
    }

    @DeleteMapping("/user/{userId}/tour/{tourId}")
    public ResponseEntity<Void> removeFromFavorites(
            @PathVariable Long userId,
            @PathVariable Long tourId) {
        favoriteService.removeFromFavorites(userId, tourId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/user/{userId}/tour/{tourId}")
    public ResponseEntity<Boolean> isFavorite(
            @PathVariable Long userId,
            @PathVariable Long tourId) {
        return ResponseEntity.ok(favoriteService.isFavorite(userId, tourId));
    }
} 