# A-Man 프로젝트 Gemini 개발 지침 (GEMINI.md)

이 문서는 AI 에이전트(Gemini/Antigravity)가 **A-Man (AssetERP 매뉴얼 시스템)** 프로젝트를 개발, 유지보수 및 협업할 때 준수해야 하는 핵심 가이드라인과 설계 원칙을 정리한 지침서입니다.

---

## 1. 프로젝트 개요
* **프로젝트명**: A-Man (AssetERP 도움말/매뉴얼 시스템)
* **목적**: 
  * 일반 사용자(자산운용회사 사원)에게 AssetERP의 3단계 메뉴 체계에 맞춘 도움말 웹페이지 제공
  * 문서 사용자(한국펀드서비스 직원)가 웹 기반 마크다운 에디터를 통해 도움말을 직접 작성/관리할 수 있는 기능 제공
* **배포 환경**: 최종 결과물은 `aman.war`로 빌드되어 **Tomcat 8.5**에 배포됩니다.
* **관련 문서**: [설계.md](file:///home/kdy987/work/aman/docs/설계.md) | [README.md](file:///home/kdy987/work/aman/README.md)

---

## 2. 기술 스택 및 제약사항

### 2.1 Backend (백엔드)
* **Java 8 (1.8)** 및 **Spring Boot 2.3.12.RELEASE**를 사용합니다. (Tomcat 8.5 구동 환경 호환성 준수 필수)
* 설정 파일은 반드시 **`application.properties`**를 사용하며, YAML(`.yml`)은 사용하지 않습니다.
* 환경 변수 `AMAN_MODE`에 따라 `application-${AMAN_MODE}.properties`를 동적으로 로드합니다.
* 데이터베이스는 추가 RDBMS 설치 없이 단일 파일로 동작하는 **SQLite3**을 사용합니다.
* 보안을 위해 `/admin` 하위 경로는 모두 **JWT(JSON Web Token) 기반 인증**을 거쳐야 합니다.
* 서버 내 리소스를 저장할 때 `BASE_DIR`을 기준으로 하위 폴더(`db`, `logs`, `data/images` 등)를 생성하여 사용합니다.
* **패키지 경로**: [kr.co.kfs.aman](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman)

### 2.2 Frontend (프론트엔드)
프론트엔드는 다음 스택을 기반으로 신규 구성 또는 고도화되어야 합니다.
* **React 19.2.4** + **Vite 6.x** + **TypeScript 5.7.x**
* **Tailwind CSS 4.1.x** 및 **shadcn/ui** (CLI 3.8.x 이상) 기반 스타일링
* **AG Grid Community 34.3.1** (대용량 데이터 그리드 표현용)
* **Zustand 5.0.11** (전역 상태 관리)
* **TanStack Query 5.x** (서버 데이터 캐싱 및 API 연동)
* **React Hook Form 7.71.x** + **Zod 3.x** (폼 유효성 검증)
* **axios 1.7.x** (JWT 자동 첨부 및 공통 에러 처리가 적용된 HTTP 클라이언트)
* **@milkdown/crepe 7.x** (문서 편집용 WYSIWYG 마크다운 에디터)

---

## 3. 개발 가이드 및 제약사항

### 3.1 백엔드(Backend) 세부 제약사항
1. **Java 8 호환성 유지**:
   * 가동 서버의 JDK 버전이 **Java 1.8**이므로 Java 9 이상에서 도입된 문법(예: `var` 키워드, `List.of()`, 새로운 Stream API 등)은 절대로 사용하면 안 됩니다.
2. **설정 파일 관리**:
   * `application.yml`이 아닌 [application.properties](file:///home/kdy987/work/aman/backend/src/main/resources/application.properties)만을 사용해야 합니다.
   * `AMAN_MODE` 환경 변수를 인식하여 로컬(`local`), 개발/운영 환경별 프로퍼티를 유연하게 적용할 수 있도록 [PropertyConfig.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/config/PropertyConfig.java) 등의 환경 설정 규칙을 준수합니다.
3. **SQLite3 데이터베이스 파일**:
   * 로컬 및 실서버 기동 시 생성되는 `.db` 파일은 프로젝트 외부가 아닌 `BASE_DIR` 하위의 `db/` 폴더에 저장되어 단일 파일로 동작하게 합니다.
4. **JWT 보안 설정**:
   * `/admin`으로 시작하는 모든 백엔드 API 경로는 JWT 토큰 검증 필터를 거쳐야 합니다. 토큰의 만료 및 서명 검증은 Spring Security 체인 내에서 처리합니다.

### 3.2 프론트엔드(Frontend) 초기화 및 구성
현재 [frontend](file:///home/kdy987/work/aman/frontend) 디렉토리는 비어있거나 `public`과 `src` 폴더만 생성된 상태입니다.
* **Vite 기반 초기화**:
  ```bash
  # Vite 및 TypeScript 기반 템플릿 설치
  npx -y create-vite@latest ./ --template react-ts
  ```
* **필수 패키지**: `react`, `react-dom`, `react-router-dom`, `zustand`, `@tanstack/react-query`, `axios`, `tailwindcss`, `postcss`, `autoprefixer`, `lucide-react`, `@milkdown/core`, `@milkdown/crepe`, `ag-grid-react`, `ag-grid-community`.

---

## 4. UI/UX 디자인 에스테틱 가이드
Antigravity 에이전트는 웹 개발 시 **고품질의 인터랙티브 웹 디자인**을 구현해야 합니다.
1. **정교한 색상 대비**: 단순 원색을 지양하고, 부드러운 다크 모드, HSL 기반 맞춤 컬러, 매끄러운 그라데이션을 적용합니다.
2. **반응형 트리 메뉴**: AssetERP의 3 depth 메뉴 구조를 효과적으로 표현하기 위해 사이드바 트리 컴포넌트를 부드러운 트랜지션 및 아코디언 애니메이션으로 구현합니다.
3. **마크다운 렌더링**: 사용자가 읽기 쉽도록 폰트 크기, 줄 간격, 코드 블록 강조 기능 등을 갖춘 가독성 높은 마크다운 뷰어를 탑재합니다.
4. **미크로-인터랙션(Micro-interactions)**: 버튼 호버 효과, 메뉴 전환 애니메이션, 로딩 스켈레톤(Skeleton UI)을 적용해 프리미엄 사용자 경험을 제공합니다.

---

## 5. 프로젝트 디렉토리 구조 (Overview)

```
aman/
├── GEMINI.md               # 본 문서 (프로젝트 루트)
├── README.md               # 메인 리드미
├── docs/                   # 프로젝트 설계 및 분석 문서
│   └── 설계.md
├── backend/                # 백엔드 Gradle 프로젝트 (Java 8 + Spring Boot)
│   ├── src/main/java/kr/co/kfs/aman/
│   │   ├── config/         # 환경 설정 (Properties, Security 등)
│   │   ├── controller/     # API 엔드포인트
│   │   ├── model/          # JPA 엔티티 및 SQLite 매핑
│   │   └── repository/     # Spring Data JPA Repository
│   └── src/main/resources/
│       ├── application.properties
│       └── application-local.properties
└── frontend/               # 프론트엔드 Vite 프로젝트 (React + TS)
    ├── public/
    └── src/
        ├── components/     # 공통 UI 컴포넌트
        ├── pages/          # 메뉴/매뉴얼 화면
        ├── store/          # Zustand 상태 관리
        └── styles/         # Tailwind 및 글로벌 CSS
```

---

## 6. 에이전트 동작 수칙 (Antigravity Rules)
1. **코드 품질 및 주석 유지**: 코드 수정 시 불필요한 변경을 지양하고, 기존에 존재하는 주석과 문서화 구문을 최대한 유지해야 합니다.
2. **에러 처리**: API 호출 실패 시 사용자에게 직관적인 에러 메시지를 제공하고, JWT 토큰 만료 시 로그인 페이지로 안전하게 리다이렉트되도록 구현합니다.
3. **임시 파일 경로**: 스크래치 스크립트나 임시 파일은 반드시 `.gemini/` 내부가 아닌 프로젝트의 임시 디렉토리 혹은 지정된 에이전트 스크래치 경로를 사용합니다.
4. **명령어 실행 규칙**: 스크립트(예: 빌드 및 린트)는 가급적 상위 README에서 제시한 쉘 명령어(`fm.sh`, `bm.sh`) 구조를 준수하거나 복구하여 연동합니다.
5. **서버 실행 금지**: 에이전트는 백엔드 서버(`bm.sh run`)나 프론트엔드 서버(`fm.sh run`)를 직접 기동/실행하지 않습니다. 서버 실행 및 상태 관리는 전적으로 사용자가 제어하며, 에이전트는 소스 컴파일, 빌드, 스타일/타입 검사(lint) 단계까지만 수행합니다.
