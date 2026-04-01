package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.TypeOfTourEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TypeOfTourRepository extends JpaRepository<TypeOfTourEntity, Long> {
    Optional<TypeOfTourEntity> findByName(String name);
}
