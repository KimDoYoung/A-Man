# A-Man 마크다운-HTML 변환 전략 (Md2Html변환전략.md)

이 문서는 A-Man(AssetERP 도움말/매뉴얼 시스템) 프로젝트에서 마크다운(MD) 데이터를 HTML로 변환하는 아키텍처 및 렌더링 전략을 정리합니다.

---

## 1. 아키텍처 개요

A-Man 시스템은 도움말을 호출하는 방식에 따라 **서버 사이드 렌더링(SSR)** 방식과 **클라이언트 사이드 렌더링(CSR)** 방식을 혼용하여 지원합니다. 이에 따라 마크다운에서 HTML로의 변환 또한 백엔드(Java)와 프론트엔드(TypeScript/React) 양쪽 모두에 별도의 변환 엔진을 갖추고 있습니다.

```mermaid
graph TD
    DB[(SQLite DB)] -->|Raw Markdown| Server[Java Spring Backend]
    
    %% SSR Route
    Server -->|1. Parse via flexmark-java| HTML[HTML Document]
    HTML -->|Response text/html| ERP[ERP 단독 팝업 /manual/{aka}]
    
    %% CSR Route
    Server -->|2. Return JSON Raw MD| Client[React Frontend SPA]
    Client -->|3. Parse via react-markdown| View[MarkdownViewer.tsx / docs/{id}]
    Client -->|3. Parse via react-markdown| Preview[Live Preview / Editor]
```

---

## 2. 변환 모듈 상세

### 2.1. 백엔드(Java) 변환 모듈 (SSR)

* **사용 목적**: ERP 화면 등에서 특정 별칭(`/{aka}`)으로 매뉴얼 페이지를 단독 호출할 때, 무거운 React SPA 구동 없이 빠르게 HTML 완제품을 응답하기 위해 사용합니다.
* **사용 라이브러리**: `com.vladsch.flexmark` (flexmark-java 0.62.x 계열)
* **주요 소스 파일**: 
  * [ManualController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/ManualController.java)의 `parseMarkdownToHtml(String markdown)` (MarkdownCacheService 주입 위임)
  * [MarkdownCacheService.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/service/MarkdownCacheService.java): 파싱 연산 및 정규식 전처리 기능 캡슐화 서비스 빈(Bean)
* **동작 프로세스**:
  1. DB에서 마크다운 원문을 조회합니다.
  2. `MarkdownCacheService`에 구현된 `parseMarkdownToHtml`을 호출합니다. (최초 호출 시 백틱 확장 전처리 및 Flexmark 변환을 거쳐 메모리에 적재되며, 이후 요청에는 연산을 건너뛰고 캐시본이 즉각 서빙됩니다.)
  3. HTML 스트링을 최종 CSS 스타일이 포함된 HTML 템플릿 양식에 조립하여 반환합니다.

### 2.2. 프론트엔드(TypeScript/React) 변환 모듈 (CSR)

* **사용 목적**: A-Man 도움말 메인 뷰어 및 관리자 전용 마크다운 편집기 내 '실시간 미리보기(Live Preview)'에서 동적인 테마 적용 및 인터랙션을 제공하기 위해 사용합니다.
* **사용 라이브러리**:
  * `react-markdown`: 핵심 마크다운 파서 및 React 컴포넌트 변환기
  * `remark-gfm`: GFM 스펙(테이블, 취소선 등) 지원
  * `rehype-raw`: 마크다운 내의 원시 HTML 태그 파싱 허용
  * `remark-breaks`: 일반 줄바꿈(`\n`)을 `<br />`로 강제 변환
* **주요 소스 파일**:
  * [MarkdownViewer.tsx](file:///home/kdy987/work/aman/frontend/src/domains/content/MarkdownViewer.tsx): 사용자용 도움말 화면 뷰어 및 동적 목차(TOC) 생성 담당
  * [markdownRenderer.tsx](file:///home/kdy987/work/aman/frontend/src/utils/markdownRenderer.tsx): 공통 마크다운 변환 함수. 관리자 화면의 실시간 미리보기 컴포넌트([MarkdownSplitEditor.tsx](file:///home/kdy987/work/aman/frontend/src/domains/content/components/MarkdownSplitEditor.tsx))에서 호출
* **동작 프로세스**:
  1. API 호출(`/docs/{page_id}` 등)을 통해 raw 마크다운 문자열을 JSON 데이터로 전달받습니다.
  2. `ReactMarkdown` 컴포넌트의 `components={{ ... }}` 매핑 규칙을 통과하며 각각의 HTML 노드가 Tailwind CSS 기반의 스타일이 입혀진 리액트 엘리먼트로 동적 변환됩니다.
  3. 미리보기 시에는 스크롤 동기화를 위해 마크다운 행 위치 속성(`data-source-line`)을 노드에 삽입합니다.

---

## 3. 경로 및 API별 변환 모듈 비교

| 구분 | 호출 경로 | 데이터 형식 | 변환 주체 / 사용 엔진 | 최종 결과물 |
| :--- | :--- | :--- | :--- | :--- |
| **ERP 도움말 팝업** | `/aman/{aka}` 또는 `/manual/{aka}` | `text/html` | 백엔드 / `flexmark-java` | 서버사이드 렌더링된 캐싱 HTML 파일 |
| **메인 도움말 뷰어** | `/aman/docs/folder/{id}` 등 | `application/json` (Raw MD) | 프론트엔드 / `react-markdown` | SPA UI 프레임워크와 결합된 동적 리액트 DOM |
| **에디터 실시간 미리보기** | (내부 상태 변경 변경 시 즉시 구동) | `react state` (Raw MD) | 프론트엔드 / `react-markdown` | 에디터 우측의 실시간 Preview 영역 |

---

## 4. 백엔드 및 프론트엔드 HTML 파싱 불일치 현황 및 일치화 전략

도밀성 테스트 자동화 스크립트 실행 과정에서 백엔드(Flexmark)와 프론트엔드(React-Markdown) 간에 의미론적/기능적 불일치가 발견되어 이를 일치시키기 위한 세부 전략을 설정했습니다.

### 4.1. 발견된 핵심 불일치 사항

#### 1) 일반 인라인 백틱의 HTML 태그 불일치
* **현상**: 일반 백틱(예: \`npm install\`) 처리 시, 백엔드는 표준 스펙에 따라 `<code>` 태그로 변환하지만, 프론트엔드는 `AssetKbdRenderer`에 의해 스타일링이 입혀지지 않은 `<kbd>` 태그로 변환됩니다.
* **해결**: 프론트엔드 `AssetKbdRenderer.tsx`를 수정하여 매칭되는 정의 버튼이 없을 경우 `<kbd>` 대신 표준 `<code>` 태그를 반환하도록 일치시킵니다.

#### 2) 커스텀 동적 버튼 문법 미동기화
* **현상**: 프론트엔드는 \`FF5733:fas fa-cogs:설정\` 문법을 동적으로 파싱하여 배경색이 `#FF5733`이고 톱니바퀴 아이콘을 품은 버튼으로 렌더링합니다. 하지만 백엔드 자바 코드에는 해당 스플릿 파서가 없어서 생으로 \`<code>FF5733:fas fa-cogs:설정</code>\` 문자열로 노출되는 결함이 있습니다.
* **해결**: 백엔드 자바 정규식 치환 처리기(`replaceBacktickTokens`)에 `:` 구분자로 구성된 3단 스플릿 커스텀 버튼 렌더링 코드를 추가 구현하여 일치시킵니다.

#### 3) 부차적 마크다운 라이브러리 간 스펙 차이
* **태스크 리스트**: 백엔드 Flexmark는 `<input>`에 `readonly="readonly"` 속성과 `&nbsp;`를 주입하나, React-Markdown은 이를 생략합니다.
* **테이블 정렬**: 백엔드는 `<th align="left">`와 같이 HTML 정렬 속성을 주입하나, 프론트엔드는 이를 생략(CSS 정렬만 적용)합니다.
* **이미지 프리로드 링크**: React 19 SSR에서 `img` 태그 탐색 시 리소스 최적화용 `<link as="image" href="...">` 태그를 문서 시작부에 자동 삽입합니다.
* **해결**: 자동화 비교 러너(`compare-markdown-rendering.mjs`)의 HTML 정규화(Normalization) 필터링 조건에 `align`, `readonly` 속성 제거 및 `<link>` 태그 소거를 추가하여 사소한 호환성 차이로 인한 검증 실패를 방지합니다.

---

## 5. 향후 확장 및 주의사항

1. **커스텀 마크다운 스펙 동기화**:
   * 에디터 혹은 백엔드에서 자체적으로 확장해 처리하는 커스텀 마크다운 문법이 있는 경우, 백엔드의 Java 정규식 처리기와 프론트엔드의 React 렌더러 처리기 양쪽의 렌더링 결과물이 완벽히 동치되도록 동기화 관리가 필수적입니다.
2. **Java 8 호환성 유지**:
   * 백엔드 변환 처리 코드를 수정할 시, 가동 환경인 **Java 1.8** 버전을 초과하는 문법을 사용하지 않도록 극히 주의합니다.

---

## 6. 백엔드-프론트엔드 동일성 검증 테스트 방법

수정 사항 및 신규 마크다운 문법 추가 시 두 렌더러 엔진 간의 HTML 변환 구조가 완전히 일치하는지 자동화하여 검증할 수 있는 환경이 구성되어 있습니다.

### 6.1. 테스트 실행 및 자동 검증
프로젝트 루트 또는 `tools/` 폴더 내 어디서든 실행이 가능한 쉘 스크립트가 존재합니다. 

```bash
# 1. 테스트 실행 (필요 시 자동으로 tools 용 npm 모듈 설치 및 Java 코드 컴파일 수행)
./tools/run-md-tests.sh
```

스크립트 기동 시 백엔드의 Flexmark CLI 파서와 프론트엔드의 React 19 SSR(React-Markdown) CLI 파서가 가동되며 두 렌더링 HTML에 정규화 필터(태그 정밀 정렬, 스타일/메타데이터 속성 소거)를 거쳐 대조 작업을 수행합니다.

### 6.2. 검증 대상 마크다운 커스터마이징
테스트에 활용되는 마크다운 본문은 다음 경로에 위치합니다:
* **경로**: [tools/test-source.md](file:///home/kdy987/work/aman/tools/test-source.md)

개발자나 관리자는 **이 파일을 자유롭게 메모장이나 에디터로 편집하여 원하는 문법 케이스를 임의로 테스트할 수 있습니다.** 
* 스크립트 실행 시 파일이 이미 존재하면 덮어쓰지 않고 해당 변경 내용을 토대로 검증을 돌립니다. (삭제할 경우에만 기본 예제 파일이 최초 1회 새로 자동 생성됩니다.)

### 6.3. 수동 눈으로 비교 및 Diff 확인 (결과물 격리)
테스트 실행 시마다 이전 실행 결과물이 완전 초기화(Clean)된 후 아래 결과 파일들이 신규 생성됩니다.
* **출력 디렉토리**: [tools/results/](file:///home/kdy987/work/aman/tools/results/)
  * `backend-raw.html` : 백엔드의 변환 원본 HTML
  * `frontend-raw.html` : 프론트엔드의 변환 원본 HTML
  * `backend-normalized.html` : 공백/클래스/메타데이터가 표준화된 백엔드 정규화 HTML
  * `frontend-normalized.html` : 공백/클래스/메타데이터가 표준화된 프론트엔드 정규화 HTML

테스트 실패 시, 콘솔창에 나타나는 diff 명령어를 **그대로 복사하여 실행**하면 현재 실행 위치(CWD)에 맞게 상대 경로가 동적으로 자동 보정되어 차이점을 한눈에 보여줍니다.
```bash
# 실패 시 출력되는 예시 명령어를 그대로 실행하여 대조 확인
diff -u results/backend-normalized.html results/frontend-normalized.html
```

---

## 7. 마크다운-HTML 변환 캐싱 전략

A-Man 시스템의 도움말 로딩 속도를 향상시키고 무거운 구문 파싱 연산 부하를 제어하기 위한 백엔드 서버 캐싱 구조입니다.

### 7.1. 백엔드 캐싱 아키텍처 (Spring Boot Cache)

* **사용 기술**: Spring Boot Cache Abstraction (`@Cacheable`, `@CacheEvict`) + JVM 인메모리 캐시 (`ConcurrentMapCache`)
* **설정 활성화**: [CacheConfig.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/config/CacheConfig.java)에 `@EnableCaching`을 선언하여 글로벌 인메모리 단순 캐시 라이프사이클을 활성화합니다.
* **프록시 한계 극복 (Self-Invocation 방어)**: 
  * Spring의 프록시 기반 AOP 캐시 한계를 우회하기 위해 마크다운 변환 엔진과 predefined_buttons 렌더링 로직을 컨트롤러 바깥의 별도 서비스 빈인 [MarkdownCacheService.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/service/MarkdownCacheService.java)로 완전히 분리/격리했습니다.
  * 메소드 상단에 `@Cacheable(value = "manualHtml", key = "#markdown")`를 지정하여 동일 마크다운 본문에 대해서는 AST 구문 파싱을 타지 않고 메모리에서 캐싱된 HTML 스트링을 `0.1ms` 이내에 즉각 서빙합니다.
* **캐시 무효화 (Cache Eviction)**:
  * 도움말 문서의 저장, 수정, 삭제 시점에 캐시 데이터를 최신 상태로 유지하기 위해 [ContentController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/ContentController.java) (`upsertPage`, `deletePage`, `importPageFromZip`) 및 [AdminPageController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/AdminPageController.java) (`updatePageStatus`)의 각 API 성공 시점에 `@CacheEvict(value = "manualHtml", allEntries = true)`를 기동하여 캐시 찌꺼기를 완벽히 무효화합니다.

