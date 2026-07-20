package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

@Repository
public interface PageRepository extends JpaRepository<Page, Long> {
    List<Page> findByFolderIdOrderBySortOrderAsc(Long folderId);
    List<Page> findByFolderIdAndStatusOrderBySortOrderAsc(Long folderId, String status);
    Optional<Page> findByFolderId(Long folderId);
    Optional<Page> findByAka(String aka);

    @Query("SELECT p FROM Page p WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.aka) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:status IS NULL OR :status = '' OR p.status = :status) " +
           "AND (:lockFilter IS NULL OR :lockFilter = '' OR (:lockFilter = 'LOCKED' AND p.lockUser IS NOT NULL) OR (:lockFilter = 'UNLOCKED' AND p.lockUser IS NULL)) " +
           "ORDER BY p.id DESC")
    List<Page> searchPages(@Param("keyword") String keyword, @Param("status") String status, @Param("lockFilter") String lockFilter);
}
