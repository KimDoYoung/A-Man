package kr.co.kfs.aman.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {

    @Value("${spring.security.jwt.secret:defaultSecretKeyForAManSystemWhichIsAtLeast256BitsLongAndSecure}")
    private String secretKey;

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
        String keySource = "aman".equals(instance) ? secretKey : secretKey + ":" + instance;
        this.key = Keys.hmacShaKeyFor(keySource.getBytes(StandardCharsets.UTF_8));
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
