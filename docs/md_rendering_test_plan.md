# 구현 계획서: 마크다운-HTML 변환 동일성 테스트 러너

## 1. 개요 및 목표 (Goal Description)
A-Man 시스템의 마크다운-HTML 변환 로직은 Java 백엔드(SSR 처리용 `flexmark-java`)와 React 프론트엔드(SPA 뷰어 및 미리보기용 `react-markdown`)로 나뉘어 있습니다. 
사용자에게 두 경로 모두에서 일관된 도움말 화면을 보장하기 위해, 동일한 마크다운을 입력했을 때 두 모듈이 시맨틱적으로(의미론적으로) 동일한 HTML 구조를 출력하는지 검증하고자 합니다.

이 검증을 위해, 자동화된 스크립트를 `tools/` 디렉토리에 구축하고, 각 파서가 변환한 HTML 결과 파일들을 `tools/results/` 디렉토리 아래에 저장하도록 설정하여 **눈으로 직접 차이점(diff)을 비교하고 디버깅할 수 있도록 지원**합니다.

---

## 2. 사용자 검토 필요 사항 (User Review Required)

### HTML 정규화 및 수동 비교 환경 제공
프론트엔드 스타일링 클래스(`className`) 및 동기화용 커스텀 속성(`data-source-line`)을 정제하여 비교합니다.
더불어, 결과를 파일로 영구 저장함으로써 사용자가 눈으로 쉽게 비교할 수 있도록 다음 파일 구조로 추출합니다.
- `tools/results/backend-raw.html` : 백엔드가 변환한 원본 HTML
- `tools/results/frontend-raw.html` : 프론트엔드가 변환한 원본 HTML
- `tools/results/backend-normalized.html` : 속성과 클래스가 제거된 정규화본
- `tools/results/frontend-normalized.html` : 속성과 클래스가 제거된 정규화본

---

## 3. 시스템 설계 및 디렉토리 구조 (System Design)

프로젝트 루트 하위에 `tools/` 디렉토리를 신설하여 관련 유틸리티와 실행 스크립트, 그리고 결과 파일을 모아 관리합니다.

```
aman/
├── tools/
│   ├── run-md-tests.sh              # 전체 테스트 실행 및 파일 추출 쉘 스크립트
│   ├── compare-markdown-rendering.js # 정규화 및 구조 비교 통합 테스트 러너 (Node.js)
│   ├── md-parser-cli.js             # 프론트엔드 react-markdown CLI 파서
│   └── results/                     # 각 파서 결과 파일이 생성되는 폴더
│       ├── test-source.md           # 테스트에 쓰인 마크다운 파일
│       ├── backend-raw.html
│       ├── frontend-raw.html
│       ├── backend-normalized.html
│       └── frontend-normalized.html
```

---

## 4. 상세 변경 예정 사항 (Proposed Changes)

### 1) Java 백엔드 CLI 유틸리티 추가
`ManualController.java`에서 사용하는 변환 조건 및 백틱 전처리 로직을 그대로 타는 독립형 Java CLI 프로그램을 작성합니다.

#### [신규] `backend/src/main/java/kr/co/kfs/aman/util/MarkdownParserCLI.java`
- 표준 입력(stdin) 또는 파일 경로를 전달받아 마크다운 텍스트를 읽습니다.
- `ManualController` 내부의 `parseMarkdownToHtml` 메서드와 완전히 동일한 파서 옵션(Tables, Strikethrough, TaskList 등) 및 `preprocessBackticks` 치환 가동을 설정하여 파싱을 돌립니다.
- 파싱되어 나온 HTML 텍스트를 표준 출력(stdout)으로 출력합니다.

---

### 2) 프론트엔드 React-Markdown CLI 도구 추가
프론트엔드에 설정된 마크다운 렌더러와 동일한 조건으로 React SSR 환경을 띄워 HTML 정적 텍스트를 추출합니다.

#### [신규] `tools/md-parser-cli.js`
- React, `react-markdown` 및 플러그인(`remarkGfm`, `rehypeRaw`, `remarkBreaks`) 등을 로드합니다.
- 전달받은 마크다운 텍스트를 `react-dom/server`의 `renderToStaticMarkup`을 통해 완성된 HTML 태그 문자열로 직렬화하여 표준 출력(stdout)으로 인쇄합니다.

---

### 3) 통합 테스트 러너 및 비교 스크립트 작성
두 결과를 가져와 태그 정규화를 거쳐 동질성을 비교하고 결과를 파일로 저장하는 러너입니다.

#### [신규] `tools/compare-markdown-rendering.js`
- 테스트용 마크다운 예시 파일(`tools/results/test-source.md`)을 읽어와 Java CLI와 Node.js CLI를 구동합니다.
- 추출된 양쪽 결과의 원본 HTML을 `tools/results/backend-raw.html`, `tools/results/frontend-raw.html`에 저장합니다.
- `cheerio` HTML 파서 라이브러리를 이용하여 정규화(클래스 제거, 속성 제거, 공백 표준화)를 수행한 뒤 `tools/results/backend-normalized.html`, `tools/results/frontend-normalized.html`에 저장합니다.
- 최종 정규화본의 DOM 트리 및 텍스트 구조가 동일한지 대조하고, 실패 시 Diff를 보여줍니다.

---

### 4) 실행 자동화 쉘 스크립트 작성
백엔드 Java 소스 컴파일, 프론트엔드 라이브러리 참조 설정 및 Node.js 실행을 한번에 처리하는 쉘 파일입니다.

#### [신규] `tools/run-md-tests.sh`
- `backend/src/main/java/kr/co/kfs/aman/util/MarkdownParserCLI.java`를 컴파일합니다.
- `tools/compare-markdown-rendering.js`를 실행하여 테스트을 수행합니다.
- 완료 후 `tools/results/` 하위에 추출된 파일들의 생성 상태를 안내합니다.

---

## 5. 검증 계획 (Verification Plan)

### 수동 및 자동 검증 방법
1. 쉘 스크립트 실행:
   ```bash
   chmod +x tools/run-md-tests.sh
   ./tools/run-md-tests.sh
   ```
2. 콘솔에 통과 여부 및 오류 출력 확인.
3. 생성된 `tools/results/` 내의 결과 파일들을 Visual Studio Code나 `diff` 명령어를 통해 수동으로 교차 대조하여 스타일 클래스 삭감 및 태그 호환 여부를 눈으로 확인:
   ```bash
   diff -u tools/results/backend-normalized.html tools/results/frontend-normalized.html
   ```
