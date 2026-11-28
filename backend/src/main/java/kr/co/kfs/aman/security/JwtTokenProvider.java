package kr.co.kfs.aman.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.util.Base64;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtTokenProvider.class);

    /** 서명키 환경변수 (setenv.sh 등). 지정하면 키 파일보다 우선한다. */
    static final String SECRET_ENV = "AMAN_JWT_SECRET";
    /** BASE_DIR 기준 자동 생성 키 파일 */
    static final String KEY_FILE = "db/jwt.key";
    /** HS256 최소 키 길이 (바이트) */
    private static final int MIN_KEY_BYTES = 32;

    // 서명키 우선순위: 환경변수 AMAN_JWT_SECRET > 프로퍼티 spring.security.jwt.secret > BASE_DIR/db/jwt.key (없으면 자동 생성)
    // 소스에 박힌 기본키는 사용하지 않는다. (docs/A-Man-보안관련설정.md 7장 4번)
    @Value("${spring.security.jwt.secret:}")
    private String secretKey;

    @Value("${aman.base-dir:/home/kdy987/work/aman/aman-base-dir}")
    private String baseDir;

    @Value("${spring.security.jwt.access-expiration:3600000}") // 1 hour
    private long accessExpirationTime;

    @Value("${spring.security.jwt.refresh-expiration:1209600000}") // 14 days
    private long refreshExpirationTime;

    // 멀티 인스턴스: 인스턴스별로 서명키를 달리하여 다른 인스턴스의 토큰을 거부한다. (docs/multi-instance-설계.md 3.2)
    @Value("${aman.instance:aman}")
    private String instance;

    private Key key;

    @PostConstruct
    protected void init() {
        // 기본 인스턴스(aman)는 기존 키를 그대로 사용하여 발급된 토큰과의 호환성을 유지
        String secret = resolveSecret(System.getenv(SECRET_ENV), secretKey, Paths.get(baseDir, KEY_FILE));
        String keySource = "aman".equals(instance) ? secret : secret + ":" + instance;
        this.key = Keys.hmacShaKeyFor(keySource.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 서명키 결정. env → property → 키 파일 순. 키 파일이 없으면 무작위 256비트 키를 만들어 저장한다(권한 600).
     */
    static String resolveSecret(String envSecret, String propertySecret, Path keyFile) {
        if (envSecret != null && !envSecret.trim().isEmpty()) {
            log.info("JWT 서명키: 환경변수 {} 사용", SECRET_ENV);
            return requireLength(envSecret.trim(), SECRET_ENV);
        }
        if (propertySecret != null && !propertySecret.trim().isEmpty()) {
            log.info("JWT 서명키: 프로퍼티 spring.security.jwt.secret 사용");
            return requireLength(propertySecret.trim(), "spring.security.jwt.secret");
        }
        try {
            if (!Files.exists(keyFile)) {
                createKeyFile(keyFile);
                log.info("JWT 서명키: 키 파일 새로 생성 {}", keyFile);
            } else {
                log.info("JWT 서명키: 키 파일 사용 {}", keyFile);
            }
            String fromFile = new String(Files.readAllBytes(keyFile), StandardCharsets.UTF_8).trim();
            return requireLength(fromFile, keyFile.toString());
        } catch (IOException e) {
            throw new IllegalStateException("JWT 서명키 파일을 읽거나 만들 수 없습니다: " + keyFile
                    + " (BASE_DIR 권한을 확인하거나 환경변수 " + SECRET_ENV + " 를 지정하세요)", e);
        }
    }

    private static void createKeyFile(Path keyFile) throws IOException {
        if (keyFile.getParent() != null) {
            Files.createDirectories(keyFile.getParent());
        }
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        byte[] content = Base64.getEncoder().encodeToString(random).getBytes(StandardCharsets.UTF_8);
        try {
            Files.write(keyFile, content, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        } catch (FileAlreadyExistsException e) {
            return; // 동시에 다른 쪽이 만든 경우 그 파일을 사용
        }
        try {
            Files.setPosixFilePermissions(keyFile, PosixFilePermissions.fromString("rw-------"));
        } catch (UnsupportedOperationException e) {
            // Windows 등 POSIX 미지원 파일시스템
        }
    }

    private static String requireLength(String secret, String source) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_KEY_BYTES) {
            throw new IllegalStateException("JWT 서명키가 너무 짧습니다 (" + source + "). "
                    + MIN_KEY_BYTES + "바이트 이상이어야 합니다.");
        }
        return secret;
    }

    public String createAccessToken(String username, String role) {
        Claims claims = Jwts.claims().setSubject(username);
        claims.put("role", role);
        Date now = new Date();
        Date validity = new Date(now.getTime() + accessExpirationTime);

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String createRefreshToken(String username) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + refreshExpirationTime);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public String getRole(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get("role", String.class);
    }
}
