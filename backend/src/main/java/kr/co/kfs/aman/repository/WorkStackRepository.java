package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.WorkStack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkStackRepository extends JpaRepository<WorkStack, Long> {
    List<WorkStack> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<WorkStack> findByUserIdAndFolderId(Long userId, Long folderId);

    @Modifying
    @Query("DELETE FROM WorkStack w WHERE w.folder.id = :folderId")
    void deleteByFolderId(@Param("folderId") Long folderId);
}
