# A-Man 보안 관련 설정

- 작성일: 2026-11-28
- 기준: `main` 브랜치 소스 (커밋 `6a9a0ec`) + 이 문서와 함께 반영한 X-Forwarded-For 위조 방지 / jskn 검사 해제 수정분
- 범위: 백엔드(Spring Boot, `kr.co.kfs.aman`) 인증·인가·접근 제한, 환경별 프로퍼티
- 이 문서에는 비밀키·비밀번호 **값**을 적지 않는다. 위치만 적는다.

---

## 1. 전체 구조 요약

A-Man 은 사용자 종류에 따라 서로 다른 세 가지 보호 장치를 쓴다.

| 대상 | 경로 | 보호 장치 | 구현 위치 |
|---|---|---|---|
| 문서 작성자 (한국펀드서비스 직원) | `/admin/**` API, 문서 편집 API | JWT (쿠키 / Bearer) | `security/JwtAuthenticationFilter`, `security/JwtTokenProvider`, `controller/AuthController` |
| 매뉴얼 열람자 (자산운용사 사원) | `/docs/**`, `/manual/**` | ERP 발급 HMAC 토큰 또는 내부 IP 판정 → 세션 | `security/ErpTokenValidationFilter` |
| 문서 일괄 교체 (운영 도구) | `/zip-upload` | IP 허용 목록 | `config/ZipUploadIpFilter`, `config/ZipUploadConfig` |

Spring Security 설정은 `config/SecurityConfig.java` 한 곳에 있다.

```
요청 → JwtAuthenticationFilter → ErpTokenValidationFilter → (URL 인가 규칙) → 컨트롤러
          (JWT 있으면 인증 설정)    (/docs,/manual 만 검사)      (/admin/ API만 인증 요구)
/zip-upload 는 별도 서블릿 필터(ZipUploadIpFilter)가 multipart 처리 전에 차단
```

---

## 2. Spring Security 공통 설정 (`config/SecurityConfig.java`)

| 항목 | 현재 값 | 비고 |
|---|---|---|
| HTTP Basic | 사용 안 함 | |
| CSRF | **사용 안 함** | 인증이 쿠키 기반이므로 위험 요소 (7장) |
| CORS | `localhost:8080`, `localhost:5173`, `127.0.0.1:8080`, `127.0.0.1:5173` 만 허용, credentials 허용 | 운영은 같은 출처(same-origin)로 서비스 |
| X-Frame-Options | **사용 안 함** | ERP 화면 iframe 내장용으로 보임 |
| 세션 정책 | `IF_REQUIRED` | ERP 열람 인증을 Tomcat 세션에 저장 |
| 비밀번호 인코더 | `NoOpPasswordEncoder` (평문) | 7장 |

### URL 인가 규칙

```
URI 에 "/admin/" 포함                                   → 인증 필요 (메서드·헤더 무관)
/folder/**, /content/** 의 POST·PUT·PATCH·DELETE        → 인증 필요
그 외 모든 요청                                          → permitAll
```

- 비로그인 요청이 막히면(authentication entry point):
  - `GET` + `Accept: text/html` (브라우저 새로고침) → SPA `index.html` 로 forward. 화면은 뜨지만 API 호출은 막히고 프론트가 로그인으로 보낸다. 컨트롤러 데이터는 내려가지 않는다.
  - 그 외 → 403.
- `/user`, `/assets`, `/auth`, `/docs`, `/manual`, `/health`, `/history`, `/ip` 와 `/folder`·`/content` 의 GET 은 Spring Security 단계에서 통과하며, 필요한 검사는 컨트롤러가 직접 한다 (4장 표).
- 검증 테스트: `backend/src/test/java/kr/co/kfs/aman/config/SecurityConfigTest.java`

---

## 3. 문서 작성자 인증 (JWT)

### 3.1 로그인 `POST /auth/login`
1. `username` 으로 **활성 사용자(`is_active = 1`)** 조회.
2. 비밀번호를 DB 값과 **평문 비교**.
3. Access Token(기본 1시간), Refresh Token(기본 14일) 발급.
4. Refresh Token 은 DB(`refresh_token`)에 사용자당 1개만 보관 (기존 것 삭제 후 저장).
5. 두 토큰을 **HttpOnly 쿠키**로 내려준다. 쿠키 path 는 컨텍스트 경로(`/aman`, `/aman20`)로 한정해 인스턴스 간 공유를 막는다. Access Token 은 응답 본문에도 포함된다.
   - 쿠키에 `Secure`, `SameSite` 속성은 지정하지 않는다.

### 3.2 요청 인증 `JwtAuthenticationFilter`
- 토큰 위치: 쿠키 `access_token` 우선, 없으면 `Authorization: Bearer`.
- 검증: HS256 서명, 만료, 로그아웃 블랙리스트(`token_blacklist`).
- 성공 시 `ROLE_<role 대문자>` 권한으로 SecurityContext 설정 (`ROLE_ADMIN` 등).

### 3.3 서명 키 `JwtTokenProvider`
- 키 결정 순서 (2026-11-28 변경, 소스 기본키 삭제):
  1. 환경변수 `AMAN_JWT_SECRET` (예: Tomcat `setenv.sh`)
  2. 프로퍼티 `spring.security.jwt.secret` (git 에 들어가는 파일에는 넣지 않는다)
  3. `BASE_DIR/db/jwt.key` — 없으면 첫 기동 시 무작위 256비트 키를 생성, 권한 600
- 키가 32바이트 미만이거나 키 파일을 만들 수 없으면 기동 실패.
- 현재 모든 환경은 3번(키 파일)을 사용한다. 서버(BASE_DIR)마다 키가 다르다.
- 키 파일을 지우거나 바꾸면 기존 로그인 토큰이 모두 무효화된다(재로그인 필요). 매뉴얼 열람자는 영향 없음.
- docker 환경은 BASE_DIR 이 호스트 볼륨이어야 컨테이너 재생성 후에도 키가 유지된다.
- 멀티 인스턴스: 인스턴스명이 `aman` 이 아니면 키에 `:<instance>` 를 붙여 다른 인스턴스 토큰을 거부.

### 3.4 갱신 / 로그아웃
- `POST /auth/refresh`: 쿠키의 Refresh Token 서명 + DB 존재·만료 + 사용자 활성 여부 확인 후 Access Token 재발급.
- `POST /auth/logout`: Refresh Token DB 삭제, Access Token 블랙리스트 등록, 쿠키 만료, Tomcat 세션 무효화.

### 3.5 초기 관리자
- `config/InitialAdminRunner` 가 기동 시 관리자 계정(`role = admin`)을 생성한다.

---

## 4. 컨트롤러별 권한 검사 현황

Spring Security 가 막지 않는 경로는 컨트롤러가 직접 검사한다. 현재 상태:

| 경로 | 쓰기 API | 컨트롤러 내 검사 | 판정 |
|---|---|---|---|
| `/admin/backup`, `/admin/logs`, `/admin/settings`, `/admin/user-settings`, `/admin/work-stack`, `/admin/video`, `/admin/image-work`, `/admin/page-list` | 있음 | Security 에서 로그인 요구, 역할 구분 없음 | 로그인한 누구나 사용 가능 |
| `/user` | 생성·조회·수정·삭제 | `isAdmin()` / 본인 확인 | 양호 |
| `/assets` | 업로드·삭제 | `isAdmin()` | 양호 |
| `/content` (저장, 삭제, lock/unlock) | 있음 | 로그인 확인 | 양호 |
| `/content/image` (이미지 업로드) | 있음 | Security 에서 로그인 요구 | 양호 (2026-11-28 수정) |
| `/content/import` (zip 가져오기) | 있음 | Security 에서 로그인 요구 | 양호 (2026-11-28 수정) |
| `/content/export` | 읽기성 | Security 에서 로그인 요구 (POST) | 양호 |
| `/folder` (생성·수정·삭제·번호 재생성·번호 초기화) | 있음 | Security 에서 로그인 요구 | 양호 (2026-11-28 수정) |
| `/docs`, `/manual` | 없음 (조회) | ERP 필터 (5장) | |
| `/health`, `/history`, `/ip` | 없음 | 없음 | 공개 정보 |

> 2026-11-28 이전에는 `/admin/**` 규칙이 `Accept: text/html` 헤더로 우회되었고, `/folder` 쓰기 API 와 `/content/image`, `/content/import` 는 인증 검사가 없었다. 현재는 모두 Security 단계에서 차단된다.

---

## 5. 매뉴얼 열람 보호 (`ErpTokenValidationFilter`)

### 5.1 적용 대상
- URI 에 `/docs` 또는 `/manual` 이 포함된 요청.
- 제외: `/security/` 포함 경로(handshake 등), JWT 로그인 사용자.
- 프로퍼티 `aman.security.erp-check.enabled=false` 이면 **전부 통과** (jskn 전용, 6장).

### 5.2 판정 순서 (하나라도 만족하면 통과)
1. JWT 로그인 사용자.
2. 내부 IP (`aman.security.internal-ip.enabled=true` 이고 IP 가 `aman.security.internal-ips` 와 접두어/정확 일치) → 세션에 `AMAN_ERP_AUTHENTICATED` 기록.
3. 세션에 이미 `AMAN_ERP_AUTHENTICATED`.
4. URL 파라미터 `token` 검증 성공 → 세션 기록.
5. 그 외 → 403 HTML.

### 5.3 ERP 토큰 형식
```
Base64URL( userId | timestamp(ms) | clientIp | HMAC-SHA256(userId|timestamp|clientIp) )
```
- 유효 기간 15초, 미래 시각은 1분까지 허용.
- 토큰 안의 IP 와 요청 IP 가 같아야 함 (루프백끼리는 동일 취급).
- HMAC 대칭키는 **소스에 하드코딩**되어 있고 ERP 측과 공유한다 (`aman.security.encrypt.salt` 와 같은 값).

### 5.4 본문 암호화 handshake (`/docs/security/handshake`)
- 서버가 `salt + 클라이언트IP + 10분 블록` 으로 동적 키를 만들고, 이를 고정 클라이언트 키(`SecurityUtil.STATIC_CLIENT_KEY`, 프론트엔드 번들에 포함)로 AES-256-CBC 암호화해 전달.
- 문서 본문은 동적 키로 암호화해 내려준다.
- 고정 키가 프론트 번들에 있으므로 **전송 난독화 수준**이며 접근 통제 수단은 아니다.

### 5.5 클라이언트 IP 판정 (`SecurityUtil.getClientIp`) — 이번 수정
- **이전**: `X-Forwarded-For` → `Proxy-Client-IP` → `WL-Proxy-Client-IP` → `remoteAddr` 순으로 헤더를 그대로 신뢰. `X-Forwarded-For: 127.0.0.1` 한 줄로 내부 IP 판정 우회 가능했음.
- **현재**: `remoteAddr` 기준. `remoteAddr` 가 `aman.security.trusted-proxies` 에 속할 때만 `X-Forwarded-For` 의 **마지막 값**(프록시가 직접 본 IP)을 사용. 판정 로직은 `ZipUploadIpFilter.resolveClientIp` 를 공유.
- 영향 범위: 내부 IP 판정, ERP 토큰 IP 대조, handshake 키, `/docs/security/ip`.
- `SystemController` 의 `/ip` 는 표시용으로 헤더를 그대로 읽는다 (보안 판정에 사용하지 않음).

---

## 6. 환경별 설정 (`application-<AMAN_MODE>.properties`)

| 환경 | 용도 | 배포 형태 | `erp-check.enabled` | `internal-ip.enabled` | `internal-ips` | `trusted-proxies` | zip-upload |
|---|---|---|---|---|---|---|---|
| test (119) | **실운영** | Tomcat 8.5 직접 | true (기본) | false | (미사용) | 없음 | 꺼짐 |
| omen | 보안 중요 | 로컬 docker | true (기본) | false | (미사용) | 없음 | 꺼짐 |
| t3600 | 보안 중요 | 로컬 docker | true (기본) | false | (미사용) | 없음 | 꺼짐 |
| dell6820 | | | true (기본) | false | (미사용) | 없음 | 꺼짐 |
| jskn | 개인 가정용 서버, 보안 불필요, HTTP | 원격 docker + nginx 프록시 | **false** | true | 사설대역 등 | `172.18.` | 꺼짐 (`trusted-proxies=172.18.`) |
| local | 개발 PC | | true (기본) | true | 루프백, `192.168.`, `172.20.` | 없음 | 켜짐 (루프백만 허용) |

- 119, omen, t3600 은 내부 IP 우회가 꺼져 있으므로 매뉴얼 열람은 **반드시 ERP 토큰**을 거친다.
- jskn 은 매뉴얼 열람 검사를 하지 않는다. 단 문서 편집(`/admin`)의 JWT 로그인은 유지된다.
- jskn 의 `172.18.` 은 docker 네트워크(nginx 컨테이너 `172.18.0.8`, 게이트웨이 `172.18.0.1`) 대역이다.
- 공통 프로퍼티: JWT 만료(`spring.security.jwt.access-expiration`, `refresh-expiration`), `aman.security.encrypt.salt`.

### 프록시 앞단 배치 시 주의
앞에 nginx / L4 등 프록시를 두는 환경은 반드시 `aman.security.trusted-proxies` 에 프록시 IP 를 넣어야 한다. 비워 두면 모든 요청이 프록시 IP 로 판정되어
- 프록시 IP 가 `internal-ips` 에 속하면 → 외부 사용자 전원이 내부로 판정 (무사통과)
- 속하지 않으면 → ERP 토큰 IP 대조가 전부 실패 (전원 차단)

---

## 7. 알려진 취약점 / 개선 필요 사항

중요도 순. **[수정됨]** 표시 외에는 현재 그대로 남아 있다.

| # | 항목 | 위험 | 권장 조치 |
|---|---|---|---|
| 1 | `X-Forwarded-For` 위조로 내부 IP 판정 우회 | 높음 | **[수정됨]** 5.5 참조 |
| 2 | `/folder` 쓰기 API, `/content/image`, `/content/import` 에 인증 검사 없음 | 높음 | **[수정됨]** `/folder/**`, `/content/**` 의 쓰기 메서드 전부 인증 필요 (2장) |
| 3 | `/admin/**` 규칙이 `Accept: text/html` 헤더로 우회됨 | 높음 | **[수정됨]** 예외 제거, 비로그인 HTML 새로고침은 index.html 로 forward (2장) |
| 4 | JWT 서명키가 소스 기본값 사용 | 높음 | **[수정됨]** 환경변수 > 프로퍼티 > `BASE_DIR/db/jwt.key` 자동 생성 (3.3) |
| 5 | ERP HMAC 키 / 암호화 salt / 클라이언트 키가 소스·프로퍼티에 평문 | 높음 | ERP 와 키 교체 후 외부 주입 (환경변수 등) |
| 6 | 비밀번호 평문 저장·비교 (`NoOpPasswordEncoder`) | 높음 – DB 파일 유출 시 계정 노출 | BCrypt 전환 + 기존 비밀번호 마이그레이션 |
| 7 | CSRF 비활성 + 쿠키 인증 + SameSite 미지정 | 중간 | 쿠키 `SameSite=Lax/Strict`, 운영은 `Secure` |
| 8 | `/admin` API 역할 구분 없음 | 중간 | 관리 기능(백업, 설정, 로그)에 `ROLE_ADMIN` 요구 |
| 9 | ERP 토큰 15초 내 재사용 가능 | 낮음 | 사용한 토큰 서명 캐시로 1회용 처리 |
| 10 | 서명 검증 실패 시 기대 서명값을 로그에 기록, 비교가 상수시간 아님 | 낮음 | 로그에서 제거, `MessageDigest.isEqual` 사용 |
| 11 | `internal-ips` 접두어 비교 (`183.96.184.1` 이 `183.96.184.1x` 도 허용) | 낮음 (jskn 한정) | 정확 일치 항목은 `.` 로 끝나지 않게 하고 비교 규칙을 zip-upload 와 통일 |

---

## 8. 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-11-28 | `SecurityUtil.getClientIp` 신뢰 프록시 기반으로 변경, `aman.security.trusted-proxies` 추가 (전 환경) |
| 2026-11-28 | `aman.security.erp-check.enabled` 추가, jskn 은 `false` (매뉴얼 열람 무검사), jskn `trusted-proxies=172.18.` |
| 2026-11-28 | `/admin/**` 의 `Accept: text/html` 우회 제거, `/folder`·`/content` 쓰기 API 인증 필수화, `SecurityConfigTest` 추가 |
| 2026-11-28 | JWT 서명키 소스 기본값 제거, `AMAN_JWT_SECRET` / `BASE_DIR/db/jwt.key` 자동 생성, `JwtTokenProviderTest` 추가 |
