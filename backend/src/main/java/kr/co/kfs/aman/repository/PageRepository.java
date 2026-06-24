package kr.co.kfs.aman.repository;

import kr.co.kfs.aman.model.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PageRepository extends JpaRepository<Page, Long> {
    List<Page> findByFolderIdOrderBySortOrderAsc(Long folderId);
    Optional<Page> findByFolderId(Long folderId);
    Optional<Page> findByAka(String aka);
}
