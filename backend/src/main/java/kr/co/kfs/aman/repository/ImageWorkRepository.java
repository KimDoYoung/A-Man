package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.ImageWork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ImageWorkRepository extends JpaRepository<ImageWork, Long> {
    List<ImageWork> findByUserIdOrderByUpdatedAtDesc(Long userId);
    List<ImageWork> findTop200ByUserIdOrderByUpdatedAtDesc(Long userId);
    long countByUserId(Long userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM image_work WHERE id = :id", nativeQuery = true)
    int deleteByIdNative(@Param("id") Long id);
}
