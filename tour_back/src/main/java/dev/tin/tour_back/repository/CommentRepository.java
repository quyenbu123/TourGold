package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.CommentEntity;
import dev.tin.tour_back.entity.CommentId;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<CommentEntity, CommentId> {
    List<CommentEntity> findByTourId(Long tourId);
    void deleteByUser_Id(Long userId);
    void deleteByTour_Id(Long tourId);
}
