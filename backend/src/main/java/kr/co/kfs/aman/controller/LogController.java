package kr.co.kfs.aman.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/logs")
public class LogController {

    private static final Logger log = LoggerFactory.getLogger(LogController.class);

    @Value("${aman.base-dir}")
    private String baseDir;

    @Value("${spring.application.name:aman}")
    private String appName;

    private File getLogDir() {
        return new File(baseDir, "logs");
    }

    private File getActiveLogFile(File logDir) {
        File f1 = new File(logDir, appName + ".log");
        if (f1.exists()) {
            return f1;
        }
        File f2 = new File(logDir, "aman.log");
        if (f2.exists()) {
            return f2;
        }
        File f3 = new File(logDir, "A-Man.log");
        if (f3.exists()) {
            return f3;
        }
        return f1;
    }

    @GetMapping("/files")
    public ResponseEntity<?> getLogFiles() {
        File logDir = getLogDir();
        List<Map<String, Object>> result = new ArrayList<>();
        if (!logDir.exists()) {
            return ResponseEntity.ok(result);
        }

        File[] files = logDir.listFiles((dir, name) -> name.endsWith(".log") || name.endsWith(".gz"));
        if (files != null) {
            Arrays.sort(files, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));
            for (File f : files) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", f.getName());
                map.put("size", f.length());
                map.put("lastModified", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(f.lastModified())));
                result.add(map);
            }
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/tail")
    public ResponseEntity<String> tailLog(@RequestParam(value = "lines", defaultValue = "500") int lines) {
        File logDir = getLogDir();
        File logFile = getActiveLogFile(logDir);
        if (!logFile.exists() || logFile.length() == 0) {
            return ResponseEntity.ok("로그 기록이 비어있거나 파일이 존재하지 않습니다.");
        }

        try {
            String tailContent = readLastLines(logFile, lines);
            return ResponseEntity.ok(tailContent);
        } catch (IOException e) {
            log.error("로그 tail 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("로그를 읽는 동안 오류가 발생했습니다: " + e.getMessage());
        }
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<?> downloadLogFile(@PathVariable("fileName") String fileName) {
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            return ResponseEntity.badRequest().body("잘못된 로그 파일명입니다.");
        }

        File file = new File(getLogDir(), fileName);
        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("요청하신 로그 파일이 존재하지 않습니다.");
        }

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (fileName.endsWith(".gz")) {
            mediaType = MediaType.parseMediaType("application/x-gzip");
        } else if (fileName.endsWith(".log")) {
            mediaType = MediaType.TEXT_PLAIN;
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(mediaType)
                .body(new FileSystemResource(file));
    }

    private String readLastLines(File file, int numLines) throws IOException {
        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            long fileLength = raf.length();
            if (fileLength == 0) {
                return "";
            }

            // 최대 250KB 분량의 뒤쪽 데이터를 한 번에 읽음 (한글 깨짐 없는 안전한 UTF-8 처리)
            long bytesToRead = Math.min(250 * 1024, fileLength);
            raf.seek(fileLength - bytesToRead);
            byte[] bytes = new byte[(int) bytesToRead];
            raf.readFully(bytes);
            
            String rawString = new String(bytes, StandardCharsets.UTF_8);
            String[] lines = rawString.split("\r?\n");
            
            if (lines.length <= numLines) {
                return rawString;
            } else {
                StringBuilder sb = new StringBuilder();
                for (int i = lines.length - numLines; i < lines.length; i++) {
                    sb.append(lines[i]).append("\n");
                }
                return sb.toString();
            }
        }
    }
}
