package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin/page-list")
public class AdminPageController {

    private final PageRepository pageRepository;

    public AdminPageController(PageRepository pageRepository) {
        this.pageRepository = pageRepository;
    }

    @GetMapping
    public ResponseEntity<?> getPages(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "lockFilter", required = false) String lockFilter) {
        
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("관리자 권한이 필요합니다.");
        }
        
        List<Page> pages = pageRepository.searchPages(keyword, status, lockFilter);
        return ResponseEntity.ok(pages);
    }

    @PostMapping("/{page_id}/status")
    public ResponseEntity<?> updatePageStatus(
            @PathVariable("page_id") Long pageId,
            @RequestBody Map<String, String> body) {
        
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("관리자 권한이 필요합니다.");
        }
        
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        
        Page page = pageOpt.get();
        String status = body.get("status");
        if (!"DRAFT".equals(status) && !"PUBLISHED".equals(status)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("올바르지 않은 상태 값입니다. (DRAFT, PUBLISHED 중 하나여야 합니다.)");
        }
        
        page.setStatus(status);
        Page savedPage = pageRepository.save(page);
        return ResponseEntity.ok(savedPage);
    }

    @PostMapping("/{page_id}/lock-toggle")
    public ResponseEntity<?> togglePageLock(@PathVariable("page_id") Long pageId) {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("관리자 권한이 필요합니다.");
        }
        
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        
        Page page = pageOpt.get();
        String currentUsername = getLoginUsername();
        if (currentUsername == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        
        if (page.getLockUser() == null) {
            // 잠금 설정
            page.setLockUser(currentUsername);
            page.setLockTime(LocalDateTime.now());
            page.setLockRole("admin");
        } else {
            // 잠금 해제
            page.setLockUser(null);
            page.setLockTime(null);
            page.setLockRole(null);
        }
        
        Page savedPage = pageRepository.save(page);
        return ResponseEntity.ok(savedPage);
    }

    private String getLoginUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof String && !"anonymousUser".equals(principal)) {
            return (String) principal;
        }
        return null;
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }
}
