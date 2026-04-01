package dev.tin.tour_back.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user")  // Chỉ định đây là entity của MySQL
@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class UserEntity {
    @Id// ID tự tăng
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;
    
    private String username;
    
    private String fullName;

    private String password;

    private String extraInfo;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String resetPasswordToken;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private LocalDateTime resetPasswordTokenExpiry;

    @ManyToMany(fetch = FetchType.EAGER, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(name = "user_role", joinColumns = @JoinColumn(name = "user_id", referencedColumnName = "id"),
            inverseJoinColumns = @JoinColumn(name = "role_id", referencedColumnName = "id"))
    private List<RoleEntity> roles = new ArrayList<>();

    @OneToMany(mappedBy = "user")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.List<BookingEntity> bookings;
}
