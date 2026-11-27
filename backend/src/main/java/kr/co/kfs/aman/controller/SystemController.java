package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.config.SystemSettings;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;

import java.util.HashMap;
import java.util.Map;

@RestController
public class SystemController {

    // application.properties에서 aman.version 값을 가져옵니다. 
    // 값이 없을 경우를 대비해 :1.0.0 처럼 기본값을 지정할 수 있습니다.
    @Value("${spring.application.version:1.0.0}")
    private String version;

    private final SystemSettings systemSettings;
    private final org.springframework.core.env.Environment environment;

    // 멀티 인스턴스 이름 (aman, aman20 ...) - InstanceEnvironmentListener 가 설정
    @Value("${aman.instance:aman}")
    private String instance;

    // 상단바 색: #RGB, #RRGGBB, #RRGGBBAA 만 허용 (CSS 주입 방지)
    private static final java.util.regex.Pattern COLOR_PATTERN =
            java.util.regex.Pattern.compile("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$");

    public SystemController(SystemSettings systemSettings, org.springframework.core.env.Environment environment) {
        this.systemSettings = systemSettings;
        this.environment = environment;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("version", version);
        status.put("message", "A-Man System is running normally.");
        status.put("timestamp", System.currentTimeMillis());

        status.put("siteName", systemSettings.getOrDefault("SITE_NAME", "A-Man"));
        status.put("siteDescription", systemSettings.getOrDefault("SITE_DESCRIPTION", "AssetERP를 위한 도움말 시스템"));
        status.put("settings", systemSettings.getAll());

        // 멀티 인스턴스 구분 표시 (문서편집 상단바) - docs/multi-instance-설계.md 3.7
        //   aman.instances.<이름>.label        배지 문구 (기본: aman 은 A-Man, 그 외는 인스턴스 이름)
        //   aman.instances.<이름>.topbar-color 상단바 배경색 (기본: 없음 → 화면 기본색)
        status.put("instance", instance);
        String label = environment.getProperty("aman.instances." + instance + ".label");
        if (label == null || label.trim().isEmpty()) {
            label = "aman".equals(instance) ? "A-Man" : instance;
        }
        status.put("instanceLabel", label.trim());
        String color = environment.getProperty("aman.instances." + instance + ".topbar-color");
        status.put("topbarColor", color != null && COLOR_PATTERN.matcher(color.trim()).matches() ? color.trim() : null);

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

    @GetMapping("/ip")
    public Map<String, String> getClientIp(javax.servlet.http.HttpServletRequest request) {
        String[] headers = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_CLIENT_IP",
            "HTTP_X_FORWARDED_FOR"
        };
        String ip = null;
        for (String header : headers) {
            ip = request.getHeader(header);
            if (ip != null && ip.length() != 0 && !"unknown".equalsIgnoreCase(ip)) {
                break;
            }
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        Map<String, String> result = new HashMap<>();
        result.put("ip", ip);
        return result;
    }
}


