# 구현 계획서: 이미지 에디터 내 텍스트 회전 및 멀티라인(여러 줄) 지원 기능 추가

> [!IMPORTANT]
> **진행 상태**: 사용자 검토 및 승인 대기 중 (Pending Approval)
> - 집 또는 다른 환경에서 새로운 대화 세션을 시작할 때, 이 계획서를 가장 먼저 읽어 승인 여부를 확인하고 즉시 구현을 시작해 주세요.

이 계획서는 AssetERP 도움말/매뉴얼 시스템 내 이미지 에디터(`ActionImageEditor.tsx`)에서 텍스트 요소를 선택하고 원하는 각도로 회전할 수 있는 기능 및 `Shift+Enter`를 통해 입력된 여러 줄의 텍스트가 캔버스 상에 정상적으로 줄바꿈되어 렌더링되도록 개선하는 방안을 상세히 정의합니다.

---

## 제안된 변경 사항

### 1. 타입(Type) 및 기본값 추가
`CanvasItem`의 스타일 타입에 `rotation` 속성을 추가하고, 이미지 에디터 전체 기본 설정인 `SYSTEM_ITEM_DEFAULTS`에 기본 회전 각도(0도)를 정의합니다.

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

### 2. 속성 설정 패널 구성 (`FloatingPropertyPanel.tsx`)
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

### 3. 에디터 캔버스 렌더링 및 드래그 동작 (`ActionImageEditor.tsx`)
텍스트 회전의 시각적 렌더링, 마우스 드래그를 이용한 실시간 회전, 로컬 스페이스 기준의 영역 감지, 상태 초기화/연동을 처리합니다.

#### State 정의
```typescript
  const [textRotation, setTextRotation] = useState<number>(SYSTEM_ITEM_DEFAULTS.textRotation)
```

#### [NEW] 멀티라인 텍스트 가로/세로 바운딩 박스 크기 측정 헬퍼 추가
텍스트에 줄바꿈이 있는 경우, **가장 긴 라인의 너비**를 전체 너비로 하고, **줄 수 × 줄 높이**를 전체 높이로 계산하여 텍스트 배경 상자 및 선택 점선 영역을 일관되게 맞춥니다.
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
    // 캔버스 컨텍스트가 없을 때의 대비책
    maxW = text.length * fontSize * 0.65
  }
  return {
    width: maxW,
    height: lines.length * lineHeight,
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
        const hasRotation = rotation !== 0
        const fSize = item.style.fontSize || textFontSize

        ctx.save()
        if (hasRotation) {
          ctx.translate(item.x, item.y)
          ctx.rotate((rotation * Math.PI) / 180)
        }

        const drawX = hasRotation ? 0 : item.x
        const drawY = hasRotation ? 0 : item.y

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
          ctx.fillRect(drawX - 6, drawY - 4, bgW, bgH)
          ctx.strokeStyle = item.style.borderColor || '#cbd5e1'
          ctx.lineWidth = 1
          ctx.strokeRect(drawX - 6, drawY - 4, bgW, bgH)
        }

        ctx.fillStyle = item.style.textColor || textTextColor

        // 줄 단위 텍스트 렌더링 및 밑줄/취소선 데코레이션 그리기
        lines.forEach((line, index) => {
          const lineY = drawY + index * lineHeight
          ctx.fillText(line, drawX, lineY)

          if (textDecoration && textDecoration !== 'none') {
            ctx.save()
            const lineMetrics = ctx.measureText(line)
            const lineW = lineMetrics.width
            ctx.beginPath()
            ctx.strokeStyle = item.style.textColor || textTextColor
            ctx.lineWidth = Math.max(1.5, fSize / 12)
            
            if (textDecoration === 'underline') {
              const underlineY = lineY + fSize + 2
              ctx.moveTo(drawX, underlineY)
              ctx.lineTo(drawX + lineW, underlineY)
            } else if (textDecoration === 'line-through') {
              const lineThroughY = lineY + fSize / 2 + 1
              ctx.moveTo(drawX, lineThroughY)
              ctx.lineTo(drawX + lineW, lineThroughY)
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
          ctx.strokeRect(drawX - 8, drawY - 6, boundsWidth + 16, boundsHeight + 12)

          // 텍스트 상단 중앙 26px 위에 회전 원형 핸들 표시 (실선)
          ctx.save()
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(drawX + boundsWidth / 2, drawY - 6)
          ctx.lineTo(drawX + boundsWidth / 2, drawY - 26)
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(drawX + boundsWidth / 2, drawY - 26, 5, 0, 2 * Math.PI)
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
텍스트가 회전된 상태이므로 마우스 좌표 `(x, y)`를 해당 텍스트의 중심점 또는 원점 기준으로 역회전시켜 local 좌표로 변경한 후, 바운딩 박스 내부 충돌을 검사합니다.
```typescript
  const dx = x - item.x
  const dy = y - item.y
  const rad = -rotation * Math.PI / 180
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad)
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad)
```

#### 마우스 드래그를 통한 자유 회전 (MouseMove)
- 사용자가 회전용 핸들을 선택하고 드래그 시 `resizeHandle`을 `'text-rotate'`로 지정합니다.
- `item.x`, `item.y` 기준 마우스의 각도 변화(`Math.atan2(dy, dx)`)를 계산하여 실시간으로 `item.style.rotation`을 업데이트합니다.
- **쉬프트 스냅(Shift snap)**: 사용자가 `Shift` 키를 누르고 회전하면 **15도 단위**(예: 0°, 15°, 30°, 45°, 90° 등)로 정밀하게 각도가 고정되어, 질문하신 45도 맞춤 기울임을 손쉽게 처리할 수 있습니다.

#### 상태 일치 및 연동 변수 추가
- `lastSavedState` 상태 및 초기값에 `textRotation` 추가
- `isDirty` 비교 연산에 `textRotation !== lastSavedState.textRotation` 추가
- `applyStyleConfig`, `resolveWorkStyleConfigFromLegacyData`, `buildStyleConfig`, `handleDeleteUserSettings`, `handleTextSubmit`에 `textRotation` 관련 처리 적용

---

### 4. 텍스트 입력창 수정 (`TextItemInput.tsx`)
회전된 텍스트를 더블클릭하여 편집할 때, 편집용 textarea 상자 자체도 CSS transform 속성을 사용하여 동일하게 회전되도록 수정하여 입력 편의성을 극대화합니다.

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

## 검증 계획

### 1. 자동 빌드 및 린트 검사
코드가 컴파일 오류 없이 안전하게 구동되는지 확인합니다:
```bash
npm run build
```

### 2. 수동 기능 테스트 (사용자 직접 확인 시나리오)
1. 편집 모드에서 이미지를 업로드하거나 임시 이미지를 붙여넣습니다.
2. 텍스트 도구를 선택하고 문구를 작성한 뒤 `Shift + Enter`로 줄바꿈을 입력하여 작성합니다.
3. 캔버스상에서 줄바꿈이 정상적으로 표시되고 개별 줄마다 설정된 텍스트 데코레이션(밑줄/취소선)이 잘 들어가는지 확인합니다.
4. 배치된 글씨를 클릭하면 글씨 박스 상단에 파란색 선과 원형의 **회전 핸들**이 표시되는지 확인합니다.
5. 회전 핸들을 마우스로 드래그하여 글씨가 원본 좌표 기준으로 회전하는지 확인합니다.
6. **Shift** 키를 누른 상태로 회전시킬 때 딱딱 맞물려 **15도 단위**(예: 45도)로 정교하게 맞추어지는지 확인합니다.
7. 회전된 텍스트를 더블클릭하여 편집창이 열릴 때 편집창 자체도 같은 기울기로 회전하여 자연스럽게 글씨를 타이핑할 수 있는지 확인합니다.
8. 우측 속성 창(`FloatingPropertyPanel`)의 "회전 각도" 슬라이더 조작 시에도 수치가 부드럽게 변하는지 확인합니다.
9. 다운로드 혹은 복사 기능을 실행하여 결과물 이미지(PNG)에 텍스트가 회전된 형태로 깨짐 없이 완벽히 포함되는지 검사합니다.
