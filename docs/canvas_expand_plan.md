# 구현 계획서: 이미지 에디터 바탕 확장(Canvas Expand) 기능 추가 (대안 A - 안전 확장 특화)

> [!IMPORTANT]
> **진행 상태**: 구현 완료 (Implementation Completed) — 상/하/좌/우 4방향 모두 지원
> - 이 계획서는 [docs/canvas_expand_plan.md](file:///home/kdy987/work/aman/docs/canvas_expand_plan.md)에 보관되며, 사용자 요청에 맞춰 플로팅 탭 대신 상단 헤더 툴바에 직관적인 8버튼(상/하/좌/우 × 증감)으로 단순화하여 구현되었습니다.
> - 최초 버전은 우측/하단만 지원했으나, 이후 좌측/상단 확장까지 동일한 헤더 툴바에 추가되었습니다. 좌측/상단은 이미지 원점이 캔버스 내부에서 이동하는 특성상 우측/하단과는 다른 보정(아이템 좌표 이동)이 필요합니다 (2.1절 참고).

이 계획서는 이미지 에디터(`ActionImageEditor.tsx`)에 원본 이미지의 상/하/좌/우 4방향 바탕을 확장할 수 있는 기능을 추가하되, **안전한 축소 제한 보호막(도형 잘림 방지)** 및 **상단 헤더 툴바 버튼 UI**를 지원하는 상세 설계안을 기술합니다.

---

## 1. 개요 및 해결할 문제

1. **도형 손실 방지 (축소 제한)**:
   - 사용자가 하단 여백을 늘려 그 위에 여러 도형이나 텍스트를 배치한 뒤, 실수로 여백 크기를 다시 줄여버리면 배치해 둔 소중한 작업물이 캔버스 영역 밖으로 잘려 나가거나 유실될 수 있습니다.
   - **해결책**: 현재 확장 여백 영역에 배치된 모든 도형의 가장 바깥쪽 경계선(Bounding Box)을 실시간으로 계산하여, **이미 배치된 도형이 잘려나가는 범위 이하로는 축소할 수 없도록 최소 한계선(Minimum Clamp)을 설정**합니다.
   - 캔버스 크기가 원본 이미지 자체보다도 절대 작게 줄어들지 않도록(최소 0px 추가 여백) 보장합니다.
2. **상단 헤더 우측 보기 배율 옆 배치 (UI 단순화 및 나란히 정렬)**:
   - 우측 속성 패널을 매번 열어야 하는 번거로움을 없애기 위해, 바탕확정 탭을 삭제하고 **상단 헤더의 보기 배율 설정 바로 왼쪽**에 상/하/좌/우 8개의 직관적인 버튼으로 통합하여 나란히(flex items-center space-x-2) 배치합니다.
   - **버튼 구성**:
     - `상단 +100` / `상단 -100`: 상단 여백 100px 추가/축소 (도형 자동 이동, 보호 범위 내에서만 축소 작동)
     - `하단 +100` / `하단 -100`: 하단 여백 100px 추가/축소 (도형 보호 범위 내에서만 축소 작동)
     - `좌측 +100` / `좌측 -100`: 좌측 여백 100px 추가/축소 (도형 자동 이동, 보호 범위 내에서만 축소 작동)
     - `우측 +100` / `우측 -100`: 우측 여백 100px 추가/축소 (도형 보호 범위 내에서만 축소 작동)

---

## 2. 제안된 변경 사항

### 2.1 축소 한계선 계산 수식 (`ActionImageEditor.tsx`)
확장 영역에 들어간 도형들의 좌표와 크기를 기준으로 최소 여백 크기를 계산합니다:
* **하단 최소 여백 (`minBottomMargin`)**:
  - 각 아이템의 `y`좌표 + 세로 크기(반지름, 폰트 높이 등) 중 가장 큰 값이 원본 이미지 높이(`bgImage.height`)를 초과한 양의 최댓값.
* **우측 최소 여백 (`minRightMargin`)**:
  - 각 아이템의 `x`좌표 + 가로 크기 중 가장 큰 값이 원본 이미지 너비(`bgImage.width`)를 초과한 양의 최댓값.

이 최솟값 수식을 바탕으로 `canvasExpandBottom`과 `canvasExpandRight` 상태 변경 시 `Math.max(newValue, minMargin)`으로 안전 클램프 처리를 수행합니다.

**좌측/상단 확장은 우측/하단과 다른 보정이 하나 더 필요합니다.** 우측/하단은 이미지 원점 `(0,0)`이 그대로 유지된 채 캔버스만 바깥으로 자라나므로 기존 아이템 좌표를 건드릴 필요가 없습니다. 반면 좌측/상단 확장은 배경 이미지가 `drawImage(bgImage, canvasExpandLeft, canvasExpandTop)`로 캔버스 내부에서 오른쪽/아래로 밀려나므로, **기존 아이템의 `x`/`y`(및 `orthogonal-arrow`의 `midX`)를 같은 델타만큼 함께 이동시켜야** 이미지 위 도형 위치가 시각적으로 어긋나지 않습니다 (`handleExpandTop`/`handleExpandLeft`/`handleShrinkTop`/`handleShrinkLeft`에서 `items.map(item => ({...item, y/x: ... ± 100}))` 형태로 처리). 축소 가능 여부는 `canShrinkTop`/`canShrinkLeft`가 여백이 100px 이상이고 여백 안(좌표 100px 미만)에 놓인 도형이 없는지로 판단합니다.

마우스 클릭 좌표는 `getBoundingClientRect` + `canvas.width / rect.width` 스케일로 캔버스 픽셀 좌표를 그대로 사용하며, 캔버스의 width/height 자체가 이미 4방향 여백을 모두 포함하므로 클릭 위치 계산에는 방향별 특수 처리가 필요 없습니다.

---

### 2.2 상단 헤더 툴바 UI 배치 (`ActionImageEditor.tsx`)

보기 배율 조절 바로 왼쪽에 아래와 같이 바탕 확장 단축 패널을 결합하였습니다:

```tsx
{/* 우측 상단 컨트롤 그룹 (바탕 확장 + 보기 배율 나란히 배치) */}
{bgImage && (
  <div className="flex items-center space-x-2 mr-2">
    {/* 바탕 확장 컨트롤 */}
    <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-1 space-x-1 shadow-2xs">
      <span className="text-[10px] text-gray-500 dark:text-slate-400 font-bold px-1.5 shrink-0">바탕 확장:</span>
      <button
        type="button"
        onClick={() => setCanvasExpandBottom(canvasExpandBottom + 100)}
        className="px-2 py-0.5 text-[10px] font-bold rounded bg-transparent text-gray-550 dark:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-150 dark:border-slate-880 cursor-pointer transition-all shrink-0"
      >
        하단 +100
      </button>
      <button
        type="button"
        onClick={() => setCanvasExpandBottom(Math.max(minBottomMargin, canvasExpandBottom - 100))}
        disabled={canvasExpandBottom <= minBottomMargin}
        className="px-2 py-0.5 text-[10px] font-bold rounded bg-transparent text-gray-550 dark:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-150 dark:border-slate-880 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
      >
        하단 -100
      </button>
      ...
    </div>
    
    {/* 보기 배율 컨트롤 */}
    ...
  </div>
)}
```

---

## 3. 검증 계획

### 3.1 자동 빌드 및 린트 검사
코드가 컴파일 오류 없이 안전하게 구동되는지 확인합니다:
```bash
npm run build
```

### 3.2 수동 기능 테스트 (사용자 직접 확인 시나리오)
1. 이미지를 로드한 뒤, 상단 우측에 **[바탕 확장]**과 **[보기 배율]** 설정 패널이 나란히 정렬되어 정돈된 모습을 점검합니다.
2. `[하단 +100]` / `[우측 +100]` 버튼을 클릭하여 여백이 100px 씩 정상적으로 늘어나는지 확인합니다.
3. 여백에 도형을 얹었을 때 `[하단 -100]` / `[우측 -100]`이 비활성화되거나 최소 여백으로 제한되는지 확인합니다.
4. `[상단 +100]` / `[좌측 +100]`을 클릭했을 때 기존에 배치해 둔 도형들이 이미지와 함께 자연스럽게 밀려 이동하고(위치 어긋남 없음), 캔버스가 해당 방향으로 확장되는지 확인합니다.
5. 상단/좌측 여백 위에 도형을 배치한 뒤 `[상단 -100]` / `[좌측 -100]`이 비활성화되거나(도형이 100px 이내 여백에 걸쳐 있는 경우) 정상 작동하는지 확인합니다.
6. Undo/Redo로 4방향 확장/축소 및 도형 이동이 올바르게 되돌려지는지 확인합니다.
7. 확장된 상태로 임시 저장 후 다시 불러왔을 때 4방향 여백과 도형 위치가 그대로 복원되는지 확인합니다.
