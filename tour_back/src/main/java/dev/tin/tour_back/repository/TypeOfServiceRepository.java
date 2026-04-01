package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.TypeOfServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TypeOfServiceRepository extends JpaRepository<TypeOfServiceEntity, Long> {
    Optional<TypeOfServiceEntity> findByName(String name);
}
