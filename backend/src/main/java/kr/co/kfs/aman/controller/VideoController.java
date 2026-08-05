package kr.co.kfs.aman.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/video")
public class VideoController {

    @Value("${aman.video-dir}")
    private String videoDir;

    @GetMapping
    public ResponseEntity<?> getVideos(HttpServletRequest request) {
        File dir = new File(videoDir);
        System.out.println("====== [AMAN_DEBUG] videoDir Path: " + dir.getAbsolutePath() + " ======");
        if (!dir.exists()) {
            boolean created = dir.mkdirs();
            if (!created && !dir.exists()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("동영상 저장 디렉토리를 생성할 수 없습니다.");
            }
        }

        File[] files = dir.listFiles();
        List<Map<String, Object>> list = new ArrayList<>();
        if (files != null) {
            // 수정일 역순(최신순) 정렬
            Arrays.sort(files, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));

            String contextPath = request.getContextPath(); // "/aman"
            String scheme = request.getScheme();
            String serverName = request.getServerName();
            int serverPort = request.getServerPort();

            for (File file : files) {
                if (file.isFile() && isVideoFile(file.getName())) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", file.getName());
                    map.put("size", file.length());
                    map.put("lastModified", file.lastModified());
                    
                    // 예: http://localhost:8686/aman/videos/filename.mp4
                    String videoUrl = scheme + "://" + serverName + ":" + serverPort + contextPath + "/videos/" + file.getName();
                    map.put("url", videoUrl);
                    
                    list.add(map);
                }
            }
        }

        return ResponseEntity.ok(list);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadVideo(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("업로드된 파일이 비어있습니다.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !isVideoFile(originalFilename)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("지원하지 않는 동영상 형식입니다. (mp4, webm, ogg만 가능)");
        }

        File dir = new File(videoDir);
        if (!dir.exists() && !dir.mkdirs()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("동영상 저장 디렉토리를 생성할 수 없습니다.");
        }

        // 중복 파일명 방지
        String fileName = originalFilename;
        File destFile = new File(dir, fileName);
        if (destFile.exists()) {
            String nameWithoutExt = fileName;
            String ext = "";
            int dotIdx = fileName.lastIndexOf('.');
            if (dotIdx > 0) {
                nameWithoutExt = fileName.substring(0, dotIdx);
                ext = fileName.substring(dotIdx);
            }
            fileName = nameWithoutExt + "_" + System.currentTimeMillis() + ext;
            destFile = new File(dir, fileName);
        }

        try {
            file.transferTo(destFile);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("동영상 저장 중 오류가 발생했습니다: " + e.getMessage());
        }

        String contextPath = request.getContextPath();
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        String videoUrl = scheme + "://" + serverName + ":" + serverPort + contextPath + "/videos/" + fileName;

        Map<String, String> result = new HashMap<>();
        result.put("name", fileName);
        result.put("url", videoUrl);

        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{fileName}")
    public ResponseEntity<?> deleteVideo(@PathVariable("fileName") String fileName) {
        // 경로 탈출 공격 방지
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("잘못된 파일 이름입니다.");
        }

        File file = new File(videoDir, fileName);
        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 동영상 파일입니다.");
        }

        if (file.delete()) {
            return ResponseEntity.ok("동영상이 성공적으로 삭제되었습니다.");
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("동영상 파일 삭제에 실패했습니다.");
        }
    }

    private boolean isVideoFile(String filename) {
        if (filename == null) {
            return false;
        }
        String lower = filename.toLowerCase();
        return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg");
    }
}
