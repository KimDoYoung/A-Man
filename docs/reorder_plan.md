# 구현 계획 및 결과 - 요소 레이어 정렬 기능 (앞으로 보내기 / 뒤로 보내기)

이 문서는 캔버스 기반 이미지 에디터에서 요소(오브젝트)의 레이어 순서를 조정하는 기능("맨 앞으로 보내기", "맨 뒤로 보내기", "앞으로 한 단계", "뒤로 한 단계")의 구현 계획과 리팩토링 결과를 설명합니다.

프로젝트 내 문서 경로: [docs/reorder_plan.md](file:///home/kdy987/work/aman/docs/reorder_plan.md)

## 목표 설명
도움말 매뉴얼 이미지 에디터(`ActionImageEditor.tsx`)에서 여러 요소(원숫자, 사각형, 텍스트, 화살표 등)가 겹쳐 있을 때, 사용자는 어떤 요소가 위에 그려질지 레이어 순서를 조절할 수 있어야 합니다.

캔버스 상에서 요소가 그려지는 순서는 `items: CanvasItem[]` 상태 배열 내의 인덱스에 의해 결정됩니다.
- 배열의 인덱스 `0`인 요소가 가장 먼저(맨 아래/뒤) 그려집니다.
- 배열의 마지막 인덱스인 요소가 가장 나중에(맨 위/앞) 그려집니다.

이를 위해 다음 두 가지 방식으로 순서 조정 기능을 구현 및 리팩토링했습니다:
1. **속성 패널 내 UI 버튼**: 요소가 선택되었을 때 `FloatingPropertyPanel` 인스펙터 하단에 `ReorderController` 컴포넌트를 연동합니다.
2. **키보드 단축키**: `ActionImageEditor` 내 keydown 이벤트 리스너에 단축키(`Ctrl + [` / `Ctrl + ]` 및 shift 조합)를 바인딩합니다.

---

## 사용자 검토 요구사항
- `FloatingPropertyPanel.tsx` 파일 내부에 직접 구현되어 있던 레이어 정렬 코드를 모듈화하여 `ReorderController.tsx` 파일로 성공적으로 분리 완료하였습니다.

---

## 변경 내용 (Changes Made)

### 1. [ReorderController.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/ReorderController.tsx) [NEW]
- **목적**: 레이어 순서 조정을 위한 독립적인 React 컴포넌트입니다.
- **Props**:
  - `items`: `CanvasItem[]` (현재 그려진 모든 요소 리스트)
  - `selectedItemId`: `string` (선택된 요소의 고유 ID)
  - `pushToUndo`: `(newItems: CanvasItem[]) => void` (히스토리 스택에 커밋하는 함수)
- **아이콘**: `lucide-react`에서 `BringToFront`, `SendToBack`, `ArrowUp`, `ArrowDown`을 사용하여 4개 버튼의 아이콘으로 장착하였습니다.
- **예외 처리**: 선택된 요소가 없을 때는 아무것도 반환하지 않으며, 요소가 배열의 맨 앞(index 0) 또는 맨 뒤(index length-1)에 도달할 시 관련 정렬 버튼을 비활성화(`disabled`) 처리합니다.

### 2. [FloatingPropertyPanel.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/FloatingPropertyPanel.tsx) [MODIFY]
- **가져오기**: 새로 추가한 `ReorderController`를 임포트했습니다. `lucide-react`에서 직접 가져왔던 레이어 조정 아이콘들(`BringToFront`, `SendToBack`, `ArrowUp`, `ArrowDown`)은 가져오기 구문에서 제외하여 불필요한 import 의존성을 청소했습니다.
- **연동**: 요소 선택 판넬 최하단(약 1008라인)에 `<ReorderController items={items} selectedItemId={selectedItemId} pushToUndo={pushToUndo} />` 컴포넌트를 주입하여 기존 인라인 코드와 동일한 정렬 UI를 더 깔끔하게 제공합니다.

### 3. [ActionImageEditor.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/ActionImageEditor.tsx) [MODIFY]
- 단축키 및 히스토리(Undo/Redo) 연동 기능은 기존 핫키 개선 사항(Shift 수정 키로 인한 문자 맵핑 변환 `{`/`}` 처리 및 물리 키 `BracketLeft`/`BracketRight` 검사)을 포함해 원본 그대로 보존됩니다.

---

## 검증 및 결과 (Validation & Results)

### 1. 자동화 테스트 (컴파일/린트 검사)
리팩토링 완료 후 빌드 및 ESLint를 수행하였습니다:
- **린트 검증**: `./fm.sh lint`를 수행하여 리팩토링된 파일 모두 스타일 및 사용하지 않는 변수 에러 없이 100% 통과했습니다.
- **프로덕션 빌드 검증**: `./fm.sh build`를 수행하여 빌드 번들이 7.69초 내에 정상적으로 빌드 완료되었습니다.

### 2. 수동 검증 단계
- 분리된 `ReorderController` 버튼들이 화면상에 완벽히 기존처럼 렌더링되며, 클릭 시 레이어 위치가 캔버스에 실시간 반영되는 것을 확인했습니다.
- 정렬 변경 사항은 여전히 히스토리 스택에 커밋되어 `Ctrl+Z` / `Ctrl+Y`로 정밀하게 동작합니다.
- 요소가 한계 레이어에 도달하면 `disabled` 상태가 정확하게 전환됩니다.
