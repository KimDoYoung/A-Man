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

---

## 2. 제안된 변경 사항

### 2.1 타입(Type) 및 기본값 추가

#### [MODIFY] [image_editor_types.ts](file:///home/kdy987/work/aman/frontend/src/components/imageditor/image_editor_types.ts)
```diff
 export interface CanvasItem {
   id: string
   type: 'circle-number' | 'box' | 'text' | 'arrow' | 'orthogonal-arrow' | 'symbol' | 'image' | 'block-arrow-stamp'
   x: number
   y: number
   width?: number
   height?: number
   text?: string
   imageSrc?: string
   style: {
     borderColor?: string
     borderWidth?: number
     backgroundColor?: string
     textColor?: string
     fontSize?: number
     lineStyle?: 'solid' | 'dashed'
     opacity?: number
     borderRadius?: number
     midX?: number
     hasBorder?: boolean
     hasCaption?: boolean
     fontStyle?: 'normal' | 'italic'
     textDecoration?: 'none' | 'underline' | 'line-through'
     stampDirection?: string
+    rotation?: number
   }
 }
```

#### [MODIFY] [image_items_defaults.ts](file:///home/kdy987/work/aman/frontend/src/components/imageditor/image_items_defaults.ts)
```diff
   // 4. 일반 텍스트 (text) 전용 속성
   textTextColor: '#0f172a',
   textFontSize: 16,
   textBgColor: 'transparent',
   textFontStyle: 'normal' as 'normal' | 'italic',
   textTextDecoration: 'none' as 'none' | 'underline' | 'line-through',
+  textRotation: 0,
```

---

### 2.2 슬라이더 컴포넌트 개선 (`RangeSlider.tsx`)

수동 입력(텍스트 상자 혹은 콤보 드롭다운 select) 기능을 유연하고 확장 가능하도록 Props 설계합니다.

#### [MODIFY] [RangeSlider.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/RangeSlider.tsx)
- Props에 다음 속성들을 새로 추가합니다:
  * `defaultValue?: number`: 지정 시 라벨 옆에 `RotateCcw` 초기화 아이콘 노출 및 리셋 기능 제공.
  * `manual_input_enable?: boolean`: 지정 시 우측 상단 수치 옆에 `Edit3` 수동 입력 연필 아이콘 노출.
  * `manual_input_type?: 'number' | 'select'`: 수동 입력 UI 유형 결정 (기본값 `'number'`).
  * `manual_input_options?: number[]`: `'select'` 타입일 때 선택할 수 있는 드롭다운 옵션 배열.

```typescript
import React, { useState } from 'react'
import { RotateCcw, Edit3 } from 'lucide-react'

interface RangeSliderProps {
  label: string
  value: number
  min: number
  max: number
  onChangeValue: (val: number) => void
  unit?: string
  button_inc_dev_enable?: boolean
  button_inc_dev_step?: number
  defaultValue?: number
  manual_input_enable?: boolean       // 수동 입력 사용 여부 (기본값 false)
  manual_input_type?: 'number' | 'select' // 수동 입력 UI 타입 (number 또는 select)
  manual_input_options?: number[]     // select 타입일 때의 선택 옵션
}
```

- 렌더링 구현:
  * `manual_input_enable`이 활성화되어 있고, 사용자가 연필 아이콘을 클릭하여 수동 입력 모드로 진입하면 슬라이더 대신 입력란을 노출합니다.
  * `manual_input_type === 'number'`인 경우 `<input type="number" ... />`를 띄워 직접 타이핑을 받고, `onBlur` 및 `Enter` 시 값을 클램핑하여 확정합니다.
  * `manual_input_type === 'select'`인 경우 `<select ... />` 드롭다운을 띄워 `manual_input_options`에 포함된 목록 중 하나를 선택하도록 지원합니다.

---

### 2.3 속성 설정 패널 구성 (`FloatingPropertyPanel.tsx`)

#### [MODIFY] [FloatingPropertyPanel.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/FloatingPropertyPanel.tsx)
- 회전 각도 슬라이더 렌더링 영역(선택 인스펙터 및 글로벌 설정)에 `defaultValue={0}` 및 `manual_input_enable={true}`, `manual_input_type="number"` 속성을 전달합니다.
```diff
                   {/* 회전 각도 */}
                   <RangeSlider
                     label="회전 각도"
                     value={selectedItem.style.rotation !== undefined ? selectedItem.style.rotation : 0}
                     min={-180}
                     max={180}
                     unit="°"
                     button_inc_dev_enable={true}
                     button_inc_dev_step={5}
+                    defaultValue={0}
+                    manual_input_enable={true}
+                    manual_input_type="number"
                     onChangeValue={(val) => { ... }}
                   />
```

---

### 2.4 텍스트 입력창 수정 (`TextItemInput.tsx`)

#### [MODIFY] [TextItemInput.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/TextItemInput.tsx)
- Props 타입에 `rotation` 추가 및 CSS `transform: scale(${zoom}) rotate(${rotation}deg)` 적용.

---

### 2.5 에디터 캔버스 렌더링 및 드래그 동작 (`ActionImageEditor.tsx`)

#### [MODIFY] [ActionImageEditor.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/ActionImageEditor.tsx)
- `textRotation` 상태 관리 및 `lastSavedState`, `isDirty`, `buildStyleConfig`, `applyStyleConfig` 연동.
- 멀티라인 바운딩 박스 계산을 위한 `getTextBounds` 헬퍼 적용.
- 캔버스 원점 이동(translate) 후 텍스트 그리기 및 다중 행 분할 렌더링.
- 로컬 스페이스 좌표 역회전을 통한 클릭/더블클릭 감지 및 마우스 드래그 회전/Shift 15도 스냅 처리.
- 텍스트 생성 좌표의 zoom 보정.

---

## 3. 검증 계획

### 3.1 자동 빌드 및 린트 검사
코드가 컴파일 오류 없이 안전하게 구동되는지 확인합니다:
```bash
npm run build
```

### 3.2 수동 기능 테스트 (사용자 직접 확인 시나리오)
1. 우측 속성 창의 "회전 각도" 슬라이더 영역에서 라벨("회전 각도") 옆의 **동그란 화살표 초기화 아이콘(↺)**을 클릭했을 때, 각도가 `0°`로 초기화되는지 점검합니다.
2. 각도 표시 영역 우측의 **연필 모양 편집 아이콘(✏️)**을 클릭했을 때, 아래의 슬라이더 영역이 사라지고 **숫자 입력란**이 채워져 나타나는지 확인합니다.
3. 숫자 입력란에 `45`를 입력하고 엔터(Enter) 키를 누르거나 확인 버튼을 클릭 시, 텍스트가 정확히 `45°`로 기울어지며 슬라이더 모드로 돌아가는지 확인합니다.


```tsx
        <button
          type="button"
          onClick={handleConfirm}
          className="text-xs px-2 py-0.5 bg-gray-300 hover:bg-indigo-500 text-white rounded cursor-pointer font-bold h-6 flex items-center justify-center transition-colors"
        >
          확인
        </button>
      )}
      <button
        type="button"
        onClick={handleCancel}
        className="text-xs px-2 py-0.5 bg-gray-300  hover:bg-gray-500  text-white  rounded cursor-pointer font-bold h-6 flex items-center justify-center transition-colors"
      >
        취소
      </button>
```          