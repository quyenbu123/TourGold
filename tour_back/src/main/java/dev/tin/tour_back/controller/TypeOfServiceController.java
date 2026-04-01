package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.TypeOfServiceEntity;
import dev.tin.tour_back.service.TypeOfServiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/type-of-services")
public class TypeOfServiceController {
    @Autowired
    private TypeOfServiceService typeOfServiceService;

    @GetMapping
    public ResponseEntity<List<TypeOfServiceEntity>> getAllTypeOfServices() {
        try {
            List<TypeOfServiceEntity> services = typeOfServiceService.getAllTypeOfServices();
            System.out.println("Found " + services.size() + " service types");
            return new ResponseEntity<>(services, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error getting all service types: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeOfServiceEntity> addTypeOfService(@RequestBody Map<String, Object> payload) {
        System.out.println("Received type of service payload: " + payload);
        
        try {
            String name = payload.containsKey("name") ? payload.get("name").toString() : "";
            
            if (name.isEmpty()) {
                System.out.println("Service type name cannot be empty");
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            TypeOfServiceEntity typeOfService = typeOfServiceService.addTypeOfService(name);
            System.out.println("Successfully created service type with id: " + typeOfService.getId());
            return new ResponseEntity<>(typeOfService, HttpStatus.CREATED);
        } catch (Exception e) {
            System.out.println("Error creating service type: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteTypeOfService(@PathVariable Long id) {
        try {
            typeOfServiceService.deleteTypeOfService(id);
            System.out.println("Successfully deleted service type with id: " + id);
            return new ResponseEntity<>("Type of service deleted successfully", HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error deleting service type with id " + id + ": " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Error deleting service type: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
