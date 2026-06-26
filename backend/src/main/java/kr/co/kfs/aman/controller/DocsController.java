package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/docs")
public class DocsController {

    private final FolderRepository folderRepository;
    private final PageRepository pageRepository;

    public DocsController(FolderRepository folderRepository, PageRepository pageRepository) {
        this.folderRepository = folderRepository;
        this.pageRepository = pageRepository;
    }

    @GetMapping("/{page_id}")
    public ResponseEntity<?> getPageDetail(@PathVariable("page_id") Long pageId) {
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent() || !"PUBLISHED".equals(pageOpt.get().getStatus())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        return ResponseEntity.ok(pageOpt.get());
    }

    @GetMapping("/folders")
    public ResponseEntity<?> getFolders(@RequestParam(value = "filter", required = false) String filter) {
        List<Folder> folders;
        if (filter != null && !filter.trim().isEmpty()) {
            folders = folderRepository.findByNameContaining(filter);
        } else {
            // 필터가 없으면 최상위(대분류) 목록 반환
            folders = folderRepository.findByParentIsNullOrderBySortOrderAsc();
        }
        return ResponseEntity.ok(folders);
    }

    @GetMapping("/folders/{folder_id}/sub")
    public ResponseEntity<?> getSubFolders(@PathVariable("folder_id") Long folderId) {
        // 통일된 RESTful 구조 반영: 특정 folderId 하위의 직속 1단계 폴더 목록 반환
        List<Folder> subFolders = folderRepository.findByParentIdOrderBySortOrderAsc(folderId);
        return ResponseEntity.ok(subFolders);
    }

    @GetMapping("/folders/{folder_id}")
    public ResponseEntity<?> getFolderDetail(@PathVariable("folder_id") Long folderId) {
        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 폴더입니다.");
        }
        return ResponseEntity.ok(folderOpt.get());
    }

    @GetMapping("/folders/{folder_id}/hierarchy")
    public ResponseEntity<?> getFolderHierarchy(@PathVariable("folder_id") Long folderId) {
        java.util.List<Folder> hierarchy = new java.util.ArrayList<>();
        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 폴더입니다.");
        }
        
        Folder current = folderOpt.get();
        while (current != null) {
            hierarchy.add(0, current);
            current = current.getParent();
        }
        return ResponseEntity.ok(hierarchy);
    }

    @GetMapping("/folders/{folder_id}/pages")
    public ResponseEntity<?> getFolderPages(@PathVariable("folder_id") Long folderId) {
        // 편의를 위해 특정 폴더 하위의 페이지 리스트 조회 추가
        List<Page> pages = pageRepository.findByFolderIdAndStatusOrderBySortOrderAsc(folderId, "PUBLISHED");
        return ResponseEntity.ok(pages);
    }
}
