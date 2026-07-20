package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
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
        String content = body.get("content").toString().trim();
        Integer sortOrder = body.containsKey("sortOrder") ? Integer.valueOf(body.get("sortOrder").toString()) : Integer.valueOf(0);
        String aka = body.containsKey("aka") && body.get("aka") != null ? body.get("aka").toString().trim() : "";
        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("존재하지 않는 폴더 ID입니다.");
        }

        String status = body.containsKey("status") && body.get("status") != null ? body.get("status").toString().trim() : "DRAFT";
        if (!"DRAFT".equals(status) && !"PUBLISHED".equals(status)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("올바르지 않은 상태 값입니다. (허용 값: DRAFT, PUBLISHED)");
        }
        if ("PUBLISHED".equals(status) && content.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("내용이 없는 페이지는 완료 및 배포(PUBLISHED) 상태로 설정할 수 없습니다.");
        }

        // 별칭(AKA) 중복 여부 검사
        if (!aka.isEmpty()) {
            Optional<Page> existingAkaPageOpt = pageRepository.findByAka(aka);
            if (existingAkaPageOpt.isPresent()) {
                Page existingAkaPage = existingAkaPageOpt.get();
                Long pageId = body.containsKey("id") && body.get("id") != null ? Long.valueOf(body.get("id").toString()) : null;
                if (pageId == null || !pageId.equals(existingAkaPage.getId())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("이미 사용 중인 별칭(AKA)입니다. 다른 별칭을 입력하십시오.");
                }
            }
        }

        String currentUsername = getLoginUsername();
        if (currentUsername == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요한 서비스입니다.");
        }

        boolean wasLockReleasedByAdmin = false;

        Page page;
        if (body.containsKey("id") && body.get("id") != null) {
            Long pageId = Long.valueOf(body.get("id").toString());
            Optional<Page> pageOpt = pageRepository.findById(pageId);
            if (pageOpt.isPresent()) {
                // Update 수행
                page = pageOpt.get();

                // 잠금 체크
                if (page.getLockUser() != null && !page.getLockUser().equals(currentUsername)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body("이 페이지는 현재 " + page.getLockUser() + "님에 의해 잠겨 있어 저장할 수 없습니다.");
                }

                // 잠금 해제 체크 (Admin에 의해 풀렸는지)
                if (page.getLockUser() == null) {
                    String clientLockUser = body.containsKey("lockUser") && body.get("lockUser") != null 
                            ? body.get("lockUser").toString() : null;
                    if (clientLockUser != null && clientLockUser.equals(currentUsername)) {
                        wasLockReleasedByAdmin = true;
                    }
                }

                page.setFolder(folderOpt.get());
                page.setTitle(title);
                page.setContent(content);
                page.setSortOrder(sortOrder);
                page.setStatus(status);
                
                if (aka.isEmpty()) {
                    // 기존에 aka가 채워져 있었다면 기존 것 유지, 없었다면 임의 생성
                    if (page.getAka() == null || page.getAka().trim().isEmpty()) {
                        String generatedAka = "page-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12);
                        page.setAka(generatedAka);
                    }
                } else {
                    page.setAka(aka);
                }
            } else {
                // ID가 명시되어 있으나 DB에 없는 경우 신규 생성
                if (aka.isEmpty()) {
                    aka = "page-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12);
                }
                page = Page.builder()
                        .id(pageId)
                        .folder(folderOpt.get())
                        .title(title)
                        .content(content)
                        .sortOrder(sortOrder)
                        .aka(aka)
                        .status(status)
                        .build();
            }
        } else {
            // Insert 수행
            if (aka.isEmpty()) {
                aka = "page-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            }
            page = Page.builder()
                    .folder(folderOpt.get())
                    .title(title)
                    .content(content)
                    .sortOrder(sortOrder)
                    .aka(aka)
                    .status(status)
                    .build();
        }

        Page savedPage = pageRepository.save(page);
        
        Map<String, Object> result = new HashMap<>();
        result.put("page", savedPage);
        if (wasLockReleasedByAdmin) {
            result.put("warning", "LOCK_RELEASED_BY_ADMIN");
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{page_id}")
    public ResponseEntity<?> getPageDetail(@PathVariable("page_id") Long pageId) {
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        return ResponseEntity.ok(pageOpt.get());
    }

    @GetMapping("/folders/{folder_id}/pages")
    public ResponseEntity<?> getFolderPages(@PathVariable("folder_id") Long folderId) {
        java.util.List<Page> pages = pageRepository.findByFolderIdOrderBySortOrderAsc(folderId);
        return ResponseEntity.ok(pages);
    }

    @DeleteMapping("/{page_id}")
    public ResponseEntity<?> deletePage(@PathVariable("page_id") Long pageId) {
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        
        String currentUsername = getLoginUsername();
        if (currentUsername == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요한 서비스입니다.");
        }
        
        Page page = pageOpt.get();
        if (page.getLockUser() != null && !page.getLockUser().equals(currentUsername)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("이 페이지는 현재 " + page.getLockUser() + "님에 의해 잠겨 있어 삭제할 수 없습니다.");
        }

        // 요구사항: Hard Delete (물리적 삭제) 수행
        pageRepository.deleteById(pageId);
        return ResponseEntity.ok("페이지가 영구 삭제되었습니다.");
    }

    @PostMapping("/{page_id}/lock")
    public ResponseEntity<?> lockPage(@PathVariable("page_id") Long pageId) {
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        Page page = pageOpt.get();
        
        String currentUsername = getLoginUsername();
        if (currentUsername == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요한 서비스입니다.");
        }
        
        boolean isAdmin = isAdmin();
        String currentRole = isAdmin ? "admin" : "user";
        
        // 이미 잠겨있는 경우 검사
        if (page.getLockUser() != null) {
            // 본인이 이미 잠근 경우 통과
            if (page.getLockUser().equals(currentUsername)) {
                return ResponseEntity.ok(page);
            }
            // 다른 사람이 잠갔으나 현재 사용자가 관리자(Admin)인 경우 덮어쓰기 허용
            if (!isAdmin) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("이미 " + page.getLockUser() + "님에 의해 잠겨 있습니다.");
            }
        }
        
        // 잠금 설정
        page.setLockUser(currentUsername);
        page.setLockTime(LocalDateTime.now());
        page.setLockRole(currentRole);
        
        Page savedPage = pageRepository.save(page);
        return ResponseEntity.ok(savedPage);
    }

    @PostMapping("/{page_id}/unlock")
    public ResponseEntity<?> unlockPage(@PathVariable("page_id") Long pageId) {
        Optional<Page> pageOpt = pageRepository.findById(pageId);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 페이지입니다.");
        }
        Page page = pageOpt.get();
        
        if (page.getLockUser() == null) {
            return ResponseEntity.ok(page);
        }
        
        String currentUsername = getLoginUsername();
        if (currentUsername == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요한 서비스입니다.");
        }
        
        boolean isAdmin = isAdmin();
        
        // 권한 검사: 본인이 잠근 경우이거나, 관리자인 경우에만 해제 가능
        if (page.getLockUser().equals(currentUsername) || isAdmin) {
            page.setLockUser(null);
            page.setLockTime(null);
            page.setLockRole(null);
            Page savedPage = pageRepository.save(page);
            return ResponseEntity.ok(savedPage);
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("이 잠금은 작성자 또는 관리자만 해제할 수 있습니다.");
        }
    }

    private String getLoginUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof String && !"anonymousUser".equals(principal)) {
            return (String) principal;
        }
        return null;
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
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
        if (!saveDir.exists() && !saveDir.mkdirs()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("이미지 저장 폴더를 생성할 수 없습니다: " + saveDirPath);
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

    @PostMapping("/export")
    public void exportPageToZip(@RequestBody Map<String, Object> body, javax.servlet.http.HttpServletResponse response) {
        String title = body.containsKey("title") && body.get("title") != null ? body.get("title").toString() : "document";
        String content = body.containsKey("content") && body.get("content") != null ? body.get("content").toString() : "";
        String aka = body.containsKey("aka") && body.get("aka") != null ? body.get("aka").toString() : "doc";

        if (title.trim().isEmpty()) {
            title = "document";
        }
        if (aka.trim().isEmpty()) {
            aka = "document";
        }

        // 1. Parse markdown content to extract image paths
        java.util.List<String> imageRelativePaths = new java.util.ArrayList<>();
        java.util.List<String> originalMatches = new java.util.ArrayList<>();
        
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)");
        java.util.regex.Matcher matcher = pattern.matcher(content);
        
        while (matcher.find()) {
            String imageUrl = matcher.group(1);
            if (imageUrl.contains("/images/")) {
                int index = imageUrl.indexOf("/images/");
                String relativePath = imageUrl.substring(index + "/images/".length());
                if (relativePath.contains("?")) {
                    relativePath = relativePath.substring(0, relativePath.indexOf("?"));
                }
                if (relativePath.contains("#")) {
                    relativePath = relativePath.substring(0, relativePath.indexOf("#"));
                }
                imageRelativePaths.add(relativePath);
                originalMatches.add(imageUrl);
            }
        }

        // 2. Rewrite markdown content to use relative local paths for images
        String rewrittenContent = content;
        for (int i = 0; i < originalMatches.size(); i++) {
            String origUrl = originalMatches.get(i);
            String relPath = imageRelativePaths.get(i);
            String filename = relPath;
            if (filename.contains("/")) {
                filename = filename.substring(filename.lastIndexOf("/") + 1);
            }
            rewrittenContent = rewrittenContent.replace(origUrl, "images/" + filename);
        }

        // 3. Prepare ZIP file response
        response.setContentType("application/zip");
        String safeFileName = aka + ".zip";
        try {
            safeFileName = java.net.URLEncoder.encode(safeFileName, "UTF-8").replaceAll("\\+", "%20");
        } catch (java.io.UnsupportedEncodingException e) {
            safeFileName = aka + ".zip";
        }
        response.setHeader("Content-Disposition", "attachment; filename=\"" + safeFileName + "\"");

        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(response.getOutputStream())) {
            // Write Markdown file
            java.util.zip.ZipEntry mdEntry = new java.util.zip.ZipEntry(title + ".md");
            zos.putNextEntry(mdEntry);
            zos.write(rewrittenContent.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            zos.closeEntry();

            // Write each image file
            for (String relPath : imageRelativePaths) {
                String imageFilePath = baseDir + "/data/images/" + relPath;
                java.io.File imgFile = new java.io.File(imageFilePath);
                if (imgFile.exists() && imgFile.isFile()) {
                    String filename = relPath;
                    if (filename.contains("/")) {
                        filename = filename.substring(filename.lastIndexOf("/") + 1);
                    }
                    java.util.zip.ZipEntry imgEntry = new java.util.zip.ZipEntry("images/" + filename);
                    zos.putNextEntry(imgEntry);
                    
                    try (java.io.FileInputStream fis = new java.io.FileInputStream(imgFile)) {
                        byte[] buffer = new byte[4096];
                        int len;
                        while ((len = fis.read(buffer)) > 0) {
                            zos.write(buffer, 0, len);
                        }
                    }
                    zos.closeEntry();
                }
            }
            zos.flush();
        } catch (java.io.IOException e) {
            System.err.println("Failed to export ZIP: " + e.getMessage());
        }
    }

    @PostMapping("/import")
    public ResponseEntity<?> importPageFromZip(
            @RequestParam("file") MultipartFile file,
            @RequestParam("folderId") Long folderId,
            HttpServletRequest request) {
        
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("업로드된 파일이 비어있습니다.");
        }

        Optional<Folder> folderOpt = folderRepository.findById(folderId);
        if (!folderOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("존재하지 않는 폴더 ID입니다.");
        }

        // 1. Create temporary directory
        String tempDirPath = "/tmp/aman/import_" + UUID.randomUUID().toString().replace("-", "");
        File tempDir = new File(tempDirPath);
        if (!tempDir.exists() && !tempDir.mkdirs()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("임시 디렉토리를 생성할 수 없습니다.");
        }

        File zipFile = new File(tempDir, "temp.zip");
        try {
            file.transferTo(zipFile);
        } catch (IOException e) {
            deleteDirectory(tempDir);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("임시 파일 저장에 실패했습니다.");
        }

        String markdownContent = "";
        String pageTitle = "";
        Map<String, String> imagePathMapping = new HashMap<>();

        // 2. Unzip and search for markdown file & images
        try {
            unzip(zipFile, tempDir);

            // Notion 등에서 생성된 중첩 ZIP 파일이 있다면 재귀적으로 압축 해제
            boolean foundNestedZip = true;
            int maxDepth = 5; // 무한 루프 방지용 최대 깊이
            while (foundNestedZip && maxDepth > 0) {
                foundNestedZip = false;
                java.util.List<File> nestedZips = findZipFilesRecursively(tempDir, zipFile);
                if (!nestedZips.isEmpty()) {
                    foundNestedZip = true;
                    maxDepth--;
                    for (File nz : nestedZips) {
                        unzip(nz, nz.getParentFile());
                        if (!nz.delete()) {
                            nz.deleteOnExit();
                        }
                    }
                }
            }
        } catch (IOException e) {
            deleteDirectory(tempDir);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("ZIP 파일 압축 해제에 실패했습니다: " + e.getMessage());
        }

        // 3. Find Markdown file (.md) in tempDir
        File[] mdFiles = tempDir.listFiles(new java.io.FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {
                return name.toLowerCase().endsWith(".md");
            }
        });

        File mdFile = null;
        if (mdFiles != null && mdFiles.length > 0) {
            mdFile = mdFiles[0];
        } else {
            mdFile = findFileRecursively(tempDir, ".md");
        }

        if (mdFile == null) {
            deleteDirectory(tempDir);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("ZIP 파일 안에 마크다운(.md) 파일이 존재하지 않습니다.");
        }

        // Read Markdown content
        try {
            byte[] bytes = java.nio.file.Files.readAllBytes(mdFile.toPath());
            markdownContent = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            pageTitle = mdFile.getName();
            if (pageTitle.toLowerCase().endsWith(".md")) {
                pageTitle = pageTitle.substring(0, pageTitle.length() - 3);
            }
        } catch (IOException e) {
            deleteDirectory(tempDir);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("마크다운 파일을 읽는 데 실패했습니다.");
        }

        // 4. Parse markdown content to extract image references
        java.util.List<String> imageRefs = new java.util.ArrayList<>();
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)");
        java.util.regex.Matcher matcher = pattern.matcher(markdownContent);
        while (matcher.find()) {
            String imgUrl = matcher.group(1);
            if (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://") && !imgUrl.startsWith("//")) {
                imageRefs.add(imgUrl);
            }
        }

        // 5. Save referenced images into A-Man storage and build mapping
        LocalDateTime now = LocalDateTime.now();
        String year = String.format("%04d", now.getYear());
        String month = String.format("%02d", now.getMonthValue());
        String day = String.format("%02d", now.getDayOfMonth());
        String datePath = year + "/" + month + "/" + day;
        String saveDirPath = baseDir + "/data/images/" + datePath;
        File saveDir = new File(saveDirPath);

        String contextPath = request.getContextPath();
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        String serverPrefix = scheme + "://" + serverName + ":" + serverPort + contextPath + "/images/" + datePath + "/";

        for (String ref : imageRefs) {
            String decodedRef = ref;
            try {
                decodedRef = java.net.URLDecoder.decode(ref, "UTF-8");
            } catch (Exception ignored) {}
            
            String cleanRef = decodedRef;
            if (cleanRef.startsWith("./")) {
                cleanRef = cleanRef.substring(2);
            } else if (cleanRef.startsWith("/")) {
                cleanRef = cleanRef.substring(1);
            }

            File imgFile = new File(tempDir, cleanRef);
            if (!imgFile.exists()) {
                String filename = cleanRef;
                if (filename.contains("/")) {
                    filename = filename.substring(filename.lastIndexOf("/") + 1);
                }
                imgFile = findFileRecursivelyByName(tempDir, filename);
            }

            if (imgFile != null && imgFile.exists() && imgFile.isFile()) {
                String ext = "png";
                String filename = imgFile.getName();
                if (filename.contains(".")) {
                    ext = filename.substring(filename.lastIndexOf(".") + 1);
                }
                String uuidName = UUID.randomUUID().toString().replace("-", "") + "." + ext;
                
                if (!saveDir.exists() && !saveDir.mkdirs()) {
                    System.err.println("Failed to create directory: " + saveDir.getAbsolutePath());
                }
                File destFile = new File(saveDir, uuidName);
                try {
                    shutilCopy(imgFile, destFile);
                    String newUrl = serverPrefix + uuidName;
                    imagePathMapping.put(ref, newUrl);
                } catch (IOException e) {
                    System.err.println("Failed to copy image: " + imgFile.getAbsolutePath() + " to " + destFile.getAbsolutePath());
                }
            }
        }

        // 6. Rewrite markdown content URLs
        String rewrittenContent = markdownContent;
        for (Map.Entry<String, String> entry : imagePathMapping.entrySet()) {
            rewrittenContent = rewrittenContent.replace(entry.getKey(), entry.getValue());
        }

        // 7. Auto extract title if H1 exists in markdown
        java.util.regex.Pattern h1Pattern = java.util.regex.Pattern.compile("^#\\s+(.+)$", java.util.regex.Pattern.MULTILINE);
        java.util.regex.Matcher h1Matcher = h1Pattern.matcher(markdownContent);
        if (h1Matcher.find()) {
            pageTitle = h1Matcher.group(1).trim();
        }

        // 8. Delete temp directory
        deleteDirectory(tempDir);

        // 9. Save page to DB as DRAFT
        String generatedAka = "page-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Page page = Page.builder()
                .folder(folderOpt.get())
                .title(pageTitle)
                .content(rewrittenContent)
                .aka(generatedAka)
                .status("DRAFT")
                .sortOrder(0)
                .build();

        Page savedPage = pageRepository.save(page);
        return ResponseEntity.ok(savedPage);
    }

    private File findFileRecursively(File dir, String ext) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    File res = findFileRecursively(f, ext);
                    if (res != null) {
                        return res;
                    }
                } else if (f.getName().toLowerCase().endsWith(ext)) {
                    return f;
                }
            }
        }
        return null;
    }

    private File findFileRecursivelyByName(File dir, String filename) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    File res = findFileRecursivelyByName(f, filename);
                    if (res != null) {
                        return res;
                    }
                } else if (f.getName().equalsIgnoreCase(filename)) {
                    return f;
                }
            }
        }
        return null;
    }

    private void deleteDirectory(File dir) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    deleteDirectory(f);
                } else {
                    if (!f.delete()) {
                        System.err.println("Failed to delete file: " + f.getAbsolutePath());
                    }
                }
            }
        }
        if (!dir.delete()) {
            System.err.println("Failed to delete directory: " + dir.getAbsolutePath());
        }
    }

    private void shutilCopy(File source, File dest) throws IOException {
        try (java.io.FileInputStream fis = new java.io.FileInputStream(source);
             java.io.FileOutputStream fos = new java.io.FileOutputStream(dest)) {
            byte[] buffer = new byte[4096];
            int len;
            while ((len = fis.read(buffer)) > 0) {
                fos.write(buffer, 0, len);
            }
        }
    }

    private void unzip(File zipFile, File destDir) throws IOException {
        try (java.util.zip.ZipFile zFile = new java.util.zip.ZipFile(zipFile)) {
            java.util.Enumeration<? extends java.util.zip.ZipEntry> entries = zFile.entries();
            
            while (entries.hasMoreElements()) {
                java.util.zip.ZipEntry entry = entries.nextElement();
                File destFile = new File(destDir, entry.getName());
                
                // Security check (Zip Slip Prevention)
                String canonicalDirPath = destDir.getCanonicalPath();
                String canonicalDestPath = destFile.getCanonicalPath();
                if (!canonicalDestPath.startsWith(canonicalDirPath + File.separator) && !canonicalDestPath.equals(canonicalDirPath)) {
                    throw new IOException("ZIP 파일에 올바르지 않은 경로가 포함되어 있습니다: " + entry.getName());
                }

                if (entry.isDirectory()) {
                    if (!destFile.exists() && !destFile.mkdirs()) {
                        throw new IOException("Failed to create directory: " + destFile.getAbsolutePath());
                    }
                } else {
                    File parent = destFile.getParentFile();
                    if (parent != null && !parent.exists() && !parent.mkdirs()) {
                        throw new IOException("Failed to create parent directory: " + parent.getAbsolutePath());
                    }
                    try (java.io.InputStream is = zFile.getInputStream(entry);
                         java.io.FileOutputStream fos = new java.io.FileOutputStream(destFile)) {
                        byte[] buffer = new byte[4096];
                        int len;
                        while ((len = is.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
            }
        }
    }

    private java.util.List<File> findZipFilesRecursively(File dir, File mainZipFile) throws IOException {
        java.util.List<File> zips = new java.util.ArrayList<>();
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    zips.addAll(findZipFilesRecursively(f, mainZipFile));
                } else if (f.getName().toLowerCase().endsWith(".zip")) {
                    if (!f.getCanonicalPath().equals(mainZipFile.getCanonicalPath())) {
                        zips.add(f);
                    }
                }
            }
        }
        return zips;
    }
}
