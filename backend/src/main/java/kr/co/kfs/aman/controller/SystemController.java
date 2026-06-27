package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Setting;
import kr.co.kfs.aman.repository.SettingRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
public class SystemController {

    // application.properties에서 aman.version 값을 가져옵니다. 
    // 값이 없을 경우를 대비해 :1.0.0 처럼 기본값을 지정할 수 있습니다.
    @Value("${spring.application.version:1.0.0}")
    private String version;

    private final SettingRepository settingRepository;

    public SystemController(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("version", version);
        status.put("message", "A-Man System is running normally.");
        status.put("timestamp", System.currentTimeMillis());

        Optional<Setting> siteNameOpt = settingRepository.findBySettingKey("SITE_NAME");
        status.put("siteName", siteNameOpt.isPresent() ? siteNameOpt.get().getSettingValue() : "A-Man");

        Optional<Setting> siteDescOpt = settingRepository.findBySettingKey("SITE_DESCRIPTION");
        status.put("siteDescription", siteDescOpt.isPresent() ? siteDescOpt.get().getSettingValue() : "AssetERP를 위한 도움말 시스템");

        java.util.List<Setting> allSettings = settingRepository.findAll();
        Map<String, String> settingsMap = new HashMap<>();
        for (Setting s : allSettings) {
            if (s.getSettingKey() != null) {
                settingsMap.put(s.getSettingKey(), s.getSettingValue());
            }
        }
        status.put("settings", settingsMap);

        return status;
    }

    @GetMapping("/history")
    public Object getHistory() {
        try {
            org.springframework.core.io.Resource resource = new org.springframework.core.io.ClassPathResource("history.json");
            if (resource.exists()) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                return mapper.readValue(resource.getInputStream(), Object.class);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return java.util.Collections.emptyList();
    }
}

