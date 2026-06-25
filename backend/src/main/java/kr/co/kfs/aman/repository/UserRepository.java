package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameAndIsActive(String username, Integer isActive);
    List<User> findByIsActive(Integer isActive);
    Optional<User> findByEmail(String email);
}
