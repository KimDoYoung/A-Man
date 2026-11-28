package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.PageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * zip-upload 통합 테스트 (docs/zip-upload-설계.md 5장)
 * 실제 DB를 건드리지 않도록 H2 메모리 DB와 임시 base-dir 을 사용한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ZipUploadControllerTest {

    private static final File BASE_DIR;

    static {
        try {
            BASE_DIR = Files.createTempDirectory("aman-zipupload-test").toFile();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("aman.base-dir", BASE_DIR::getAbsolutePath);
        r.add("spring.datasource.url", () -> "jdbc:h2:mem:zipupload;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE");
        r.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        r.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.H2Dialect");
        r.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        r.add("aman.backup.enabled", () -> "false");
        r.add("aman.zip-upload.enabled", () -> "true");
        r.add("aman.zip-upload.allowed-ips", () -> "127.0.0.1");
        r.add("aman.zip-upload.trusted-proxies", () -> "");
        r.add("aman.public-base-url", () -> "https://docs.example.com/");   // 끝의 / 는 제거되어야 함
    }

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private PageRepository pageRepository;
    @Autowired
    private FolderRepository folderRepository;

    private Page page;

    @BeforeEach
    void setUp() {
        pageRepository.deleteAll();
        folderRepository.deleteAll();
        Folder folder = folderRepository.save(Folder.builder().name("메뉴").nums("1234").level(3).build());
        page = pageRepository.save(Page.builder()
                .folder(folder).title("옛 제목").content("옛 본문").aka("1234").status("PUBLISHED").sortOrder(7).build());
    }

    /** 내보내기 형식 ZIP: <제목>.md + images/ */
    private static byte[] zip(Map<String, byte[]> entries) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(bos)) {
            for (Map.Entry<String, byte[]> e : entries.entrySet()) {
                zos.putNextEntry(new ZipEntry(e.getKey()));
                zos.write(e.getValue());
                zos.closeEntry();
            }
        }
        return bos.toByteArray();
    }

    private static byte[] docZip(String markdown) throws IOException {
        Map<String, byte[]> m = new LinkedHashMap<>();
        m.put("문서.md", markdown.getBytes(StandardCharsets.UTF_8));
        m.put("images/a.png", new byte[] {(byte) 0x89, 'P', 'N', 'G'});
        return zip(m);
    }

    private static MockMultipartHttpServletRequestBuilder upload(String fileName, byte[] bytes, String remoteAddr) {
        MockMultipartHttpServletRequestBuilder b = multipart("/aman/zip-upload");
        b.file(new MockMultipartFile("file", fileName, "application/zip", bytes)).contextPath("/aman");
        b.with(req -> {
            req.setRemoteAddr(remoteAddr);
            return req;
        });
        return b;
    }

    @Test
    void replacesContentKeepsStatusAndUsesPublicAbsoluteImageUrl() throws Exception {
        mockMvc.perform(upload("1234.zip", docZip("# 새 제목\n\n본문 ![그림](images/a.png)\n"), "127.0.0.1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("replaced"))
                .andExpect(jsonPath("$.aka").value("1234"))
                .andExpect(jsonPath("$.title").value("새 제목"))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.images").value(1))
                .andExpect(jsonPath("$.imageUrlBase").value("https://docs.example.com/aman/images/"));

        Page after = pageRepository.findById(page.getId()).get();
        assertEquals("새 제목", after.getTitle());
        assertEquals("PUBLISHED", after.getStatus());        // 상태 유지
        assertEquals(Integer.valueOf(7), after.getSortOrder()); // 순서 유지
        // 요청 주소(localhost)가 아니라 설정된 공개 주소로 절대 URL 저장
        assertTrue(after.getContent().contains("](https://docs.example.com/aman/images/"), after.getContent());
        assertFalse(after.getContent().contains("localhost"), after.getContent());

        String rel = after.getContent().replaceAll("(?s).*\\]\\(https://docs\\.example\\.com/aman/images/([^)]+)\\).*", "$1");
        assertTrue(new File(BASE_DIR, "data/images/" + rel).isFile(), "이미지 저장: " + rel);
    }

    @Test
    void unknownAkaIs404() throws Exception {
        mockMvc.perform(upload("9999.zip", docZip("# x"), "127.0.0.1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.aka").value("9999"));
    }

    @Test
    void lockedPageIs409() throws Exception {
        page.setLockUser("kim");
        page.setLockTime(LocalDateTime.now());
        pageRepository.save(page);

        mockMvc.perform(upload("1234.zip", docZip("# x"), "127.0.0.1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.lockUser").value("kim"));
        assertEquals("옛 본문", pageRepository.findById(page.getId()).get().getContent());
    }

    @Test
    void zipWithoutMarkdownIs400() throws Exception {
        Map<String, byte[]> m = new LinkedHashMap<>();
        m.put("readme.txt", "x".getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(upload("1234.zip", zip(m), "127.0.0.1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString(".md")));
    }

    @Test
    void badFileNameIs400() throws Exception {
        mockMvc.perform(upload("../1234.zip.txt", docZip("# x"), "127.0.0.1")).andExpect(status().isBadRequest());
        mockMvc.perform(upload("12 34.zip", docZip("# x"), "127.0.0.1")).andExpect(status().isBadRequest());
    }

    @Test
    void disallowedIpIs403EvenWithSpoofedForwardedFor() throws Exception {
        mockMvc.perform(upload("1234.zip", docZip("# x"), "10.0.0.1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.ip").value("10.0.0.1"));
        mockMvc.perform(upload("1234.zip", docZip("# x"), "10.0.0.1").header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isForbidden());
        assertEquals("옛 본문", pageRepository.findById(page.getId()).get().getContent());
    }

    /** 회귀: 서비스로 옮긴 기존 '가져오기'는 새 DRAFT 문서 + 절대 URL 동작 그대로 */
    @Test
    @org.springframework.security.test.context.support.WithMockUser(username = "admin")
    void legacyImportStillCreatesDraftWithAbsoluteImageUrl() throws Exception {
        MockMultipartHttpServletRequestBuilder b = multipart("/aman/content/import");
        b.file(new MockMultipartFile("file", "any.zip", "application/zip", docZip("# 가져온 문서\n![그림](images/a.png)")))
                .param("folderId", String.valueOf(page.getFolder().getId())).contextPath("/aman");
        mockMvc.perform(b)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("가져온 문서"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.aka", containsString("page-")))
                .andExpect(jsonPath("$.content", containsString("](http://localhost:80/aman/images/")));
        assertEquals(2, pageRepository.count()); // 기존 문서는 그대로, 새 문서 추가
    }

    @Test
    void legacyImportRequiresLogin() throws Exception {
        MockMultipartHttpServletRequestBuilder b = multipart("/aman/content/import");
        b.file(new MockMultipartFile("file", "any.zip", "application/zip", docZip("# 가져온 문서")))
                .param("folderId", String.valueOf(page.getFolder().getId())).contextPath("/aman");
        mockMvc.perform(b).andExpect(status().isForbidden());
        assertEquals(1, pageRepository.count());
    }

    @Test
    void imageUrlBaseFallsBackToRequestOrigin() {
        org.springframework.mock.web.MockHttpServletRequest req = new org.springframework.mock.web.MockHttpServletRequest();
        req.setScheme("http");
        req.setServerName("10.0.0.5");
        req.setServerPort(8080);
        req.setContextPath("/aman20");
        assertEquals("http://10.0.0.5:8080/aman20/images/", ZipUploadController.imageUrlBase("", req));
        assertEquals("http://10.0.0.5:8080/aman20/images/", ZipUploadController.imageUrlBase(null, req));
        assertEquals("https://a.b:7171/aman20/images/", ZipUploadController.imageUrlBase(" https://a.b:7171// ", req));
    }

    @Test
    void akaFromFileName() {
        assertEquals("1234", ZipUploadController.akaFromFileName("1234.zip"));
        assertEquals("1234", ZipUploadController.akaFromFileName("1234.ZIP"));
        assertEquals("page-1c6f", ZipUploadController.akaFromFileName("C:\\tmp\\page-1c6f.zip"));
        assertEquals(null, ZipUploadController.akaFromFileName("1234.md"));
        assertEquals(null, ZipUploadController.akaFromFileName(".zip"));
        assertEquals(null, ZipUploadController.akaFromFileName(null));
    }
}
