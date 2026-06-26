package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Setting;
import kr.co.kfs.aman.repository.SettingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/admin/settings")
public class SettingController {

    private final SettingRepository settingRepository;

    public SettingController(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @GetMapping
    public ResponseEntity<?> getSettings() {
        List<Setting> settings = settingRepository.findAll();
        return ResponseEntity.ok(settings);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateSetting(@PathVariable("id") Long id, @RequestBody Setting settingRequest) {
        Optional<Setting> existingOpt = settingRepository.findById(id);
        if (!existingOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 설정 항목입니다.");
        }

        Setting existing = existingOpt.get();
        existing.setSettingValue(settingRequest.getSettingValue());

        Setting saved = settingRepository.save(existing);
        return ResponseEntity.ok(saved);
    }
}
