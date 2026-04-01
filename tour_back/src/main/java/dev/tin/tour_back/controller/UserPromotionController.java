package dev.tin.tour_back.controller;

import dev.tin.tour_back.entity.PromotionEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.entity.UserPromotionEntity;
import dev.tin.tour_back.service.UserPromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import dev.tin.tour_back.dto.UserPromotionDTO;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user-promotions")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UserPromotionController {

    private final UserPromotionService userPromotionService;

    @PostMapping("/assign")
    public ResponseEntity<UserPromotionEntity> assignPromotionToUser(@RequestParam Long userId, @RequestParam Long promotionId) {
        try {
            UserPromotionEntity userPromotion = userPromotionService.assignPromotionToUser(userId, promotionId);
            return new ResponseEntity<>(userPromotion, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PromotionEntity>> getUserPromotions(@PathVariable Long userId) {
        return ResponseEntity.ok(userPromotionService.getUserPromotions(userId));
    }

    @GetMapping("/promotion/{promotionId}/users")
    public ResponseEntity<List<UserPromotionDTO>> getUsersByPromotionId(@PathVariable Long promotionId) {
        return ResponseEntity.ok(userPromotionService.getUsersByPromotionId(promotionId));
    }

    @DeleteMapping("/remove")
    public ResponseEntity<Void> removePromotionFromUser(@RequestParam Long userId, @RequestParam Long promotionId) {
        userPromotionService.removePromotionFromUser(userId, promotionId);
        return ResponseEntity.noContent().build();
    }
} 