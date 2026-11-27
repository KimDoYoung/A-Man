package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.config.ZipUploadConfig;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.PageRepository;
import kr.co.kfs.aman.service.ZipImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * zip-upload: <aka>.zip 으로 aka 문서를 대체한다. (docs/zip-upload-설계.md)
 *
 *   POST /<컨텍스트>/zip-upload   multipart: file=<aka>.zip
 *   예) curl -F "file=@1234.zip" http://localhost:8686/aman/zip-upload
 *
 * - IP 제한은 ZipUploadIpFilter 가 먼저 처리한다 (로그인 불필요).
 * - aka 문서가 없으면 404 (새 문서를 만들지 않음), 잠겨 있으면 409.
 * - 상태(DRAFT/PUBLISHED)·폴더·순서·aka·잠금 정보는 유지하고 제목·본문만 바꾼다.
 * - 이미지 URL은 절대경로로 저장한다 (본문 md를 밖으로 복사해도 이미지가 보이도록).
 *   aman.public-base-url 이 있으면 그 값, 없으면 요청 주소 기준 ('가져오기'와 같음).
 */
@RestController
public class ZipUploadController {

    private static final Logger log = LoggerFactory.getLogger(ZipUploadController.class);

    /** aka 형식: 경로 조작 문자 차단 */
    static final Pattern AKA_PATTERN = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    private final PageRepository pageRepository;
    private final ZipImportService zipImportService;

    /** 외부 공개 주소 (예: https://aview.k-fs.co.kr:7171). 이미지 절대 URL 앞부분으로 사용 */
    @Value("${aman.public-base-url:}")
    private String publicBaseUrl;

    public ZipUploadController(PageRepository pageRepository, ZipImportService zipImportService) {
        this.pageRepository = pageRepository;
        this.zipImportService = zipImportService;
    }

    @PostMapping(ZipUploadConfig.ZIP_UPLOAD_PATH)
    @CacheEvict(value = "manualHtml", allEntries = true)
    public ResponseEntity<Map<String, Object>> uploadZip(
            @RequestParam(value = "file", required = false) MultipartFile file,
            HttpServletRequest request) {

        if (file == null || file.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "업로드된 파일이 없거나 비어있습니다. (multipart 필드 이름: file)", null);
        }

        String fileName = file.getOriginalFilename();
        String aka = akaFromFileName(fileName);
        if (aka == null) {
            return error(HttpStatus.BAD_REQUEST,
                    "파일 이름은 <aka>.zip 형식이어야 합니다 (영문·숫자·_·- 만 허용): " + fileName, null);
        }

        Optional<Page> pageOpt = pageRepository.findByAka(aka);
        if (!pageOpt.isPresent()) {
            log.warn("[zip-upload] aka 문서 없음: {}", aka);
            Map<String, Object> extra = new LinkedHashMap<>();
            extra.put("aka", aka);
            return error(HttpStatus.NOT_FOUND, "aka 가 '" + aka + "' 인 문서가 없습니다. (새 문서는 화면에서 만드세요)", extra);
        }
        Page page = pageOpt.get();

        if (page.getLockUser() != null) {
            log.warn("[zip-upload] 잠긴 문서: aka={}, lockUser={}", aka, page.getLockUser());
            Map<String, Object> extra = new LinkedHashMap<>();
            extra.put("aka", aka);
            extra.put("lockUser", page.getLockUser());
            extra.put("lockTime", page.getLockTime() != null ? page.getLockTime().toString() : null);
            return error(HttpStatus.CONFLICT,
                    page.getLockUser() + "님이 편집 중(잠금)인 문서라 대체할 수 없습니다. 잠금 해제 후 다시 시도하세요.", extra);
        }

        // 이미지 URL은 절대경로 (설정된 공개 주소 우선)
        String imageUrlBase = imageUrlBase(publicBaseUrl, request);
        ZipImportService.ImportResult imported;
        try {
            imported = zipImportService.importZip(file, imageUrlBase);
        } catch (ZipImportService.ZipImportException e) {
            log.warn("[zip-upload] ZIP 해석 실패: aka={}, {}", aka, e.getMessage());
            return error(e.getStatus(), e.getMessage(), null);
        }

        if ("PUBLISHED".equals(page.getStatus()) && imported.getContent().trim().isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "발행(PUBLISHED)된 문서를 빈 내용으로 대체할 수 없습니다.", null);
        }

        page.setTitle(imported.getTitle());
        page.setContent(imported.getContent());
        Page saved = pageRepository.save(page);
        log.info("[zip-upload] 대체 완료: aka={}, pageId={}, title={}, images={}",
                aka, saved.getId(), saved.getTitle(), imported.getImageCount());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("result", "replaced");
        body.put("aka", aka);
        body.put("pageId", saved.getId());
        body.put("title", saved.getTitle());
        body.put("status", saved.getStatus());
        body.put("images", imported.getImageCount());
        body.put("imageUrlBase", imageUrlBase);
        return ResponseEntity.ok(body);
    }

    /**
     * 이미지 URL 앞부분. 예) https://aview.k-fs.co.kr:7171/aman/images/
     * publicBaseUrl 이 비어 있으면 요청 주소(scheme://host:port) 기준 - 스크립트가 localhost로 호출하면
     * 본문에 localhost 가 들어가므로, 화면 밖에서 호출하는 서버는 aman.public-base-url 을 설정한다.
     */
    static String imageUrlBase(String publicBaseUrl, HttpServletRequest request) {
        String origin;
        if (publicBaseUrl != null && !publicBaseUrl.trim().isEmpty()) {
            origin = publicBaseUrl.trim().replaceAll("/+$", "");
        } else {
            origin = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();
        }
        return origin + request.getContextPath() + "/images/";
    }

    /** "1234.zip" → "1234". 형식이 맞지 않으면 null. 경로가 붙어 오면(일부 브라우저) 파일 이름만 사용. */
    static String akaFromFileName(String fileName) {
        if (fileName == null) {
            return null;
        }
        String name = fileName;
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        if (!name.toLowerCase().endsWith(".zip")) {
            return null;
        }
        String aka = name.substring(0, name.length() - 4);
        return AKA_PATTERN.matcher(aka).matches() ? aka : null;
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message, Map<String, Object> extra) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", message);
        if (extra != null) {
            body.putAll(extra);
        }
        return ResponseEntity.status(status).body(body);
    }
}
