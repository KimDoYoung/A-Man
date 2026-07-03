package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.User;
import kr.co.kfs.aman.model.WorkStack;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.UserRepository;
import kr.co.kfs.aman.repository.WorkStackRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin/work-stack")
public class WorkStackController {

    private final WorkStackRepository workStackRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;

    public WorkStackController(
            WorkStackRepository workStackRepository,
            UserRepository userRepository,
            FolderRepository folderRepository) {
        this.workStackRepository = workStackRepository;
        this.userRepository = userRepository;
        this.folderRepository = folderRepository;
    }

    private User getLoginUser() {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(username).orElse(null);
    }

    @GetMapping
    public ResponseEntity<?> getWorkStack() {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        List<WorkStack> stack = workStackRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Map<String, Object>> response = new ArrayList<>();
        
        for (WorkStack item : stack) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", item.getFolder().getId());
            map.put("name", item.getFolder().getName());
            map.put("nums", item.getFolder().getNums());
            
            // Convert LocalDateTime to Epoch Millis
            if (item.getCreatedAt() != null) {
                long epochMillis = item.getCreatedAt()
                        .atZone(ZoneId.systemDefault())
                        .toInstant()
                        .toEpochMilli();
                map.put("timestamp", epochMillis);
            } else {
                map.put("timestamp", System.currentTimeMillis());
            }
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{folder_id}")
    public ResponseEntity<?> pushToStack(@PathVariable("folder_id") Long folderId) {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 메뉴 카테고리입니다.");
        }
        Folder folder = folderOpt.get();

        // 1. Upsert
        Optional<WorkStack> existingOpt = workStackRepository.findByUserIdAndFolderId(user.getId(), folder.getId());
        WorkStack workStack;
        if (existingOpt.isPresent()) {
            workStack = existingOpt.get();
            workStack.setCreatedAt(LocalDateTime.now());
        } else {
            workStack = WorkStack.builder()
                    .user(user)
                    .folder(folder)
                    .createdAt(LocalDateTime.now())
                    .build();
        }
        workStackRepository.save(workStack);

        // 2. Rotation
        List<WorkStack> history = workStackRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        if (history.size() > 10) {
            List<WorkStack> toDelete = history.subList(10, history.size());
            workStackRepository.deleteAll(toDelete);
        }

        return ResponseEntity.ok("작업 이력이 추가되었습니다.");
    }

    @DeleteMapping("/{folder_id}")
    public ResponseEntity<?> removeFromStack(@PathVariable("folder_id") Long folderId) {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        Optional<WorkStack> existingOpt = workStackRepository.findByUserIdAndFolderId(user.getId(), folderId);
        if (existingOpt.isPresent()) {
            workStackRepository.delete(existingOpt.get());
            return ResponseEntity.ok("선택한 작업 이력이 삭제되었습니다.");
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("작업 이력을 찾을 수 없습니다.");
    }

    @DeleteMapping
    public ResponseEntity<?> clearStack() {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        List<WorkStack> stack = workStackRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        workStackRepository.deleteAll(stack);
        return ResponseEntity.ok("모든 작업 이력이 비워졌습니다.");
    }
}
