package kr.co.kfs.aman.config;

import kr.co.kfs.aman.model.Setting;
import kr.co.kfs.aman.repository.SettingRepository;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SystemSettings {

    private final SettingRepository settingRepository;
    private final Map<String, String> settingsMap = new ConcurrentHashMap<>();

    public SystemSettings(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @PostConstruct
    public void init() {
        try {
            List<Setting> list = settingRepository.findAll();
            settingsMap.clear();
            for (Setting s : list) {
                if (s.getSettingKey() != null) {
                    settingsMap.put(s.getSettingKey(), s.getSettingValue() != null ? s.getSettingValue() : "");
                }
            }
            System.out.println("[SystemSettings] Loaded " + settingsMap.size() + " settings from database.");
        } catch (Exception e) {
            System.err.println("[SystemSettings] Failed to load settings: " + e.getMessage());
        }
    }

    public void reload() {
        init();
    }

    public String get(String key) {
        return settingsMap.get(key);
    }

    public String getOrDefault(String key, String defaultValue) {
        return settingsMap.getOrDefault(key, defaultValue);
    }

    public boolean getBoolean(String key, boolean defaultValue) {
        String val = settingsMap.get(key);
        if (val == null) {
            return defaultValue;
        }
        return "true".equalsIgnoreCase(val.trim());
    }

    public Map<String, String> getAll() {
        return new HashMap<>(settingsMap);
    }
}
