package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.User;
import kr.co.kfs.aman.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        // admin 권한 검사
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("관리자만 사용자를 추가할 수 있습니다.");
        }
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("이미 존재하는 아이디입니다.");
        }
        if (user.getEmail() != null && userRepository.findByEmail(user.getEmail().trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("이미 존재하는 이메일입니다.");
        }
        user.setIsActive(1);
        User savedUser = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("관리자만 접근 가능합니다.");
        }
        // 활성화된 유저뿐만 아니라 전체 목록을 보거나 조건별 처리
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile() {
        String username = getLoginUsername();
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (!userOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 사용자입니다.");
        }
        return ResponseEntity.ok(userOpt.get());
    }

    @GetMapping("/{user_id}")
    public ResponseEntity<?> getUserDetail(@PathVariable("user_id") Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (!userOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 사용자입니다.");
        }

        User user = userOpt.get();
        if (!isSelf(user.getUsername()) && !isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("조회 권한이 없습니다.");
        }
        return ResponseEntity.ok(user);
    }

    @PatchMapping("/{user_id}")
    public ResponseEntity<?> updateUser(@PathVariable("user_id") Long id, @RequestBody Map<String, String> fields) {
        Optional<User> userOpt = userRepository.findById(id);
        if (!userOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 사용자입니다.");
        }

        User user = userOpt.get();
        boolean isAdmin = isAdmin();
        boolean isSelf = isSelf(user.getUsername());

        if (!isSelf && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("수정 권한이 없습니다.");
        }

        // 비밀번호 수정
        if (fields.containsKey("password")) {
            user.setPassword(fields.get("password"));
        }
        
        // 이메일 수정 (중복 검증 추가)
        if (fields.containsKey("email")) {
            String newEmail = fields.get("email").trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.findByEmail(newEmail).isPresent()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("이미 존재하는 이메일입니다.");
                }
                user.setEmail(newEmail);
            }
        }

        if (isAdmin) {
            // 관리자는 전체 정보 수정 가능
            if (fields.containsKey("name")) {
                user.setName(fields.get("name"));
            }
            if (fields.containsKey("role")) {
                user.setRole(fields.get("role"));
            }
            if (fields.containsKey("isActive")) {
                user.setIsActive(Integer.parseInt(fields.get("isActive")));
            }
        }

        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{user_id}")
    public ResponseEntity<?> deleteUser(@PathVariable("user_id") Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (!userOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 사용자입니다.");
        }

        User user = userOpt.get();
        if (!isSelf(user.getUsername()) && !isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("삭제 권한이 없습니다.");
        }

        // Soft Delete 방식으로 처리 요건 반영 (is_active = 0)
        user.setIsActive(0);
        userRepository.save(user);
        return ResponseEntity.ok("사용자 계정이 비활성화(삭제) 처리되었습니다.");
    }

    private String getLoginUsername() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private boolean isSelf(String username) {
        return getLoginUsername().equals(username);
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }
}
