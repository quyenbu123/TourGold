package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.PromotionEntity;
import dev.tin.tour_back.entity.UserPromotionEntity;
import dev.tin.tour_back.repository.PromotionRepository;
import dev.tin.tour_back.repository.UserPromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final UserPromotionRepository userPromotionRepository;

    public List<PromotionEntity> getAllPromotions() {
        return promotionRepository.findAll();
    }

    public Optional<PromotionEntity> getPromotionById(Long id) {
        return promotionRepository.findById(id);
    }

    public PromotionEntity createPromotion(PromotionEntity promotion) {
        return promotionRepository.save(promotion);
    }

    public PromotionEntity updatePromotion(Long id, PromotionEntity promotionDetails) {
        Optional<PromotionEntity> optionalPromotion = promotionRepository.findById(id);
        if (optionalPromotion.isPresent()) {
            PromotionEntity promotion = optionalPromotion.get();
            promotion.setName(promotionDetails.getName());
            promotion.setDescription(promotionDetails.getDescription());
            promotion.setStartDate(promotionDetails.getStartDate());
            promotion.setEndDate(promotionDetails.getEndDate());
            promotion.setDiscountAmount(promotionDetails.getDiscountAmount());
            promotion.setEligibilityCriteria(promotionDetails.getEligibilityCriteria());
            promotion.setStatus(promotionDetails.getStatus());
            return promotionRepository.save(promotion);
        } else {
            throw new RuntimeException("Promotion not found with id " + id);
        }
    }

    public void deletePromotion(Long id) {
        promotionRepository.deleteById(id);
    }

    public PromotionEntity validateAndApplyPromotion(Long userId, Long promotionId, Double orderAmount) {
        // Check if user has been assigned this promotion
        Optional<UserPromotionEntity> userPromotion = userPromotionRepository.findById_UserIdAndId_PromotionId(userId, promotionId);
        if (!userPromotion.isPresent()) {
            throw new RuntimeException("You don't have access to this promotion");
        }

        Optional<PromotionEntity> promotionOpt = promotionRepository.findById(promotionId);
        if (!promotionOpt.isPresent()) {
            throw new RuntimeException("Invalid promotion");
        }

        PromotionEntity promotion = promotionOpt.get();
        LocalDateTime now = LocalDateTime.now();

        // Check if promotion is active
        if (!"ACTIVE".equals(promotion.getStatus())) {
            throw new RuntimeException("Promotion is not active");
        }

        // Check if promotion is within valid date range
        if (now.isBefore(promotion.getStartDate()) || now.isAfter(promotion.getEndDate())) {
            throw new RuntimeException("Promotion is not valid at this time");
        }

        // Check if order amount meets eligibility criteria
        if (promotion.getEligibilityCriteria() != null && !promotion.getEligibilityCriteria().isEmpty()) {
            try {
                Double minAmount = Double.parseDouble(promotion.getEligibilityCriteria());
                if (orderAmount < minAmount) {
                    throw new RuntimeException("Order amount does not meet promotion criteria");
                }
            } catch (NumberFormatException e) {
                // If eligibility criteria is not a number, ignore it
            }
        }

        return promotion;
    }
} 