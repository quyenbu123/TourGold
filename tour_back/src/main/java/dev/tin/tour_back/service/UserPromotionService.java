package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.PromotionEntity;
import dev.tin.tour_back.entity.UserEntity;
import dev.tin.tour_back.entity.UserPromotionEntity;
import dev.tin.tour_back.entity.UserPromotionEntity.UserPromotionId;
import dev.tin.tour_back.repository.PromotionRepository;
import dev.tin.tour_back.repository.UserPromotionRepository;
import dev.tin.tour_back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import dev.tin.tour_back.dto.UserPromotionDTO;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserPromotionService {

    private final UserPromotionRepository userPromotionRepository;
    private final UserRepository userRepository;
    private final PromotionRepository promotionRepository;

    public UserPromotionEntity assignPromotionToUser(Long userId, Long promotionId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id " + userId));
        PromotionEntity promotion = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new RuntimeException("Promotion not found with id " + promotionId));

        UserPromotionId userPromotionId = new UserPromotionId(userId, promotionId);
        UserPromotionEntity userPromotion = new UserPromotionEntity(userPromotionId, user, promotion);

        return userPromotionRepository.save(userPromotion);
    }

    public List<PromotionEntity> getUserPromotions(Long userId) {
        return userPromotionRepository.findByIdUserId(userId).stream()
                .map(UserPromotionEntity::getPromotion)
                .collect(Collectors.toList());
    }

    public List<UserPromotionDTO> getUsersByPromotionId(Long promotionId) {
        return userPromotionRepository.findByIdPromotionId(promotionId).stream()
                .map(userPromotion -> {
                    UserEntity user = userPromotion.getUser();
                    return new UserPromotionDTO(user.getId(), user.getUsername(), user.getFullName());
                })
                .collect(Collectors.toList());
    }

    public void removePromotionFromUser(Long userId, Long promotionId) {
        UserPromotionId userPromotionId = new UserPromotionId(userId, promotionId);
        userPromotionRepository.deleteById(userPromotionId);
    }
} 