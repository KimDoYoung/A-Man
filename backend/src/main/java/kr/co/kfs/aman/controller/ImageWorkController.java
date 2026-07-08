package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.ImageWork;
import kr.co.kfs.aman.model.User;
import kr.co.kfs.aman.repository.ImageWorkRepository;
import kr.co.kfs.aman.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
@RequestMapping("/admin/image-work")
public class ImageWorkController {

    private final ImageWorkRepository imageWorkRepository;
    private final UserRepository userRepository;

    public ImageWorkController(ImageWorkRepository imageWorkRepository, UserRepository userRepository) {
        this.imageWorkRepository = imageWorkRepository;
        this.userRepository = userRepository;
    }

    private User getLoginUser() {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(username).orElse(null);
    }

    @GetMapping
    public ResponseEntity<?> getImageWorks() {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        long totalCount = imageWorkRepository.countByUserId(user.getId());
        List<ImageWork> list = imageWorkRepository.findTop200ByUserIdOrderByUpdatedAtDesc(user.getId());
        List<Map<String, Object>> responseList = new ArrayList<>();

        for (ImageWork item : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", item.getId());
            map.put("title", item.getTitle());
            map.put("jsonData", item.getJsonData());
            
            if (item.getUpdatedAt() != null) {
                long epochMillis = item.getUpdatedAt()
                        .atZone(ZoneId.systemDefault())
                        .toInstant()
                        .toEpochMilli();
                map.put("updatedAt", epochMillis);
            }
            responseList.add(map);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalCount", totalCount);
        response.put("list", responseList);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> saveImageWork(@RequestBody Map<String, Object> body) {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        String title = (String) body.get("title");
        String jsonData = (String) body.get("jsonData");

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("작업 제목(title)은 필수입니다.");
        }
        if (jsonData == null || jsonData.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("편집 상태(jsonData)는 필수입니다.");
        }

        Long id = null;
        if (body.containsKey("id") && body.get("id") != null) {
            id = Long.valueOf(body.get("id").toString());
        }

        ImageWork imageWork;
        if (id != null) {
            Optional<ImageWork> existingOpt = imageWorkRepository.findById(id);
            if (!existingOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 이미지 작업입니다.");
            }
            imageWork = existingOpt.get();
            // 소유권 검사
            if (!imageWork.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("본인의 이미지 작업만 수정할 수 있습니다.");
            }
            imageWork.setTitle(title.trim());
            imageWork.setJsonData(jsonData);
            imageWork.setUpdatedAt(LocalDateTime.now());
        } else {
            imageWork = ImageWork.builder()
                    .user(user)
                    .title(title.trim())
                    .jsonData(jsonData)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
        }

        ImageWork saved = imageWorkRepository.save(imageWork);
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("title", saved.getTitle());
        response.put("jsonData", saved.getJsonData());
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteImageWork(@PathVariable("id") Long id) {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        int deletedCount = imageWorkRepository.deleteByIdNative(id);
        if (deletedCount == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 이미지 작업입니다.");
        }

        return ResponseEntity.ok("이미지 작업이 성공적으로 삭제되었습니다.");
    }
}
