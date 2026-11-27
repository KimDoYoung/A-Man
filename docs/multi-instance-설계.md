# 멀티 인스턴스 설계 (multi-instance-설계.md)

하나의 소스에서 `aman.war`, `aman20.war`처럼 **WAR 이름만 바꿔** 배포하고,
각 WAR가 서로 완전히 독립된 문서 도움말 시스템으로 동작하게 한다.

- `http://localhost/aman`   → base-dir `/data/asseterp/aman`   (기존 그대로)
- `http://localhost/aman20` → base-dir `/data/asseterp/aman20` (신규)

브랜치: `feat/multi-instance`

---

## 1. 용어

| 용어 | 의미 | 예 |
|---|---|---|
| 컨텍스트 경로 | Tomcat이 WAR 파일명으로 정하는 URL 접두어 | `/aman`, `/aman20` |
| 인스턴스 이름 | 컨텍스트 경로에서 `/`를 뗀 이름 | `aman`, `aman20` |
| 기본 인스턴스 | 인스턴스 이름이 `aman`인 경우 (ROOT 배포·로컬 bootRun 포함) | `aman` |

---

## 2. 현재 구조의 문제

Tomcat 배포 시 컨텍스트 경로는 WAR 파일명으로 결정되므로
(`server.servlet.context-path`는 내장 톰캣 bootRun에서만 의미가 있음)
백엔드 API 자체는 `aman20.war`로 올리면 `/aman20`에서 응답한다.
그러나 아래 항목 때문에 독립 운영이 불가능하다.

| # | 문제 | 위치 | 결과 |
|---|---|---|---|
| 1 | base-dir이 프로필(`spring.profiles.active`)로만 결정 | `application-<profile>.properties` | 같은 Tomcat의 두 WAR가 **같은 DB·이미지·로그·백업** 사용 |
| 2 | 프론트엔드 `/aman` 하드코딩 | `vite.config.ts`, `App.tsx`, `apiClient.ts`, LogPages, BackupPages, EditorActionBar, DocUserTopBar, VideoManagePage | aman20 화면이 aman API를 호출 |
| 3 | 백엔드 `/aman` 하드코딩 | `ManualController` (breadcrumb, 이전/다음, favicon), help html favicon | ERP 팝업 링크가 aman으로 이동 |
| 4 | 인증 쿠키 path가 `/` | `AuthController.setCookie` | 두 시스템이 `access_token`/`refresh_token` 쿠키를 공유 → 서로 로그아웃시킴 |
| 5 | JWT 서명키가 동일 | `JwtTokenProvider` (프로필에 secret 미설정 → 기본값) | aman 토큰이 aman20에서도 유효 (**보안 문제**) |
| 6 | localStorage 키 공유 (same origin) | `aman_user`, `aman_last_active_folder_id`, `aman_active_image_work_id`, `aman_copied_item`, `folder-tree-width`, zustand `userLocalSetting` | 로그인 상태·설정이 섞임 |
| 7 | 도커 마운트가 aman 전용 | `/data/docker/docker-compose.yml` (gxt-demo) | `aman20.war`, `/data/asseterp/aman20`이 컨테이너에 안 보임 |

---

## 3. 설계

### 3.1 인스턴스 인식과 base-dir 결정 (백엔드)

**원칙: 기본 인스턴스(`aman`)는 기존 동작을 한 글자도 바꾸지 않는다.**

1. `AmanApplication.onStartup(ServletContext)`에서 `servletContext.getContextPath()`를 읽어
   인스턴스 이름을 계산한다. (`""` 또는 `/aman` → `aman`)
   - 값은 static 필드에 보관한다. WAR마다 클래스로더가 다르므로 인스턴스 간 공유되지 않는다.
   - **System property는 사용하지 않는다** (같은 JVM의 두 WAR가 공유하므로).
2. `ApplicationEnvironmentPreparedEvent` 리스너(`InstanceEnvironmentListener`)가
   설정 파일 로딩 직후, **로깅 초기화 이전**에 실행되어 최우선 순위 PropertySource를 추가한다.
   - `aman.instance` = 인스턴스 이름 (항상)
   - `aman.base-dir` = 아래 규칙으로 계산한 값 (기본 인스턴스가 아닐 때만)
3. base-dir 규칙 (기본 인스턴스가 아닐 때)
   - `aman.instances.<이름>.base-dir`이 설정되어 있으면 그 값
   - 없으면 **기존 base-dir의 형제 디렉터리**: `parent(aman.base-dir)/<이름>`
     - t3600: `/data/asseterp/aman` → `/data/asseterp/aman20`
     - omen: `/data/docker/aman` → `/data/docker/aman20`
4. `aman.db-dir`, `aman.db-name`, `spring.datasource.url`, logback의 `BASE_DIR` 등은 모두
   `${aman.base-dir}` 참조이므로 **자동으로 새 경로를 따른다** (Environment가 지연 해석).
5. 기동 시 `base-dir/db`, `logs`, `data/images`, `data/video`, `backup`이 없으면 생성한다.
   (SQLite는 상위 디렉터리가 없으면 DB 파일을 만들지 못한다.)
6. 기동 로그에 `instance=aman20, base-dir=/data/asseterp/aman20`을 남긴다.

로컬 bootRun(`main()`)은 ServletContext 단계가 없으므로 항상 기본 인스턴스로 동작한다.

### 3.2 인증 격리 (백엔드)

- **쿠키 path**: `/` → `request.getContextPath()` (예: `/aman20`)
  - RFC 6265 path-match에 의해 `/aman` 쿠키는 `/aman20` 요청에 전송되지 않는다.
  - 기존 브라우저에 남은 path `/` 쿠키는 로그인·로그아웃 시 `maxAge=0`으로 함께 삭제한다.
- **JWT 서명키**: 기본 인스턴스는 기존 키 그대로, 그 외 인스턴스는 `secret + ":" + 인스턴스명`으로
  키를 파생한다. → 다른 인스턴스 토큰은 서명 검증에서 실패.
  - `spring.security.jwt.secret`을 프로필에 직접 지정한 경우에도 동일하게 파생한다.
- refresh token은 인스턴스별 DB(`refresh_tokens`)에 있으므로 이미 격리됨.
- `ErpTokenValidationFilter`의 ERP 공유키(HMAC)는 ERP 쪽과 약속된 값이므로 **변경하지 않는다**.

### 3.3 하드코딩 제거 (백엔드)

- `ManualController`의 `/aman` 5곳 → `request.getContextPath()`
- help html(`colors.html`, `icons.html`)의 `href="/aman/favicon.png"` → 서빙 시 컨텍스트 경로로 치환
- help 문서 본문의 `/aman/...` 설명 문구는 문서이므로 그대로 둔다.

### 3.4 프론트엔드

- **빌드 시 주입** 방식 채택: `VITE_BASE` 환경변수 (기본 `/aman/`)
  - `vite.config.ts`: `base: process.env.VITE_BASE ?? '/aman/'`
  - WAR 이름마다 프론트를 별도 빌드한다 (배포 스크립트가 처리).
- `src/lib/instance.ts` 신설 — 경로/키의 단일 출처
  - `CONTEXT_PATH` = `import.meta.env.BASE_URL`에서 끝 `/` 제거 (`/aman20`)
  - `INSTANCE` = `aman20`
  - `storageKey(name)` → 기본 인스턴스는 기존 키 그대로(`aman_user`), 그 외는 접두어 부여(`aman20:aman_user`)
- `/aman` 하드코딩 전부 `CONTEXT_PATH`로 교체 (`basename`, `apiClient` baseURL·리다이렉트, 다운로드 URL, manual URL 등)
- localStorage 키 전부 `storageKey()` 사용, zustand persist `name`도 동일
- 개발 서버(vite dev)는 `/aman`만 지원 (프록시 규칙 변경 없음)

### 3.5 배포

- `deploy-t3600.sh`, `deploy-omen.sh` (WAR 이름 인자를 받는 스크립트)
  - `TARGET_WAR_NAME`에서 인스턴스 이름 계산 → `VITE_BASE=/<이름>/ npm run build`
  - 실행 예: `./deploy-t3600.sh aman20`
- **docker-compose (저장소 밖, 수동 반영)** — gxt-demo 서비스
  ```yaml
  # 기존 (aman 전용 개별 마운트)
  - /data/docker/gxt-demo/webapps/aman.war:/usr/local/tomcat/webapps/aman.war
  - /data/asseterp/aman:/data/asseterp/aman
  # 추가 (aman20)
  - /data/docker/gxt-demo/webapps/aman20.war:/usr/local/tomcat/webapps/aman20.war
  - /data/asseterp/aman20:/data/asseterp/aman20
  ```
  - 파일 단위 마운트는 호스트에 파일이 먼저 있어야 한다 (없으면 디렉터리로 생성됨).
    → 최초 1회 `aman20.war`를 복사한 뒤 compose 반영·재생성(`docker compose up -d gxt-demo`).
  - 대안: `/data/asseterp`와 webapps 디렉터리 전체 마운트. 단, gxt-demo는 `ROOT.war` 등
    다른 앱이 개별 마운트되어 있어 webapps 전체 마운트는 충돌 가능 → 개별 마운트 유지 권장.
- 힙 메모리: Spring Boot 앱이 2개가 되므로 `setenv.sh`의 `-Xmx` 확인.
- 폴더 권한: 컨테이너는 root·umask `0027`로 동작하여 앱이 만든 폴더/파일이 `root 750/640`이 된다.
  - `deploy-t3600.sh`가 빌드 전에 base-dir 하위 폴더(`db`, `logs`, `data/images`, `data/video`, `backup`)를
    **호스트 사용자로 미리 생성**한다. 이미 root 소유인 폴더가 있으면 `chown` 명령을 안내한다.
  - 컨테이너가 새로 만드는 파일까지 읽으려면 `setenv.sh`에 `export UMASK="0022"` 추가 (수동).

### 3.7 인스턴스 구분 표시 (문서편집 화면)

브라우저에서 aman / aman20 을 헷갈리지 않도록 **문서편집(/admin) 상단바**만 다르게 보인다. (일반 사용자 화면은 그대로)

| 표시 | 설정 (`application-<프로필>.properties`) | 기본값 |
|---|---|---|
| 상단바 배지 `aman20 (1.5.9)` | `aman.instances.<이름>.label` | aman → `A-Man`, 그 외 → 인스턴스 이름 |
| 상단바 배경색 | `aman.instances.<이름>.topbar-color` (`#RGB`/`#RRGGBB`/`#RRGGBBAA`만 허용) | 없음 → 회색(`bg-gray-700`) |
| 브라우저 탭 제목 `[aman20] …` | (설정 없음) | aman 은 표시 안 함 |

- 서버: `/health` 응답에 `instance`, `instanceLabel`, `topbarColor` 추가 (`SystemController`)
- 화면: `DocUserTopBar.tsx`
- t3600, test(119), omen, dell6820 프로필: `aman20` = 라벨 `aman20`, 색 `#9a3412`

### 3.6 신규 인스턴스 초기 DB

빈 DB로 기동하면 `ddl-auto=update`로 테이블은 생기지만 **사용자가 없어 로그인 불가**.
→ **`InitialAdminRunner`**: 기동 시 `users`가 비어 있으면 1회 `admin` / `1111` 계정을 만든다.
  (`aman.init.admin-username`, `aman.init.admin-password`, `aman.init.admin-email`로 변경 가능. 로그인 후 비밀번호 변경 필수)

---

## 4. 작업 단계

| 단계 | 내용 | 파일 |
|---|---|---|
| 1 | 인스턴스 인식 + base-dir 결정 + 디렉터리 생성 | `AmanApplication`, `config/InstanceEnvironmentListener` (신규) |
| 2 | 쿠키 path, JWT 키 파생 | `AuthController`, `JwtTokenProvider` |
| 3 | 백엔드 `/aman` 하드코딩 제거 | `ManualController` |
| 4 | 프론트 경로·저장소 키 단일화 | `vite.config.ts`, `lib/instance.ts` (신규), 하드코딩 사용처 |
| 5 | 배포 스크립트 `VITE_BASE` | `deploy-t3600.sh`, `deploy-omen.sh` |
| 6 | docker-compose 반영, 초기 DB (수동/결정 후) | 저장소 밖 |

각 단계 후 `bm.sh compile` / `fm.sh lint`·`build`로 검증한다.

### 4.1 진행 현황 (2026-11-27)

| 단계 | 상태 | 검증 |
|---|---|---|
| 1 | 완료 | `InstanceEnvironmentListenerTest` 4건 통과. 리스너 순서 HIGHEST+15 (Boot 2.3.12: 설정 로딩 +10, 로깅 +20 확인) |
| 2 | 완료 | 컴파일 |
| 3 | 완료 | 컴파일 (help html은 `[contextPath]` 치환) |
| 4 | 완료 | `fm.sh lint` 통과, `VITE_BASE=/aman20/` 빌드 결과에 `/aman/` 잔여 없음 |
| 5 | 완료 | `bash -n`. t3600은 compose 마운트 누락 시 경고 출력 |
| 6 | 완료 | t3600 compose 반영·aman20 기동 확인 (`instance=aman20` 로그). 초기 admin 자동 생성. 배포 대상이 폴더면 스크립트가 빌드 전 중단 |

참고: `frontend/vite.config.js`가 git에 포함되어 있고 Vite는 `.ts`보다 `.js`를 먼저 읽으므로
`vite.config.ts`와 **두 파일을 함께** 수정해야 한다.

---

## 5. 결정 사항 / 남은 과제

1. **초기 admin 계정 생성 방식** → (b) 채택, `InitialAdminRunner` 구현
   - (a) 배포 스크립트가 base-dir에 DB가 없을 때 `sqls/aman_ddl.sql` + admin 1건으로 DB 생성
   - (b) 앱 기동 시 `users`가 비어 있으면 admin 생성 (비밀번호는 프로퍼티)
   - (c) 기존 `aman.db`를 복사 후 정리 — 이미지 URL이 절대경로(`http://host:port/aman/images/...`)로 저장되어 있어 **비추천**
2. 허용 IP 등 인스턴스별로 달라야 하는 설정은 현재 프로필 단위로만 가능하다.
   필요 시 `aman.instances.<이름>.*` 형태로 확장한다. (zip-upload 작업 시 재검토)
3. ERP 연동 `aman_opener.jsp`는 대상 경로(`/aman20`)를 인자로 받도록 ERP 측에서 조정 필요.

---

## 6. 검증 체크리스트

- [ ] `aman.war` 배포 시 기존과 동일 (base-dir, 로그인, localStorage 키 `aman_user`)
- [ ] `aman20.war` 배포 시 기동 로그 `instance=aman20, base-dir=.../aman20`
- [ ] `/data/asseterp/aman20/{db,logs,data,backup}` 생성, 로그가 aman20 쪽에 기록
- [ ] aman 로그인 상태에서 aman20 `/admin` 접근 시 로그인 요구
- [ ] aman20에서 로그인해도 aman 로그인 유지 (쿠키 path 분리)
- [ ] aman20 화면의 모든 API·다운로드·manual 링크가 `/aman20/...`
- [ ] `/aman20/manual/{aka}` breadcrumb·이전/다음 링크가 `/aman20/...`
