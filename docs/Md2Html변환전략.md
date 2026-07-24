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
  * [ManualController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/ManualController.java)의 `parseMarkdownToHtml(String markdown)`
* **동작 프로세스**:
  1. DB에서 마크다운 원문을 조회합니다.
  2. `preprocessBackticks(markdown)` 메소드를 통해 에디터에서 특수 제작된 커스텀 백틱(예: 버튼 스타일 처리 등)을 사전 변환합니다.
  3. Flexmark parser 및 renderer(GFM 테이블, 취소선, 태스크 리스트 등 확장 기능 활성화)를 통과시켜 HTML 스트링을 추출합니다.
  4. HTML 스트링을 최종 CSS 스타일이 포함된 HTML 템플릿 양식에 조립하여 반환합니다.

### 2.2. 프론트엔드(TypeScript/React) 변환 모듈 (CSR)

* **사용 목적**: A-Man 도움말 메인 뷰어 및 관리자 전용 마크다운 편집기 내 '실시간 미리보기(Live Preview)'에서 동적인 테마 적용 및 인터랙션을 제공하기 위해 사용합니다.
* **사용 라이브러리**:
  * `react-markdown`: 핵심 마크다운 파서 및 React 컴포넌트 변환기
  * `remark-gfm`: GitHub Flavored Markdown 규격(테이블, 취소선 등) 지원
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
| **ERP 도움말 팝업** | `/aman/{aka}` 또는 `/manual/{aka}` | `text/html` | 백엔드 / `flexmark-java` | 서버사이드 렌더링된 단독 HTML 파일 |
| **메인 도움말 뷰어** | `/aman/docs/folder/{id}` 등 | `application/json` (Raw MD) | 프론트엔드 / `react-markdown` | SPA UI 프레임워크와 결합된 동적 리액트 DOM |
| **에디터 실시간 미리보기** | (내부 상태 변경 변경 시 즉시 구동) | `react state` (Raw MD) | 프론트엔드 / `react-markdown` | 에디터 우측의 실시간 Preview 영역 |

---

## 4. 향후 확장 및 주의사항

1. **커스텀 마크다운 스펙 동기화**:
   * 에디터 혹은 백엔드에서 자체적으로 확장해 처리하는 커스텀 마크다운 문법(예: 백틱 문자열을 CSS 버튼으로 렌더링하는 것 등)이 있는 경우, 백엔드의 Java 정규식 처리기(`preprocessBackticks`)와 프론트엔드의 React 렌더러 처리기([AssetKbdRenderer](file:///home/kdy987/work/aman/frontend/src/components/shared/AssetKbdRenderer.tsx) 등) 양쪽의 렌더링 결과물이 완벽히 동치되도록 동기화 관리가 필수적입니다.
2. **Java 8 호환성 유지**:
   * 백엔드 변환 처리 코드를 수정할 시, 가동 환경인 **Java 1.8** 버전을 초과하는 문법을 사용하지 않도록 극히 주의합니다.
