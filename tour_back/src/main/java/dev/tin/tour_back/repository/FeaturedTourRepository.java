package dev.tin.tour_back.repository;

import dev.tin.tour_back.model.FeaturedTour;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeaturedTourRepository {
    List<FeaturedTour> getFeaturedTourList();
}
