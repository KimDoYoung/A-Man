package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.ImageWork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImageWorkRepository extends JpaRepository<ImageWork, Long> {
    List<ImageWork> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
