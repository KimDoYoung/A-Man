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

### 2.2 속성 설정 패널 구성 (`FloatingPropertyPanel.tsx`)

텍스트 선택 여부에 따라 2군데에 "회전 각도 슬라이더(-180° ~ 180°)"를 배치합니다:
1. **텍스트 요소 선택 상태(인스펙터)**: 선택된 개별 텍스트의 각도 제어.
2. **텍스트 도구 기본 설정**: 신규 생성할 텍스트에 적용될 디폴트 각도 제어.

#### [MODIFY] [FloatingPropertyPanel.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/FloatingPropertyPanel.tsx)
- Props 정의 추가:
```typescript
  textRotation: number
  setTextRotation: (rotation: number) => void
```
- 개별 텍스트 인스펙터 추가 (`selectedItem.type === 'text'`):
```typescript
                  {/* 회전 각도 */}
                  <RangeSlider
                    label="회전 각도"
                    value={selectedItem.style.rotation !== undefined ? selectedItem.style.rotation : 0}
                    min={-180}
                    max={180}
                    unit="°"
                    onChangeValue={(val) => {
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, rotation: val } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                  />
```
- 텍스트 도구 전역 기본 설정 추가 (`activeTool === 'text'`):
```typescript
                        {/* 회전 각도 */}
                        <RangeSlider
                          label="회전 각도"
                          value={textRotation}
                          min={-180}
                          max={180}
                          unit="°"
                          onChangeValue={setTextRotation}
                        />
```

---

### 2.3 텍스트 입력창 수정 (`TextItemInput.tsx`)

회전된 텍스트를 편집할 때, 편집용 textarea 상자 자체도 CSS transform 속성을 사용하여 동일하게 회전되도록 수정하여 입력 편의성을 극대화합니다.

#### [MODIFY] [TextItemInput.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/TextItemInput.tsx)
```diff
 interface TextItemInputProps {
   x: number
   y: number
   zoom: number
+  rotation: number
   value: string
   onChange: (val: string) => void
   onSubmit: () => void
   onCancel: () => void
 }
```
```diff
       style={{
         top: y * zoom,
         left: x * zoom,
-        transform: `scale(${zoom})`,
+        transform: `scale(${zoom}) rotate(${rotation}deg)`,
         transformOrigin: 'top left'
       }}
```

---

### 2.4 에디터 캔버스 렌더링 및 드래그 동작 (`ActionImageEditor.tsx`)

#### State 및 설정 연동 추가
- `textRotation` 상태 추가:
```typescript
  const [textRotation, setTextRotation] = useState<number>(SYSTEM_ITEM_DEFAULTS.textRotation)
```
- `lastSavedState`에 `textRotation: number` 추가 및 기본값 연동
- `isDirty` 비교 연산에 `textRotation !== lastSavedState.textRotation` 추가
- `applyStyleConfig`, `resolveWorkStyleConfigFromLegacyData`, `buildStyleConfig`, `handleDeleteUserSettings`, `handleTextSubmit`에 `textRotation` 관련 처리 적용

#### 멀티라인 텍스트 가로/세로 바운딩 박스 크기 측정 헬퍼 추가
텍스트에 줄바꿈이 있는 경우, **가장 긴 라인의 너비**를 전체 너비로 하고, **(줄 수 - 1) × 줄 높이 + 폰트 크기**를 전체 높이로 계산하여 텍스트 배경 상자 및 선택 점선 영역을 일관되게 맞춥니다.
```typescript
// 텍스트 아이템의 실제 너비와 높이를 계산하는 헬퍼 함수
function getTextBounds(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  fontSize: number,
  fontStyle: 'normal' | 'italic'
) {
  const lines = text.split('\n')
  const lineHeight = fontSize * 1.2
  let maxW = 0
  if (ctx) {
    ctx.save()
    ctx.font = `${fontStyle === 'italic' ? 'italic' : 'normal'} bold ${fontSize}px sans-serif`
    lines.forEach((line) => {
      const w = ctx.measureText(line).width
      if (w > maxW) maxW = w
    })
    ctx.restore()
  } else {
    maxW = text.length * fontSize * 0.65
  }
  const height = lines.length > 0 ? (lines.length - 1) * lineHeight + fontSize : 0
  return {
    width: maxW,
    height,
    lineHeight,
    lines
  }
}
```

#### 회전 상태 및 멀티라인 텍스트 렌더링 & 회전 핸들 드로잉
캔버스 컨텍스트의 `translate`와 `rotate`를 활용해 원점 이동 후 회전시켜 글씨를 렌더링합니다. 선택되었을 때는 상단에 연결선과 조절 원형 핸들을 그려줍니다.
```typescript
      else if (item.type === 'text') {
        const fontStyle = item.style.fontStyle || 'normal'
        const textDecoration = item.style.textDecoration || 'none'
        const rotation = item.style.rotation || 0
        const fSize = item.style.fontSize || textFontSize

        ctx.save()
        // (item.x, item.y)로 원점 이동 후 회전 적용 (일관적인 로컬 좌표계 사용)
        ctx.translate(item.x, item.y)
        if (rotation !== 0) {
          ctx.rotate((rotation * Math.PI) / 180)
        }

        ctx.font = `${fontStyle === 'italic' ? 'italic' : 'normal'} bold ${fSize}px sans-serif`
        ctx.textBaseline = 'top'
        ctx.textAlign = 'left'

        // 멀티라인 크기 및 줄 정보 획득
        const { width: boundsWidth, height: boundsHeight, lineHeight, lines } = getTextBounds(ctx, item.text || '', fSize, fontStyle)

        // 텍스트를 감싸는 배경 박스
        const textBg = item.style.backgroundColor || 'transparent'
        if (textBg && textBg !== 'transparent') {
          const bgW = boundsWidth + 12
          const bgH = boundsHeight + 10
          ctx.fillStyle = textBg
          ctx.fillRect(-6, -4, bgW, bgH)
          ctx.strokeStyle = item.style.borderColor || '#cbd5e1'
          ctx.lineWidth = 1
          ctx.strokeRect(-6, -4, bgW, bgH)
        }

        ctx.fillStyle = item.style.textColor || textTextColor

        // 줄 단위 텍스트 렌더링 및 밑줄/취소선 데코레이션 그리기
        lines.forEach((line, index) => {
          const lineY = index * lineHeight
          ctx.fillText(line, 0, lineY)

          if (textDecoration && textDecoration !== 'none') {
            ctx.save()
            const lineMetrics = ctx.measureText(line)
            const lineW = lineMetrics.width
            ctx.beginPath()
            ctx.strokeStyle = item.style.textColor || textTextColor
            ctx.lineWidth = Math.max(1.5, fSize / 12)
            
            if (textDecoration === 'underline') {
              const underlineY = lineY + fSize + 2
              ctx.moveTo(0, underlineY)
              ctx.lineTo(lineW, underlineY)
            } else if (textDecoration === 'line-through') {
              const lineThroughY = lineY + fSize / 2 + 1
              ctx.moveTo(0, lineThroughY)
              ctx.lineTo(lineW, lineThroughY)
            }
            ctx.stroke()
            ctx.restore()
          }
        })

        // 선택 영역 하이라이트 & 회전 핸들 그리기
        if (isSelected) {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.strokeRect(-8, -6, boundsWidth + 16, boundsHeight + 12)

          // 텍스트 상단 중앙 26px 위에 회전 원형 핸들 표시 (실선)
          ctx.save()
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(boundsWidth / 2, -6)
          ctx.lineTo(boundsWidth / 2, -26)
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(boundsWidth / 2, -26, 5, 0, 2 * Math.PI)
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5
          ctx.fill()
          ctx.stroke()
          ctx.restore()
        }

        ctx.restore()
      }
```

#### 회전된 영역 클릭 판정 (Selection & Double-click)
텍스트가 회전된 상태이므로 마우스 좌표 `(x, y)`를 해당 텍스트의 원점 기준으로 역회전시켜 local 좌표로 변경한 후, 바운딩 박스 내부 충돌을 검사합니다.
```typescript
  const dx = x - item.x
  const dy = y - item.y
  const rad = -rotation * Math.PI / 180
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad)
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad)
```

#### 마우스 드래그를 통한 자유 회전 (MouseMove)
- `handleMouseDown`에서 선택된 텍스트 아이템이 존재할 때, 회전 핸들 위치 `(boundsWidth / 2, -26)`과 마우스 클릭 `(localX, localY)` 사이의 거리 측정:
```typescript
  const dist = Math.hypot(localX - boundsWidth / 2, localY - (-26))
  if (dist <= 8) {
    setResizeHandle('text-rotate')
    setIsDrawing(true)
    setDragStart({ x, y })
    return
  }
```
- 사용자가 회전용 핸들을 선택하고 드래그 시 `resizeHandle`을 `'text-rotate'`로 지정합니다.
- `item.x`, `item.y` 기준 마우스의 각도 변화(`Math.atan2(dy, dx)`)를 계산하여 실시간으로 `item.style.rotation`을 업데이트합니다.
  - 핸들의 local 기준 기본 각도 `baseAngle = Math.atan2(-26, boundsWidth / 2)`를 구하고, `currentAngle - baseAngle`을 회전 각도로 설정합니다.
- **쉬프트 스냅(Shift snap)**: 사용자가 `Shift` 키를 누르고 회전하면 **15도 단위**(예: 0°, 15°, 30°, 45°, 90° 등)로 정밀하게 각도가 고정되도록 처리합니다.

#### 텍스트 생성 좌표 zoom 오류 수정
- `activeTool === 'text'` 일 때 `setTextInput` 좌표를 CSS 좌표(`clientX - rect.left`)가 아닌 캔버스 실제 픽셀 좌표 `(x, y)`로 설정하여 화면 zoom 스케일링 적용 시 위치가 어긋나지 않도록 수정합니다.

---

## 3. 검증 계획

### 3.1 자동 빌드 및 린트 검사
코드가 컴파일 오류 없이 안전하게 구동되는지 확인합니다:
```bash
npm run build
```

### 3.2 수동 기능 테스트 (사용자 직접 확인 시나리오)
1. 편집 모드에서 이미지를 업로드하거나 임시 이미지를 붙여넣습니다.
2. 텍스트 도구를 선택하고 문구를 작성한 뒤 `Shift + Enter`로 줄바꿈을 입력하여 작성합니다.
3. 캔버스상에서 줄바꿈이 정상적으로 표시되고 개별 줄마다 설정된 텍스트 데코레이션(밑줄/취소선)이 잘 들어가는지 확인합니다.
4. 배치된 글씨를 클릭하면 글씨 박스 상단에 파란색 선과 원형의 **회전 핸들**이 표시되는지 확인합니다.
5. 회전 핸들을 마우스로 드래그하여 글씨가 원본 좌표 기준으로 회전하는지 확인합니다.
6. **Shift** 키를 누른 상태로 회전시킬 때 딱딱 맞물려 **15도 단위**(예: 45도)로 정교하게 맞추어지는지 확인합니다.
7. 회전된 텍스트를 더블클릭하여 편집창이 열릴 때 편집창 자체도 같은 기울기로 회전하여 자연스럽게 글씨를 타이핑할 수 있는지 확인합니다.
8. 우측 속성 창(`FloatingPropertyPanel`)의 "회전 각도" 슬라이더 조작 시에도 수치가 부드럽게 변하는지 확인합니다.
9. 다운로드 혹은 복사 기능을 실행하여 결과물 이미지(PNG)에 텍스트가 회전된 형태로 깨짐 없이 완벽히 포함되는지 검사합니다.
