package kr.co.kfs.aman.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class SystemController {

    // application.properties에서 aman.version 값을 가져옵니다. 
    // 값이 없을 경우를 대비해 :1.0.0 처럼 기본값을 지정할 수 있습니다.
    @Value("${spring.application.version:1.0.0}")
    private String version;

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("version", version);
        status.put("message", "A-Man System is running normally.");
        status.put("timestamp", System.currentTimeMillis());
        return status;
    }
}
