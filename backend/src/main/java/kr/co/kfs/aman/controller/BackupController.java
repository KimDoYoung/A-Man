package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.service.BackupService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/admin/backup")
public class BackupController {

    private final BackupService backupService;

    @Value("${aman.backup.dir}")
    private String backupDir;

    @Value("${aman.backup.cron:0 30 12,23 * * ?}")
    private String backupCron;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    @GetMapping("/last_modify_time")
    public ResponseEntity<String> getLastModifyTime() {
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return ResponseEntity.ok(backupService.getLastModifyTime().format(df));
    }

    @GetMapping("/files")
    public ResponseEntity<?> getBackupFiles() {
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("backupDir", backupDir);
        response.put("backupCron", backupCron);
        response.put("files", backupService.getBackupFiles());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<?> downloadFile(@PathVariable("fileName") String fileName) {
        // 경로 탈취 공격 방지 (Path Traversal Prevention)
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            return ResponseEntity.badRequest().body("잘못된 백업 파일명입니다.");
        }
        
        File file = new File(backupDir, fileName);
        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("지정한 백업 파일이 존재하지 않습니다.");
        }

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (fileName.endsWith(".gz")) {
            mediaType = MediaType.parseMediaType("application/x-gzip");
        } else if (fileName.endsWith(".war")) {
            mediaType = MediaType.parseMediaType("application/java-archive");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(mediaType)
                .body(new FileSystemResource(file));
    }

    @PostMapping("/trigger")
    public ResponseEntity<?> triggerBackup() {
        try {
            boolean executed = backupService.executeBackup(true); // 강제 수동 실행
            if (executed) {
                return ResponseEntity.ok("백업 작업이 성공적으로 실행되었습니다.");
            } else {
                return ResponseEntity.ok("변경사항이 없어 백업이 건너뛰어졌습니다.");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("백업 실행 실패: " + e.getMessage());
        }
    }
}
