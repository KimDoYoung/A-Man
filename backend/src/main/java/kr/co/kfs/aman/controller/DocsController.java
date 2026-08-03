package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.PageRepository;
import kr.co.kfs.aman.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/docs")
public class DocsController {

    private final FolderRepository folderRepository;
    private final PageRepository pageRepository;

    @Value("${aman.security.encrypt.salt:A-Man-Default-Salt-Key-2026!}")
    private String encryptSalt;

    public DocsController(FolderRepository folderRepository, PageRepository pageRepository) {
        this.folderRepository = folderRepository;
        this.pageRepository = pageRepository;
    }

    @GetMapping("/security/handshake")
    public ResponseEntity<?> handshake(HttpServletRequest request) {
        try {
            String clientIp = SecurityUtil.getClientIp(request);
            long currentBlock = System.currentTimeMillis() / (1000 * 60 * 10); // 10 minutes block
            
            // Calculate dynamic key for current block
            String dynamicKey = SecurityUtil.generateDynamicKey(encryptSalt, clientIp, currentBlock);
            
            // Encrypt dynamic key using STATIC_CLIENT_KEY
            String encryptedKey = SecurityUtil.encrypt(dynamicKey, SecurityUtil.STATIC_CLIENT_KEY);
            
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("encryptedKey", encryptedKey);
            response.put("block", currentBlock);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Handshake failed");
        }
    }

    @GetMapping("/{page_id:\\d+}")
    public ResponseEntity<?> getPageDetail(@PathVariable("page_id") Long pageId, HttpServletRequest request) {
        String blockHeader = request.getHeader("X-Handshake-Block");
        if (blockHeader == null || blockHeader.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Handshake block header missing");
        }

        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent() || !"PUBLISHED".equals(pageOpt.get().getStatus())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }

        try {
            long blockVal = Long.parseLong(blockHeader);
            long currentBlock = System.currentTimeMillis() / (1000 * 60 * 10);
            if (blockVal < currentBlock - 1 || blockVal > currentBlock + 1) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid or expired handshake block");
            }

            String clientIp = SecurityUtil.getClientIp(request);
            String key = SecurityUtil.generateDynamicKey(encryptSalt, clientIp, blockVal);

            java.util.Map<String, Object> encryptedPage = convertToEncryptedMap(pageOpt.get(), key);
            return ResponseEntity.ok(encryptedPage);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid handshake block format");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Encryption failed");
        }
    }

    @GetMapping("/folders")
    public ResponseEntity<?> getFolders(@RequestParam(value = "filter", required = false) String filter) {
        List<Folder> folders;
        if (filter != null && !filter.trim().isEmpty()) {
            folders = folderRepository.findByNameContainingOrNumsContaining(filter, filter);
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
    public ResponseEntity<?> getFolderPages(@PathVariable("folder_id") Long folderId, HttpServletRequest request) {
        String blockHeader = request.getHeader("X-Handshake-Block");
        if (blockHeader == null || blockHeader.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Handshake block header missing");
        }

        try {
            long blockVal = Long.parseLong(blockHeader);
            long currentBlock = System.currentTimeMillis() / (1000 * 60 * 10);
            if (blockVal < currentBlock - 1 || blockVal > currentBlock + 1) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid or expired handshake block");
            }

            String clientIp = SecurityUtil.getClientIp(request);
            String key = SecurityUtil.generateDynamicKey(encryptSalt, clientIp, blockVal);

            List<Page> pages = pageRepository.findByFolderIdAndStatusOrderBySortOrderAsc(folderId, "PUBLISHED");
            java.util.List<java.util.Map<String, Object>> encryptedPages = new java.util.ArrayList<>();
            for (Page p : pages) {
                encryptedPages.add(convertToEncryptedMap(p, key));
            }
            return ResponseEntity.ok(encryptedPages);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid handshake block format");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Encryption failed");
        }
    }

    private java.util.Map<String, Object> convertToEncryptedMap(Page page, String key) throws Exception {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", page.getId());
        map.put("title", page.getTitle());
        map.put("content", SecurityUtil.encrypt(page.getContent(), key));
        map.put("aka", page.getAka());
        map.put("sortOrder", page.getSortOrder());
        map.put("status", page.getStatus());
        map.put("lockUser", page.getLockUser());
        map.put("lockTime", page.getLockTime() != null ? page.getLockTime().toString() : null);
        map.put("lockRole", page.getLockRole());
        map.put("createdAt", page.getCreatedAt() != null ? page.getCreatedAt().toString() : null);
        map.put("updatedAt", page.getUpdatedAt() != null ? page.getUpdatedAt().toString() : null);
        
        if (page.getFolder() != null) {
            java.util.Map<String, Object> folderMap = new java.util.HashMap<>();
            folderMap.put("id", page.getFolder().getId());
            folderMap.put("nums", page.getFolder().getNums());
            folderMap.put("name", page.getFolder().getName());
            folderMap.put("level", page.getFolder().getLevel());
            map.put("folder", folderMap);
        }
        
        return map;
    }

    @GetMapping("/security/ip")
    public ResponseEntity<?> getClientIp(HttpServletRequest request) {
        String ip = SecurityUtil.getClientIp(request);
        return ResponseEntity.ok(java.util.Collections.singletonMap("ip", ip));
    }

    @GetMapping("/security/logout")
    public ResponseEntity<?> forceLogout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok(java.util.Collections.singletonMap("success", true));
    }
}
