package kr.co.kfs.aman.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 마크다운 ZIP(내보내기 결과 형식: <제목>.md + images/) 해석 서비스.
 * '가져오기'(ContentController /content/import)와 zip-upload(ZipUploadController)가 함께 사용한다.
 * (docs/zip-upload-설계.md 4.2)
 *
 * 1. 임시 폴더에 압축 해제 (중첩 ZIP 최대 5단계)
 * 2. .md 파일 탐색 (최상위 우선, 없으면 하위 폴더)
 * 3. 본문이 참조하는 로컬 이미지를 BASE_DIR/data/images/yyyy/MM/dd 에 저장하고 URL 변경
 * 4. 제목: 첫 H1, 없으면 md 파일 이름
 */
@Service
public class ZipImportService {

    private static final Logger log = LoggerFactory.getLogger(ZipImportService.class);

    /** 압축 해제 한도 (zip bomb 방지) - 중첩 ZIP 포함 누적 */
    static final long MAX_TOTAL_BYTES = 500L * 1024 * 1024;
    static final int MAX_ENTRIES = 5000;
    private static final int MAX_NESTED_DEPTH = 5;

    @Value("${aman.base-dir:/home/kdy987/work/aman/aman-base-dir}")
    private String baseDir;

    /** 해석 결과 */
    public static class ImportResult {
        private final String title;
        private final String content;
        private final int imageCount;

        ImportResult(String title, String content, int imageCount) {
            this.title = title;
            this.content = content;
            this.imageCount = imageCount;
        }

        public String getTitle() {
            return title;
        }

        public String getContent() {
            return content;
        }

        public int getImageCount() {
            return imageCount;
        }
    }

    /** 해석 실패. status 는 호출한 컨트롤러가 그대로 응답 코드로 사용한다. */
    public static class ZipImportException extends Exception {
        private static final long serialVersionUID = 1L;
        private final HttpStatus status;

        ZipImportException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() {
            return status;
        }
    }

    /** 압축 해제 누적 사용량 */
    private static class UnzipBudget {
        private long bytes;
        private int entries;
    }

    /**
     * ZIP을 해석하여 제목·본문(이미지 URL 변경됨)을 돌려준다.
     *
     * @param file         업로드된 ZIP
     * @param imageUrlBase 이미지 URL 앞부분. 뒤에 "yyyy/MM/dd/<uuid>.<ext>" 가 붙는다.
     *                     예) "http://host:8686/aman/images/" (절대) 또는 "/aman/images/" (상대)
     */
    public ImportResult importZip(MultipartFile file, String imageUrlBase) throws ZipImportException {
        // 1. Create temporary directory
        String tempDirPath = "/tmp/aman/import_" + UUID.randomUUID().toString().replace("-", "");
        File tempDir = new File(tempDirPath);
        if (!tempDir.exists() && !tempDir.mkdirs()) {
            throw new ZipImportException(HttpStatus.INTERNAL_SERVER_ERROR, "임시 디렉토리를 생성할 수 없습니다.");
        }
        try {
            return importInTempDir(file, imageUrlBase, tempDir);
        } finally {
            // 8. Delete temp directory
            deleteDirectory(tempDir);
        }
    }

    private ImportResult importInTempDir(MultipartFile file, String imageUrlBase, File tempDir) throws ZipImportException {
        File zipFile = new File(tempDir, "temp.zip");
        try {
            file.transferTo(zipFile);
        } catch (IOException e) {
            throw new ZipImportException(HttpStatus.INTERNAL_SERVER_ERROR, "임시 파일 저장에 실패했습니다.");
        }

        // 2. Unzip and search for markdown file & images
        try {
            UnzipBudget budget = new UnzipBudget();
            unzip(zipFile, tempDir, budget);

            // Notion 등에서 생성된 중첩 ZIP 파일이 있다면 재귀적으로 압축 해제
            boolean foundNestedZip = true;
            int maxDepth = MAX_NESTED_DEPTH; // 무한 루프 방지용 최대 깊이
            while (foundNestedZip && maxDepth > 0) {
                foundNestedZip = false;
                List<File> nestedZips = findZipFilesRecursively(tempDir, zipFile);
                if (!nestedZips.isEmpty()) {
                    foundNestedZip = true;
                    maxDepth--;
                    for (File nz : nestedZips) {
                        unzip(nz, nz.getParentFile(), budget);
                        if (!nz.delete()) {
                            nz.deleteOnExit();
                        }
                    }
                }
            }
        } catch (IOException e) {
            throw new ZipImportException(HttpStatus.BAD_REQUEST, "ZIP 파일 압축 해제에 실패했습니다: " + e.getMessage());
        }

        // 3. Find Markdown file (.md) in tempDir
        File[] mdFiles = tempDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".md"));
        File mdFile;
        if (mdFiles != null && mdFiles.length > 0) {
            mdFile = mdFiles[0];
        } else {
            mdFile = findFileRecursively(tempDir, ".md");
        }
        if (mdFile == null) {
            throw new ZipImportException(HttpStatus.BAD_REQUEST, "ZIP 파일 안에 마크다운(.md) 파일이 존재하지 않습니다.");
        }

        // Read Markdown content
        String markdownContent;
        String pageTitle;
        try {
            byte[] bytes = java.nio.file.Files.readAllBytes(mdFile.toPath());
            markdownContent = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            pageTitle = mdFile.getName();
            if (pageTitle.toLowerCase().endsWith(".md")) {
                pageTitle = pageTitle.substring(0, pageTitle.length() - 3);
            }
        } catch (IOException e) {
            throw new ZipImportException(HttpStatus.INTERNAL_SERVER_ERROR, "마크다운 파일을 읽는 데 실패했습니다.");
        }

        // 4. Parse markdown content to extract image references
        List<String> imageRefs = new ArrayList<>();
        Matcher matcher = Pattern.compile("!\\[.*?\\]\\((.*?)\\)").matcher(markdownContent);
        while (matcher.find()) {
            String imgUrl = matcher.group(1);
            if (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://") && !imgUrl.startsWith("//")) {
                imageRefs.add(imgUrl);
            }
        }

        // 5. Save referenced images into A-Man storage and build mapping
        LocalDateTime now = LocalDateTime.now();
        String datePath = String.format("%04d", now.getYear()) + "/"
                + String.format("%02d", now.getMonthValue()) + "/"
                + String.format("%02d", now.getDayOfMonth());
        File saveDir = new File(baseDir + "/data/images/" + datePath);
        String serverPrefix = imageUrlBase + datePath + "/";

        Map<String, String> imagePathMapping = new HashMap<>();
        for (String ref : imageRefs) {
            String decodedRef = ref;
            try {
                decodedRef = java.net.URLDecoder.decode(ref, "UTF-8");
            } catch (Exception ignored) {
                // 디코딩 실패 시 원본 사용
            }

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
                    log.error("Failed to create directory: {}", saveDir.getAbsolutePath());
                }
                File destFile = new File(saveDir, uuidName);
                try {
                    copyFile(imgFile, destFile);
                    imagePathMapping.put(ref, serverPrefix + uuidName);
                } catch (IOException e) {
                    log.error("Failed to copy image: {} to {}", imgFile.getAbsolutePath(), destFile.getAbsolutePath());
                }
            }
        }

        // 6. Rewrite markdown content URLs
        String rewrittenContent = markdownContent;
        for (Map.Entry<String, String> entry : imagePathMapping.entrySet()) {
            rewrittenContent = rewrittenContent.replace(entry.getKey(), entry.getValue());
        }

        // 7. Auto extract title if H1 exists in markdown
        Matcher h1Matcher = Pattern.compile("^#\\s+(.+)$", Pattern.MULTILINE).matcher(markdownContent);
        if (h1Matcher.find()) {
            pageTitle = h1Matcher.group(1).trim();
        }

        return new ImportResult(pageTitle, rewrittenContent, imagePathMapping.size());
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
                } else if (!f.delete()) {
                    log.warn("Failed to delete file: {}", f.getAbsolutePath());
                }
            }
        }
        if (!dir.delete()) {
            log.warn("Failed to delete directory: {}", dir.getAbsolutePath());
        }
    }

    private void copyFile(File source, File dest) throws IOException {
        try (java.io.FileInputStream fis = new java.io.FileInputStream(source);
             java.io.FileOutputStream fos = new java.io.FileOutputStream(dest)) {
            byte[] buffer = new byte[4096];
            int len;
            while ((len = fis.read(buffer)) > 0) {
                fos.write(buffer, 0, len);
            }
        }
    }

    private void unzip(File zipFile, File destDir, UnzipBudget budget) throws IOException {
        try (java.util.zip.ZipFile zFile = new java.util.zip.ZipFile(zipFile)) {
            java.util.Enumeration<? extends java.util.zip.ZipEntry> entries = zFile.entries();

            while (entries.hasMoreElements()) {
                java.util.zip.ZipEntry entry = entries.nextElement();
                if (++budget.entries > MAX_ENTRIES) {
                    throw new IOException("ZIP 항목 수가 한도(" + MAX_ENTRIES + "개)를 넘었습니다.");
                }
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
                            // 실제 해제되는 바이트로 계산 (헤더의 크기 정보는 위조될 수 있음)
                            budget.bytes += len;
                            if (budget.bytes > MAX_TOTAL_BYTES) {
                                throw new IOException("압축 해제 크기가 한도(" + (MAX_TOTAL_BYTES / 1024 / 1024) + "MB)를 넘었습니다.");
                            }
                            fos.write(buffer, 0, len);
                        }
                    }
                }
            }
        }
    }

    private List<File> findZipFilesRecursively(File dir, File mainZipFile) throws IOException {
        List<File> zips = new ArrayList<>();
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    zips.addAll(findZipFilesRecursively(f, mainZipFile));
                } else if (f.getName().toLowerCase().endsWith(".zip")
                        && !f.getCanonicalPath().equals(mainZipFile.getCanonicalPath())) {
                    zips.add(f);
                }
            }
        }
        return zips;
    }
}
