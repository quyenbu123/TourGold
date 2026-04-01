package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.HostRegistrationEntity;
import dev.tin.tour_back.entity.HostRegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HostRegistrationRepository extends JpaRepository<HostRegistrationEntity, Long> {
    Optional<HostRegistrationEntity> findTopByUser_IdOrderByRequestDateDesc(Long userId);
    List<HostRegistrationEntity> findAllByStatus(HostRegistrationStatus status);
    boolean existsByUser_IdAndStatus(Long userId, HostRegistrationStatus status);
    Optional<HostRegistrationEntity> findFirstByUser_IdAndStatusOrderByRequestDateDesc(Long userId, HostRegistrationStatus status);
    void deleteByUser_Id(Long userId);
}

