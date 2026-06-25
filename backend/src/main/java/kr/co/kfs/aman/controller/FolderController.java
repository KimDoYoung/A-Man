package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/folder")
public class FolderController {

    private final FolderRepository folderRepository;
    private final PageRepository pageRepository;

    public FolderController(FolderRepository folderRepository, PageRepository pageRepository) {
        this.folderRepository = folderRepository;
        this.pageRepository = pageRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createFolder(@RequestBody java.util.Map<String, Object> body) {
        String name = (String) body.get("name");
        String nums = (String) body.get("nums");
        Integer level = (Integer) body.get("level");
        Integer sortOrder = (Integer) body.get("sortOrder");
        Long parentId = body.get("parentId") != null ? Long.valueOf(body.get("parentId").toString()) : null;

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("폴더 이름은 필수입니다.");
        }

        Folder parent = null;
        if (parentId != null) {
            Optional<Folder> parentOpt = folderRepository.findById(parentId);
            if (!parentOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("지정한 부모 폴더가 존재하지 않습니다.");
            }
            parent = parentOpt.get();
        }

        Folder folder = Folder.builder()
                .name(name.trim())
                .nums(nums != null ? nums.trim() : "")
                .level(level != null ? level : 1)
                .sortOrder(sortOrder != null ? sortOrder : 0)
                .parent(parent)
                .build();

        Folder saved = folderRepository.save(folder);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PatchMapping("/{folder_id}")
    @Transactional
    public ResponseEntity<?> updateFolder(@PathVariable("folder_id") Long folderId, @RequestBody java.util.Map<String, Object> body) {
        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 폴더입니다.");
        }

        Folder folder = folderOpt.get();
        if (body.containsKey("name")) {
            String name = (String) body.get("name");
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("폴더 이름은 비워둘 수 없습니다.");
            }
            folder.setName(name.trim());
        }
        if (body.containsKey("nums")) {
            String nums = (String) body.get("nums");
            folder.setNums(nums != null ? nums.trim() : "");
        }
        if (body.containsKey("sortOrder")) {
            folder.setSortOrder(Integer.parseInt(body.get("sortOrder").toString()));
        }
        if (body.containsKey("level")) {
            folder.setLevel(Integer.parseInt(body.get("level").toString()));
        }
        if (body.containsKey("parentId")) {
            Object pVal = body.get("parentId");
            if (pVal == null) {
                folder.setParent(null);
            } else {
                Long parentId = Long.valueOf(pVal.toString());
                Optional<Folder> parentOpt = folderRepository.findById(parentId);
                if (parentOpt.isPresent()) {
                    folder.setParent(parentOpt.get());
                }
            }
        }

        Folder saved = folderRepository.save(folder);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{folder_id}")
    @Transactional
    public ResponseEntity<?> deleteFolder(@PathVariable("folder_id") Long folderId) {
        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 폴더입니다.");
        }

        Folder folder = folderOpt.get();
        deleteFolderRecursive(folder);
        folderRepository.delete(folder);

        return ResponseEntity.ok("폴더와 모든 하위 항목이 삭제되었습니다.");
    }

    private void deleteFolderRecursive(Folder folder) {
        // 1. 해당 폴더 하위에 연결된 모든 페이지(manual 내용) 삭제
        List<Page> pages = pageRepository.findByFolderIdOrderBySortOrderAsc(folder.getId());
        if (pages != null && !pages.isEmpty()) {
            pageRepository.deleteAll(pages);
        }
        
        // 2. 자식 폴더들 재귀 삭제
        for (Folder child : folder.getChildren()) {
            deleteFolderRecursive(child);
        }
    }

    @PostMapping("/regenerate-all")
    @Transactional
    public ResponseEntity<?> regenerateAllNumbers() {
        List<Folder> roots = folderRepository.findByParentIsNullOrderBySortOrderAsc();
        int rootIndex = 1;
        for (Folder root : roots) {
            rebuildFolderRecursive(root, null, rootIndex);
            rootIndex++;
        }
        return ResponseEntity.ok("전체 메뉴의 번호(nums) 및 정렬 순서가 성공적으로 재생성되었습니다.");
    }

    private void rebuildFolderRecursive(Folder folder, String parentNums, int sequence) {
        String currentNums = parentNums == null ? String.valueOf(sequence) : parentNums + "." + sequence;
        folder.setNums(currentNums);
        folder.setSortOrder(sequence * 10);
        folderRepository.save(folder);

        List<Folder> children = folderRepository.findByParentIdOrderBySortOrderAsc(folder.getId());
        int childIndex = 1;
        for (Folder child : children) {
            rebuildFolderRecursive(child, currentNums, childIndex);
            childIndex++;
        }
    }
}
