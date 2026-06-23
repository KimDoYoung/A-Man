package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByParentIsNullOrderBySortOrderAsc();
    List<Folder> findByParentIdOrderBySortOrderAsc(Long parentId);
    List<Folder> findByNameContaining(String keyword);
}
