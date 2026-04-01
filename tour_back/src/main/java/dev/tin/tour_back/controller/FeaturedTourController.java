package dev.tin.tour_back.controller;

import dev.tin.tour_back.model.FeaturedTour;
import dev.tin.tour_back.service.FeaturedTourService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tours")
public class FeaturedTourController {

    @Autowired
    private FeaturedTourService featuredTourService;

    @GetMapping("/featured")
    public List<FeaturedTour> getFeaturedTours() {
        // Return top 5 featured tours
        return featuredTourService.getTopFeaturedTours(5);
    }
}
