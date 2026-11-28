package kr.co.kfs.aman.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** JWT 서명키 결정 규칙 (docs/A-Man-보안관련설정.md 3.3) */
class JwtTokenProviderTest {

    private static final String LONG = "0123456789abcdef0123456789abcdef-long-enough";

    @TempDir
    Path tmp;

    @Test
    void envWinsOverPropertyAndFile() {
        Path key = tmp.resolve("db/jwt.key");
        assertEquals(LONG + "-env", JwtTokenProvider.resolveSecret(LONG + "-env", LONG + "-prop", key));
        assertFalse(Files.exists(key));
    }

    @Test
    void propertyUsedWhenNoEnv() {
        Path key = tmp.resolve("db/jwt.key");
        assertEquals(LONG, JwtTokenProvider.resolveSecret(" ", LONG, key));
        assertFalse(Files.exists(key));
    }

    @Test
    void keyFileCreatedOnceAndReused() throws Exception {
        Path key = tmp.resolve("db/jwt.key");
        String first = JwtTokenProvider.resolveSecret(null, "", key);
        assertTrue(Files.exists(key));
        assertEquals("rw-------", PosixFilePermissions.toString(Files.getPosixFilePermissions(key)));
        assertEquals(first, JwtTokenProvider.resolveSecret(null, "", key)); // 재기동 시 같은 키

        Path other = tmp.resolve("other/db/jwt.key");
        assertNotEquals(first, JwtTokenProvider.resolveSecret(null, null, other)); // 서버(BASE_DIR)마다 다른 키
    }

    @Test
    void shortKeyRejected() throws Exception {
        assertThrows(IllegalStateException.class, () -> JwtTokenProvider.resolveSecret("short", null, tmp.resolve("k")));
        Path key = tmp.resolve("db/jwt.key");
        Files.createDirectories(key.getParent());
        Files.write(key, "tiny".getBytes(StandardCharsets.UTF_8));
        assertThrows(IllegalStateException.class, () -> JwtTokenProvider.resolveSecret(null, null, key));
    }
}
