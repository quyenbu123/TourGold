package dev.tin.tour_back.security;

import dev.tin.tour_back.repository.TourRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("tourSecurity")
@RequiredArgsConstructor
public class TourSecurity {
    private final TourRepository tourRepository;

    public boolean isOwner(Long tourId, Authentication authentication) {
        if (tourId == null || authentication == null || authentication.getPrincipal() == null) return false;
        Object principal = authentication.getPrincipal();
        Long userId = null;
        try {
            // Try to read via our UserPrincipal used in app
            userId = (Long) principal.getClass().getMethod("getUserId").invoke(principal);
        } catch (Exception ignored) {}
        if (userId == null) return false;
        return tourRepository.existsByIdAndOwner_Id(tourId, userId);
    }
}

