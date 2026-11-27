# 구현 계획: 어드민 로그아웃 시 세션 유출 차단 및 블랙리스트 보완

어드민 사용자가 로그아웃을 수행한 후에도 일반 도움말 및 문서 조회 페이지(`/docs`, `/manual/**`)에 계속 접근할 수 있는 세션 유지 버그(테스트 #2)를 해결하기 위한 계획입니다.

## 1. Goal Description
현재 어드민 로그아웃 API 호출 시, JWT 쿠키 만료 및 토큰 블랙리스트 등록만 처리할 뿐 WAS의 **`HttpSession`을 무효화(invalidate)하지 않아** 기존 세션에 남아있던 `AMAN_ERP_AUTHENTICATED` 등의 인증 정보가 파기되지 않고 유지되는 취약점이 있습니다.
이를 보완하기 위해:
1. 어드민 로그아웃(`/auth/logout`) 시 **`session.invalidate()`**를 강제 호출하여 세션을 파기합니다.
2. 쿠키에 토큰이 없더라도 **`Authorization: Bearer` 헤더**로 전송된 Access Token을 추출하여 블랙리스트에 확실히 등록하도록 개선합니다.

---

## 2. 기존 보안 연동 기능 영향도 분석 (영향성 無)

기존에 구현된 네트워크 보안(SSO) 및 IP 우회 프리패스 기능과 아무런 충돌이나 부작용을 일으키지 않는 이유를 설명합니다.

*   **기존 SSO 연동 정상 유지**:
    *   SSO 연동 시 `aman_opener.jsp`를 거쳐 발행된 토큰은 `ErpTokenValidationFilter`에서 정상 작동하며 세션을 수립합니다.
    *   이번에 수정되는 `session.invalidate()` 코드는 오직 **어드민이 `/auth/logout` API를 명시적으로 호출할 때만** 실행됩니다.
    *   따라서 일반 사용자의 도움말 조회(SSO 세션) 라이프사이클에는 전혀 개입하지 않으므로 기존 연동 동작은 100% 안전하게 보존됩니다.
*   **사내 IP 프리패스 무영향**:
    *   사내 IP 감지 및 프리패스(Bypass) 로직은 요청 시마다 `isInternalIp(clientIp)`를 수행하여 작동합니다.
    *   로그아웃 시 세션이 파기되더라도, 사내망 내에 있는 사용자가 다음 페이지를 요청하면 필터가 다시 IP를 감지하여 세션을 자동으로 즉시 재수립해주므로 프리패스 권한이 막히는 오동작은 발생하지 않습니다.
*   **블랙리스트 메커니즘 보강**:
    *   기존에는 브라우저 환경에 따라 쿠키 기반 로그아웃이 먹히지 않아 토큰이 살아서 넘어오면 그냥 뚫렸지만, 이제는 `Authorization` 헤더까지 추출해 블랙리스트에 집어넣으므로 오히려 보안의 구멍이 단단히 메워지게 됩니다.

---

## 3. Proposed Changes

### [Component] Backend Authentication (`kr.co.kfs.aman.controller`)

#### [MODIFY] `AuthController.java` ([AuthController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/AuthController.java))
로그아웃 `/auth/logout` API 핸들러에서 Authorization 헤더에서도 `accessToken`을 추출할 수 있는 Fallback을 제공하고, Tomcat HTTP 세션 무효화 로직을 추가합니다.

*   **변경 대상 코드 블록 (L101-L138)**:
```java
    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String accessToken = null;
        String refreshToken = null;

        // 1. 쿠키에서 토큰 탐색
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

        // 2. 쿠키에 없는 경우 Authorization Header(Bearer)에서 Access Token 추출 시도 (보완)
        if (accessToken == null) {
            String bearerToken = request.getHeader("Authorization");
            if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
                accessToken = bearerToken.substring(7);
            }
        }

        // 3. Refresh Token DB에서 파기
        if (refreshToken != null) {
            refreshTokenRepository.deleteByToken(refreshToken);
        }

        // 4. Access Token 블랙리스트 차단 (로그아웃 세션 원천 차단)
        if (accessToken != null && tokenProvider.validateToken(accessToken)) {
            TokenBlacklist blacklist = TokenBlacklist.builder()
                    .token(accessToken)
                    .expiresAt(LocalDateTime.now().plusSeconds(accessExpirationTime / 1000))
                    .build();
            blacklistRepository.save(blacklist);
        }

        // 5. 쿠키 파기 (MaxAge = 0)
        setCookie(response, "access_token", "", 0);
        setCookie(response, "refresh_token", "", 0);

        // 6. Tomcat HttpSession 무효화 (추가: ERP 연동용 세션 속성 등도 모두 파기되도록 함)
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.ok("로그아웃 되었습니다.");
    }
```

---

## 4. Verification Plan

### Manual Verification
1. 브라우저에서 어드민 로그인(`/aman/admin`)을 진행합니다.
2. `/aman/manual/1261` 및 `/aman/docs`가 로그인 상태로 정상 열리는지 확인합니다.
3. 우상단 어드민 메뉴에서 **[로그아웃]** 버튼을 클릭하여 로그아웃 처리를 완료합니다.
4. 다시 `http://localhost:5173/aman/manual/1261` 이나 `http://localhost:5173/aman/docs` 진입을 시도합니다.
5. 토큰 및 세션 정보가 무효화되었으므로 비인가 차단 페이지(`/aman/expired`)로 정상 튕겨 나가는지(접속 불가 상태가 되는지) 최종 확인합니다.
