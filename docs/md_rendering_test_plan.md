# 구현 계획서: 마크다운-HTML 변환 동일성 테스트 러너

## 1. 개요 및 목표 (Goal Description)
A-Man 시스템의 마크다운-HTML 변환 로직은 Java 백엔드(SSR 처리용 `flexmark-java`)와 React 프론트엔드(SPA 뷰어 및 미리보기용 `react-markdown`)로 나뉘어 있습니다. 
사용자에게 두 경로 모두에서 일관된 도움말 화면을 보장하기 위해, 동일한 마크다운을 입력했을 때 두 모듈이 시맨틱적으로(의미론적으로) 동일한 HTML 구조를 출력하는지 검증하고자 합니다.

이 검증을 위해, 자동화된 스크립트를 `tools/` 디렉토리에 구축하고, 각 파서가 변환한 HTML 결과 파일들을 `tools/results/` 디렉토리 아래에 저장하도록 설정하여 **눈으로 직접 차이점(diff)을 비교하고 디버깅할 수 있도록 지원**합니다.

---

## 2. 사용자 검토 필요 사항 (User Review Required)

### 테스트 마크다운 동적 검증 및 한글 안내 제공
- 테스트 대상인 `test-source.md` 파일을 `tools/` 디렉토리 바로 아래에 배치하여 사용자가 언제든 마크다운을 직접 편하게 수정하고 테스트할 수 있도록 지원합니다. (파일이 없을 경우에만 최초 1회 기본 예제를 생성합니다.)
- 쉘 스크립트 실행 과정 및 완료 리포트를 **가독성 높은 한글 메시지**로 출력하도록 개선합니다.
- 결과 파일들만 `tools/results/` 폴더 아래에 생성되어 수동으로 눈으로 비교할 수 있게 합니다.
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
│   ├── run-md-tests.sh              # 전체 테스트 실행 및 파일 추출 쉘 스크립트 (한글화 적용)
│   ├── compare-markdown-rendering.js # 정규화 및 구조 비교 통합 테스트 러너 (Node.js)
│   ├── md-parser-cli.js             # 프론트엔드 react-markdown CLI 파서
│   ├── test-source.md               # 검증 대상 마크다운 파일 (직접 편집 가능)
│   └── results/                     # 각 파서 결과 파일이 생성되는 폴더
│       ├── backend-raw.html
│       ├── frontend-raw.html
│       ├── backend-normalized.html
│       └── frontend-normalized.html
```

---

## 4. 상세 변경 예정 사항 (Proposed Changes)

### 1) 통합 테스트 러너 수정
#### [수정] `tools/compare-markdown-rendering.mjs`
- `test-source.md` 경로를 `tools/test-source.md`로 조정합니다.
- 파일이 이미 존재할 경우 덮어쓰지 않고 그대로 읽어와 테스트를 돌리도록 분기 로직을 넣습니다.
- 콘솔 출력 메시지(성공/실패/안내)를 전부 한글로 변경합니다.

---

### 2) 실행 자동화 쉘 스크립트 수정
#### [수정] `tools/run-md-tests.sh`
- 컴파일, 라이브러리 검사, 러너 구동 프로세스의 쉘 로그를 한글화합니다.

---

## 5. 검증 계획 (Verification Plan)

### 수동 및 자동 검증 방법
1. 쉘 스크립트 실행:
   ```bash
   ./tools/run-md-tests.sh
   ```
2. 한글 메시지 출력 상태 확인.
3. `tools/test-source.md` 에 자신만의 테스트용 마크다운(예: 커스텀 백틱 등)을 한두 줄 수정해본 뒤 쉘 스크립트를 재구동하여 `tools/results/` 하위에 해당 마크다운의 결과물들이 동적으로 잘 반영되어 비교되는지 직접 확인.
