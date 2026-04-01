package dev.tin.tour_back.repository;

import dev.tin.tour_back.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByResetPasswordToken(String resetPasswordToken);

    List<UserEntity> findAllByEmail(String email);

}
