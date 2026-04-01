package dev.tin.tour_back.service;

import dev.tin.tour_back.entity.TypeOfServiceEntity;
import dev.tin.tour_back.repository.TypeOfServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TypeOfServiceService {
    
    private final TypeOfServiceRepository typeOfServiceRepository;

    public List<TypeOfServiceEntity> getAllTypeOfServices() {
        return typeOfServiceRepository.findAll();
    }

    public void deleteTypeOfService(Long typeOfServiceId) {
        typeOfServiceRepository.deleteById(typeOfServiceId);
    }

    public TypeOfServiceEntity addTypeOfService(String name) {
        TypeOfServiceEntity typeOfServiceEntity = new TypeOfServiceEntity();
        typeOfServiceEntity.setName(name);
        return typeOfServiceRepository.save(typeOfServiceEntity);
    }
}
