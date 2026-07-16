# 구현 계획서: 이미지 에디터 내 텍스트 회전 및 멀티라인(여러 줄) 지원 기능 추가

> [!IMPORTANT]
> **진행 상태**: 사용자 검토 및 승인 대기 중 (Pending Approval)
> - 이 계획서는 [docs/text_rotation_plan.md](file:///home/kdy987/work/aman/docs/text_rotation_plan.md)에 보관되며, 사용자 승인 완료 후 구현이 시작됩니다.

이 계획서는 AssetERP 도움말/매뉴얼 시스템 내 이미지 에디터(`ActionImageEditor.tsx`)에서 텍스트 요소를 선택하고 원하는 각도로 회전할 수 있는 기능 및 `Shift+Enter`를 통해 입력된 여러 줄의 텍스트가 캔버스 상에 정상적으로 줄바꿈되어 렌더링되도록 개선하는 방안을 상세히 정의합니다.

---

## 1. 개요 및 해결할 문제

1. **멀티라인(여러 줄) 텍스트 렌더링 미지원**:
   * 사용자가 `TextItemInput`에서 `Shift+Enter`를 입력하여 여러 줄로 글씨를 써도, 캔버스 상에서는 줄바꿈 없이 한 줄로 길게 렌더링되는 문제가 있습니다.
   * 이를 해결하기 위해 `\n` 단위로 문자열을 나누고, 각 줄을 순회하며 `lineHeight` 오프셋에 따라 독립적으로 그리는 로직과 다중 행을 포괄하는 정확한 bounding box 측정 로직이 필요합니다.
2. **텍스트 회전 기능 부재**:
   * 배치한 텍스트 요소를 원하는 각도로 자유롭게 회전시키는 기능이 없습니다.
   * 텍스트에 `rotation` 속성을 부여하고, 캔버스를 회전시켜 렌더링하며, 사용자가 마우스 드래그를 통해 직관적으로 회전시킬 수 있도록 회전 핸들(Rotation Handle) 및 Shift 스냅(15도 단위 정밀 고정)을 추가해야 합니다.
   * 회전된 상태에서도 정확히 클릭을 감지할 수 있도록 로컬 스페이스 기준의 마우스 좌표 역회전 변환이 필수적입니다.
3. **텍스트 생성 좌표 zoom 오류**:
   * 신규 텍스트 생성 시 `textInput` 좌표가 CSS 기준 픽셀로 설정되어 zoom이 1.0이 아닐 때 텍스트가 어긋나서 배치되는 현상이 있습니다. 이를 캔버스 픽셀 기준으로 통일하여 수정합니다.
4. **회전 각도 초기화 및 수동 입력 조작성 보완**:
   * 텍스트를 드래그하거나 슬라이더를 통해 각도를 맞출 때 0도로 초기화하거나 임의의 특정 수치(예: `45°`)를 직접 타이핑하여 입력하기를 원할 수 있습니다.
   * **좌측 초기화 아이콘**: 슬라이더의 라벨 옆에 회전 화살표 모양의 초기화 아이콘(`RotateCcw`)을 배치하여, 클릭 시 기본값(0도)으로 즉시 리셋되도록 합니다.
   * **우측 수동 입력 토글 및 슬라이더 교체**: 수치 표시 영역 옆에 편집 아이콘(`Edit3`)을 배치하여, 클릭 시 슬라이더 대신 숫자 입력창(`input[type=number]`) 혹은 선택 상자(`select`)가 표시되도록 교체 렌더링을 지원합니다.
5. **잘라내기(Crop) 시 이전 상태 보호 및 실행취소(Undo) 미지원 보완**:
   * 사용자가 열심히 편집 중일 때 임시 저장(Ctrl+S) 없이 잘라내기를 실행할 경우, 캔버스가 잘라낸 크기와 이미지로 즉시 변경되어 이전 상태의 원본 편집물을 유실할 위험이 있습니다.
   * 이를 개선하기 위해 **잘라내기 실행 직전, 현재 상태를 로컬 Undo 스택에 안전하게 보관**하고, **수정사항이 존재할 때 백엔드 임시저장(`handleSaveToHistory`)을 동기적으로 강제 유도**하여 이중으로 작업 유실을 원천 차단합니다.
   * **실행 취소(Undo) 기능의 배경 이미지 동기화**: `undoStack` 및 `redoStack`이 도형(`items`) 정보 뿐만 아니라 당시의 **배경 이미지 정보(`bgImageSrc`)**도 스냅샷 형태로 저장하도록 자료구조를 고도화하여, 잘라내기 작업 이후 `Ctrl+Z` 클릭 시 잘라내기 이전의 uncropped 원본 이미지 상태로 완벽히 복원되도록 설계합니다.
6. **잘라내기 영역 선택 시 러버밴드(선택 상자) 내부 투명화**:
   * 잘라낼 범위를 드래그할 때 선택 상자 내부가 불투명하게 표현(또는 기존에 그린 요소가 지워지고 배경만 복구되어 흰색/부자연스러운 모습으로 노출)되어 시각적으로 불편합니다.
   * 이를 투명하게(`transparent`) 처리하기 위해, 잘라내기 영역을 `clearRect` 후 다시 그리는 대신 **선택된 영역의 상/하/좌/우 4방향에만 반투명 검은색 레이어(Dim)를 채워 넣는 방식**으로 개선하여 선택된 안쪽 영역은 기존 배경과 그린 요소들이 원본 그대로 투명하게 노출되도록 렌더링을 교체합니다.

---

## 2. 제안된 변경 사항

### 2.1 타입(Type) 및 기본값 추가

#### [MODIFY] [image_editor_types.ts](file:///home/kdy987/work/aman/frontend/src/components/imageditor/image_editor_types.ts)
- `CanvasItem.style.rotation` 속성 추가.

---

### 2.2 슬라이더 컴포넌트 개선 (`RangeSlider.tsx`)

#### [MODIFY] [RangeSlider.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/RangeSlider.tsx)
- 수동 입력 및 초기화 버튼 UI 구성 및 레이아웃 한 줄 배치로 재배치.

---

### 2.3 실행취소(Undo) 스택 구조 고도화 (`ActionImageEditor.tsx`)

#### [MODIFY] [ActionImageEditor.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/ActionImageEditor.tsx)
- `undoStack` 및 `redoStack`을 `{ items: CanvasItem[]; bgImageSrc: string }[]` 타입으로 선언하여 각 시점의 배경 이미지 URL(Base64)을 보존합니다.
- `pushToUndo`, `handleUndo`, `handleRedo` 함수에서 `bgImageSrc`가 달라졌을 때 이미지를 로드하여 캔버스 크기를 재설정하고 반영하는 로직을 결합합니다.
- 잘라내기 수행 함수(`cropImage`)의 완료 콜백 시점에 잘라내기 이전의 items 및 bgImageSrc를 수동으로 `undoStack`에 먼저 푸시하여 Ctrl+Z 복원성을 확보합니다.

```typescript
// 변경된 스택 선언
const [undoStack, setUndoStack] = useState<{ items: CanvasItem[]; bgImageSrc: string }[]>([])
const [redoStack, setRedoStack] = useState<{ items: CanvasItem[]; bgImageSrc: string }[]>([])

// pushToUndo 구현체 수정
const pushToUndo = (newItems: CanvasItem[], baseItems: CanvasItem[] = items) => {
  setUndoStack((prev) => [...prev, { items: baseItems, bgImageSrc: bgImageSrc }])
  setRedoStack([])
  setItems(newItems)
}
```

---

### 2.4 잘라내기 러버밴드 렌더링 투명화 (`ActionImageEditor.tsx`)

#### [MODIFY] [ActionImageEditor.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/ActionImageEditor.tsx)
- `activeTool === 'crop'` 일 때 캔버스 그리기(`ctx`) 부분을 수정하여, 선택 영역의 바깥쪽 4개 외곽 면에 사각형(`fillRect`) 반투명 어두운 마스크를 그리고 선택 영역 내부는 지우거나 덮어쓰지 않고 투명하게 보존합니다.
```typescript
      } else if (activeTool === 'crop') {
        const sX = Math.min(dragStart.x, dragCurrent.x)
        const sY = Math.min(dragStart.y, dragCurrent.y)
        const sW = Math.abs(dragCurrent.x - dragStart.x)
        const sH = Math.abs(dragCurrent.y - dragStart.y)

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)' // 반투명 딤 처리

        // 1. 위쪽
        ctx.fillRect(0, 0, canvas.width, sY)
        // 2. 아래쪽
        ctx.fillRect(0, sY + sH, canvas.width, canvas.height - (sY + sH))
        // 3. 왼쪽
        ctx.fillRect(0, sY, sX, sH)
        // 4. 오른쪽
        ctx.fillRect(sX + sW, sY, canvas.width - (sX + sW), sH)

        // 선택 영역 점선 테두리 그리기
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.strokeRect(sX, sY, sW, sH)
      }
```

---

## 3. 검증 계획

### 3.1 자동 빌드 및 린트 검사
코드가 컴파일 오류 없이 안전하게 구동되는지 확인합니다:
```bash
npm run build
```

### 3.2 수동 기능 테스트 (사용자 직접 확인 시나리오)
1. 텍스트나 사각형 요소를 적절히 그려넣어 임시 편집을 진행합니다.
2. `잘라내기(Crop)` 모드로 변경한 뒤 이미지의 일부 영역을 드래그하여 잘라냅니다.
3. **잘라내기 드래그 도중**, 선택 상자 내부는 어두워지지 않고 원본 캔버스 상태(이미지 및 그 위에 그려진 강조 상자, 텍스트 등)가 **지워짐 없이 투명하고 선명하게 보이는지** 점검합니다.
4. 잘라내기 완료 후, 이미지 편집 보관함(좌측 이력)에 잘라내기 직전의 온전한 uncropped 상태가 자동으로 저장되었는지 확인합니다.
5. **실행취소(Ctrl+Z)**를 누르거나 상단 Undo 버튼을 클릭했을 때, 잘라내기가 취소되면서 **원본 사이즈의 배경 이미지와 기존에 그렸던 모든 요소들이 이전 위치로 완벽하게 되돌아오는지** 확인합니다.
6. **다시실행(Ctrl+Y)**을 누르거나 Redo 버튼을 클릭했을 때, 다시 잘라내기한 영역으로 갱신되는지 최종 확인합니다.