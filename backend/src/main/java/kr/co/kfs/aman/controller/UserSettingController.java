package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.User;
import kr.co.kfs.aman.model.UserSetting;
import kr.co.kfs.aman.repository.UserRepository;
import kr.co.kfs.aman.repository.UserSettingRepository;
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
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin/user-settings")
public class UserSettingController {

    private final UserSettingRepository userSettingRepository;
    private final UserRepository userRepository;

    public UserSettingController(UserSettingRepository userSettingRepository, UserRepository userRepository) {
        this.userSettingRepository = userSettingRepository;
        this.userRepository = userRepository;
    }

    private User getLoginUser() {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(username).orElse(null);
    }

    @GetMapping("/{key}")
    public ResponseEntity<?> getUserSetting(@PathVariable("key") String key) {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        Optional<UserSetting> settingOpt = userSettingRepository.findBySettingKey(key);
        if (!settingOpt.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("key", key);
            response.put("value", null);
            return ResponseEntity.ok(response);
        }

        UserSetting setting = settingOpt.get();
        // 소유권 확인
        if (!setting.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("본인의 설정 정보만 조회할 수 있습니다.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("key", setting.getSettingKey());
        response.put("value", setting.getSettingValue());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> saveUserSetting(@RequestBody Map<String, Object> body) {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        String key = (String) body.get("key");
        String value = (String) body.get("value");
        String note = (String) body.get("note");

        if (key == null || key.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("설정 키(key)는 필수입니다.");
        }

        Optional<UserSetting> existingOpt = userSettingRepository.findBySettingKey(key);
        UserSetting userSetting;

        if (existingOpt.isPresent()) {
            userSetting = existingOpt.get();
            // 소유권 확인
            if (!userSetting.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("본인의 설정 정보만 수정할 수 있습니다.");
            }
            userSetting.setSettingValue(value);
            userSetting.setNote(note);
            userSetting.setUpdatedAt(LocalDateTime.now());
        } else {
            userSetting = UserSetting.builder()
                    .user(user)
                    .settingKey(key)
                    .settingValue(value)
                    .note(note)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
        }

        UserSetting saved = userSettingRepository.save(userSetting);
        Map<String, Object> response = new HashMap<>();
        response.put("key", saved.getSettingKey());
        response.put("value", saved.getSettingValue());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{key}")
    @Transactional
    public ResponseEntity<?> deleteUserSetting(@PathVariable("key") String key) {
        User user = getLoginUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("인증된 사용자를 찾을 수 없습니다.");
        }

        Optional<UserSetting> settingOpt = userSettingRepository.findBySettingKey(key);
        if (!settingOpt.isPresent()) {
            return ResponseEntity.ok().body("설정이 이미 존재하지 않습니다.");
        }

        UserSetting setting = settingOpt.get();
        // 소유권 확인
        if (!setting.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("본인의 설정 정보만 삭제할 수 있습니다.");
        }

        userSettingRepository.delete(setting);
        return ResponseEntity.ok().body("설정이 성공적으로 삭제되었습니다.");
    }
}
