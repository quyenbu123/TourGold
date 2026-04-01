package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.TourEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TourRepository extends JpaRepository<TourEntity, Long> {
    boolean existsByIdAndOwner_Id(Long id, Long ownerId);
    List<TourEntity> findByOwner_Id(Long ownerId);

    @Query("select distinct t from TourEntity t join t.typeOfTourEntities typ " +
        "where typ.id in :typeIds and (t.isDeleted = false or t.isDeleted is null)")
    List<TourEntity> findDisplayedByTypeIds(@Param("typeIds") List<Long> typeIds);

    @Query("select t from TourEntity t where t.id in :ids " +
        "and (t.isDeleted = false or t.isDeleted is null) " +
        "and (t.isDisplayed = true or t.isDisplayed is null)")
    List<TourEntity> findDisplayedByIds(@Param("ids") List<Long> ids);

    // Tìm kiếm tour liên quan theo từ khóa trong tên hoặc mô tả
    List<TourEntity> findTop10ByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String name, String description);
}
