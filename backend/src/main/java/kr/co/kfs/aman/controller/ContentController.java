package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/content")
public class ContentController {

    private final PageRepository pageRepository;
    private final FolderRepository folderRepository;

    @Value("${aman.base-dir:/home/kdy987/work/aman/aman-base-dir}")
    private String baseDir;

    public ContentController(PageRepository pageRepository, FolderRepository folderRepository) {
        this.pageRepository = pageRepository;
        this.folderRepository = folderRepository;
    }

    @PostMapping
    public ResponseEntity<?> upsertPage(@RequestBody Map<String, Object> body) {
        Long folderId = Long.valueOf(body.get("folderId").toString());
        String title = body.get("title").toString();
        String content = body.get("content").toString();
        Integer sortOrder = body.containsKey("sortOrder") ? Integer.valueOf(body.get("sortOrder").toString()) : 0;

        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("존재하지 않는 폴더 ID입니다.");
        }

        Page page;
        if (body.containsKey("id") && body.get("id") != null) {
            Long pageId = Long.valueOf(body.get("id").toString());
            Optional<Page> pageOpt = pageRepository.findById(pageId);
            if (pageOpt.isPresent()) {
                // Update 수행
                page = pageOpt.get();
                page.setFolder(folderOpt.get());
                page.setTitle(title);
                page.setContent(content);
                page.setSortOrder(sortOrder);
            } else {
                // ID가 명시되어 있으나 DB에 없는 경우 신규 생성
                page = Page.builder()
                        .id(pageId)
                        .folder(folderOpt.get())
                        .title(title)
                        .content(content)
                        .sortOrder(sortOrder)
                        .build();
            }
        } else {
            // Insert 수행
            page = Page.builder()
                    .folder(folderOpt.get())
                    .title(title)
                    .content(content)
                    .sortOrder(sortOrder)
                    .build();
        }

        Page savedPage = pageRepository.save(page);
        return ResponseEntity.ok(savedPage);
    }

    @GetMapping("/{page_id}")
    public ResponseEntity<?> getPageDetail(@PathVariable("page_id") Long pageId) {
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        return ResponseEntity.ok(pageOpt.get());
    }

    @DeleteMapping("/{page_id}")
    public ResponseEntity<?> deletePage(@PathVariable("page_id") Long pageId) {
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        
        // 요구사항: Hard Delete (물리적 삭제) 수행
        pageRepository.deleteById(pageId);
        return ResponseEntity.ok("페이지가 영구 삭제되었습니다.");
    }

    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("업로드된 파일이 비어있습니다.");
        }

        // 1. 년/월/일 서브 폴더 경로 계산
        LocalDateTime now = LocalDateTime.now();
        String year = String.format("%04d", now.getYear());
        String month = String.format("%02d", now.getMonthValue());
        String day = String.format("%02d", now.getDayOfMonth());
        String datePath = year + "/" + month + "/" + day;

        // 2. 저장 폴더 생성 (BASE_DIR/data/images/yyyy/MM/dd)
        String saveDirPath = baseDir + "/data/images/" + datePath;
        File saveDir = new File(saveDirPath);
        if (!saveDir.exists()) {
            saveDir.mkdirs();
        }

        // 3. 파일 포맷 그대로 사용(요구사항 반영) 및 UUID 명명
        String originalFilename = file.getOriginalFilename();
        String ext = "png"; // fallback
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf(".") + 1);
        }
        String uuidName = UUID.randomUUID().toString().replace("-", "") + "." + ext;

        File destFile = new File(saveDir, uuidName);
        try {
            file.transferTo(destFile);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("이미지 저장 중 오류가 발생했습니다: " + e.getMessage());
        }

        // 4. 리턴할 절대 URL 생성 (context-path 고려)
        String contextPath = request.getContextPath(); // "/aman"
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        
        // 예: http://localhost:8686/aman/images/2026/06/23/uuidName.ext
        String imageUrl = scheme + "://" + serverName + ":" + serverPort + contextPath + "/images/" + datePath + "/" + uuidName;

        Map<String, String> result = new HashMap<>();
        result.put("url", imageUrl);
        result.put("fileName", uuidName);

        return ResponseEntity.ok(result);
    }
}
