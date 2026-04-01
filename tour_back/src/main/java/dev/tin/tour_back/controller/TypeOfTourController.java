package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.TypeOfTourEntity;
import dev.tin.tour_back.service.TypeOfTourService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/type-of-tours")
public class TypeOfTourController {
    @Autowired
    private TypeOfTourService typeOfTourService;

    @GetMapping
    public ResponseEntity<List<TypeOfTourEntity>> getAllTypeOfTours() {
        try {
            List<TypeOfTourEntity> types = typeOfTourService.getAllTypeOfTours();
            System.out.println("Found " + types.size() + " tour types");
            return new ResponseEntity<>(types, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error getting all tour types: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeOfTourEntity> addTypeOfTour(@RequestBody Map<String, Object> payload) {
        System.out.println("Received type of tour payload: " + payload);
        
        try {
            String name = payload.containsKey("name") ? payload.get("name").toString() : "";
            
            if (name.isEmpty()) {
                System.out.println("Tour type name cannot be empty");
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            TypeOfTourEntity typeOfTour = typeOfTourService.addTypeOfTour(name);
            System.out.println("Successfully created tour type with id: " + typeOfTour.getId());
            return new ResponseEntity<>(typeOfTour, HttpStatus.CREATED);
        } catch (Exception e) {
            System.out.println("Error creating tour type: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteTypeOfTour(@PathVariable Long id) {
        try {
            typeOfTourService.deleteTypeOfTour(id);
            System.out.println("Successfully deleted tour type with id: " + id);
            return new ResponseEntity<>("Tour type deleted successfully", HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error deleting tour type with id " + id + ": " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Error deleting tour type: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
