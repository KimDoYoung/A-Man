package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByParentIsNullOrderBySortOrderAsc();

    @Query("SELECT f FROM Folder f WHERE f.parent.id = :parentId ORDER BY f.sortOrder ASC")
    List<Folder> findByParentIdOrderBySortOrderAsc(@Param("parentId") Long parentId);

    List<Folder> findByNameContaining(String keyword);
}
