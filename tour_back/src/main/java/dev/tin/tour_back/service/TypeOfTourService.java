package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.TypeOfTourEntity;
import dev.tin.tour_back.repository.TypeOfTourRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TypeOfTourService {
    private final TypeOfTourRepository typeOfTourRepository;

    public List<TypeOfTourEntity> getAllTypeOfTours() {
        return typeOfTourRepository.findAll();
    }

    public void deleteTypeOfTour(Long typeOfTourId) {
        typeOfTourRepository.deleteById(typeOfTourId);
    }

    public TypeOfTourEntity addTypeOfTour(String name) {
        TypeOfTourEntity typeOfTourEntity = new TypeOfTourEntity();
        typeOfTourEntity.setName(name);
        return typeOfTourRepository.save(typeOfTourEntity);
    }
}
