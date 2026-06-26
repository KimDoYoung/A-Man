package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.RefreshToken;
import kr.co.kfs.aman.model.TokenBlacklist;
import kr.co.kfs.aman.model.User;
import kr.co.kfs.aman.repository.RefreshTokenRepository;
import kr.co.kfs.aman.repository.TokenBlacklistRepository;
import kr.co.kfs.aman.repository.UserRepository;
import kr.co.kfs.aman.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenBlacklistRepository blacklistRepository;
    private final JwtTokenProvider tokenProvider;

    @Value("${spring.security.jwt.access-expiration:3600000}")
    private long accessExpirationTime;

    @Value("${spring.security.jwt.refresh-expiration:1209600000}")
    private long refreshExpirationTime;

    public AuthController(UserRepository userRepository,
                          RefreshTokenRepository refreshTokenRepository,
                          TokenBlacklistRepository blacklistRepository,
                          JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.blacklistRepository = blacklistRepository;
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest, HttpServletResponse response) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        // 1. 활성 사용자(is_active = 1)만 체크하도록 요건 반영
        Optional<User> userOpt = userRepository.findByUsernameAndIsActive(username, 1);
        if (!userOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("존재하지 않거나 비활성화된 사용자입니다.");
        }

        User user = userOpt.get();
        
        // 2. 개발 시 비밀번호 평문 비교 요건 반영
        if (!password.equals(user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("비밀번호가 일치하지 않습니다.");
        }

        // 3. 토큰 발급
        String accessToken = tokenProvider.createAccessToken(user.getUsername(), user.getRole());
        String refreshToken = tokenProvider.createRefreshToken(user.getUsername());

        // 4. Refresh Token 저장 (기존 토큰이 있을 경우 덮어쓰거나 삭제 후 신규 저장)
        refreshTokenRepository.deleteByUserId(user.getId());
        
        RefreshToken tokenEntity = RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshExpirationTime / 1000))
                .build();
        refreshTokenRepository.save(tokenEntity);

        // 5. 쿠키 설정 (HttpOnly 옵션을 주어 XSS 방어)
        setCookie(response, "access_token", accessToken, (int) (accessExpirationTime / 1000));
        setCookie(response, "refresh_token", refreshToken, (int) (refreshExpirationTime / 1000));

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("id", user.getId());
        responseBody.put("username", user.getUsername());
        responseBody.put("name", user.getName());
        responseBody.put("email", user.getEmail());
        responseBody.put("role", user.getRole());
        responseBody.put("accessToken", accessToken);
        responseBody.put("message", "로그인 성공");

        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String accessToken = null;
        String refreshToken = null;

        // 쿠키에서 토큰 탐색
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("access_token".equals(cookie.getName())) {
                    accessToken = cookie.getValue();
                } else if ("refresh_token".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                }
            }
        }

        // 1. Refresh Token DB에서 파기
        if (refreshToken != null) {
            refreshTokenRepository.deleteByToken(refreshToken);
        }

        // 2. Access Token 블랙리스트 차단 (로그아웃 세션 원천 차단)
        if (accessToken != null && tokenProvider.validateToken(accessToken)) {
            TokenBlacklist blacklist = TokenBlacklist.builder()
                    .token(accessToken)
                    .expiresAt(LocalDateTime.now().plusSeconds(accessExpirationTime / 1000))
                    .build();
            blacklistRepository.save(blacklist);
        }

        // 3. 쿠키 파기 (MaxAge = 0)
        setCookie(response, "access_token", "", 0);
        setCookie(response, "refresh_token", "", 0);

        return ResponseEntity.ok("로그아웃 되었습니다.");
    }

    @PostMapping("/refresh")
    @Transactional
    public ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = null;

        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("refresh_token".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null || !tokenProvider.validateToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 Refresh Token 입니다.");
        }

        // DB에서 Refresh Token 확인
        Optional<RefreshToken> tokenEntityOpt = refreshTokenRepository.findByToken(refreshToken);
        if (!tokenEntityOpt.isPresent() || tokenEntityOpt.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("만료되거나 존재하지 않는 세션입니다. 재로그인이 필요합니다.");
        }

        RefreshToken tokenEntity = tokenEntityOpt.get();
        User user = tokenEntity.getUser();

        // 1. 활성 사용자 여부 재확인
        if (user.getIsActive() != 1) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("비활성화된 사용자 계정입니다.");
        }

        // 2. 새로운 Access Token 재발급 및 쿠키 저장
        String newAccessToken = tokenProvider.createAccessToken(user.getUsername(), user.getRole());
        setCookie(response, "access_token", newAccessToken, (int) (accessExpirationTime / 1000));

        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("message", "토큰 갱신 성공");
        responseBody.put("accessToken", newAccessToken);
        return ResponseEntity.ok(responseBody);
    }

    private void setCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }
}
