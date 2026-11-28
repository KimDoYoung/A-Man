package kr.co.kfs.aman.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 비로그인 요청 차단 검증 (docs/A-Man-보안관련설정.md 7장 2, 3번)
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    private static final File BASE_DIR;

    static {
        try {
            BASE_DIR = Files.createTempDirectory("aman-security-test").toFile();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    // 실제 DB를 건드리지 않도록 H2 메모리 DB와 임시 base-dir 사용
    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("aman.base-dir", BASE_DIR::getAbsolutePath);
        r.add("spring.datasource.url", () -> "jdbc:h2:mem:securitytest;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE");
        r.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        r.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.H2Dialect");
        r.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        r.add("aman.backup.enabled", () -> "false");
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminApiWithHtmlAcceptHeaderIsNotBypassed() throws Exception {
        // 이전에는 Accept: text/html 만 붙이면 컨트롤러까지 도달했음 -> 이제 데이터 대신 SPA index.html
        mockMvc.perform(get("/admin/settings").accept(MediaType.TEXT_HTML))
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void adminApiWithoutLoginIsForbidden() throws Exception {
        mockMvc.perform(get("/admin/settings").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/admin/settings").accept(MediaType.TEXT_HTML))
                .andExpect(status().isForbidden());
    }

    @Test
    void folderWriteWithoutLoginIsForbidden() throws Exception {
        mockMvc.perform(delete("/folder/1")).andExpect(status().isForbidden());
        mockMvc.perform(post("/folder").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/folder/regenerate-all")).andExpect(status().isForbidden());
        mockMvc.perform(post("/folder/clear-all-nums")).andExpect(status().isForbidden());
    }

    @Test
    void contentUploadWithoutLoginIsForbidden() throws Exception {
        mockMvc.perform(multipart("/content/image")).andExpect(status().isForbidden());
        mockMvc.perform(multipart("/content/import")).andExpect(status().isForbidden());
    }
}
