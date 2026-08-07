import { CanvasItem } from './image_editor_types'

export const STAMP_ANGLES: Record<string, number> = {
  'right': 0,
  'down-right': Math.PI * 0.25,
  'down': Math.PI * 0.5,
  'down-left': Math.PI * 0.75,
  'left': Math.PI,
  'up-left': Math.PI * 1.25,
  'up': Math.PI * 1.5,
  'up-right': Math.PI * 1.75
}

/**
 * 8방향 블록 화살표 스탬프 렌더링 함수
 */
export const drawBlockArrowStamp = (
  ctx: CanvasRenderingContext2D,
  item: CanvasItem
) => {
  const x = item.x
  const y = item.y
  const width = item.width ?? 60
  const height = item.height ?? 60
  const direction = item.style.stampDirection ?? 'right'
  const color = item.style.borderColor ?? '#ef4444' // 테두리/채우기 색상

  const cx = x + width / 2
  const cy = y + height / 2
  const angle = STAMP_ANGLES[direction] ?? 0

  ctx.save()

  // 1. 투명도 적용
  ctx.globalAlpha = item.style.opacity ?? 1.0

  // 2. 스탬프 중심점으로 좌표계 이동 및 회전
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  // 3. 채우기 색상 적용
  ctx.fillStyle = color
  ctx.strokeStyle = color

  // 4. 9꼭짓점 블록 화살표 다각형 그리기 (기본 방향: 오른쪽 ➔)
  // picpic_arraw.png 참조: 화살촉 날개 끝의 평평한 구간(2-3)과 화살대 두께(5-6)의
  // 길이가 거의 동일하도록 같은 비율(flareRatio)을 공유시켜 picpic 스탬프와 형태를 맞춥니다.
  const w2 = width / 2
  const h2 = height / 2
  const flareRatio = 0.3 // 2-3 구간(가로) 길이와 5-6 구간(세로) 길이를 동일하게 맞추는 공용 비율
  const junctionX = w2 - width * 0.50 // 화살촉과 화살대가 접합하는 x좌표 (점 2, 4, 6, 8)
  const wingBackX = junctionX - width * flareRatio // 날개 뒷쪽 끝 x좌표 (점 3, 7)
  const shaftHalf = h2 * flareRatio // 화살대 두께의 절반 (점 4, 5, 6, 9)
  const tailLen = junctionX + w2 // 화살대(꼬리) 길이 (4-5, 7-6 구간 길이)
  const shaftEndX = junctionX - tailLen * 2 // 꼬리 길이를 2배로 늘린 화살대 끝 x좌표 (점 5, 6)

  ctx.beginPath()
  // 점 1 (화살표 뾰족한 정점 - 맨 오른쪽 끝)
  ctx.moveTo(w2, 0)
  // 점 2 (윗날개 앞쪽 끝)
  ctx.lineTo(junctionX, -h2)
  // 점 3 (윗날개 뒤쪽 끝: 2-3 길이 = width * flareRatio)
  ctx.lineTo(wingBackX, -h2)
  // 점 4 (윗날개 안쪽 접합부 - 화살대 윗변 시작점)
  ctx.lineTo(junctionX, -shaftHalf)
  // 점 5 (화살대 끝 위 - 4-5 길이가 기존의 2배)
  ctx.lineTo(shaftEndX, -shaftHalf)
  // 점 6 (화살대 끝 아래 - 7-6 길이가 기존의 2배, 4-5와 동일)
  ctx.lineTo(shaftEndX, shaftHalf)
  // 점 7 (아랫날개 안쪽 접합부)
  ctx.lineTo(junctionX, shaftHalf)
  // 점 8 (아랫날개 뒤쪽 끝)
  ctx.lineTo(wingBackX, h2)
  // 점 9 (아랫날개 앞쪽 끝)
  ctx.lineTo(junctionX, h2)

  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

/**
 * 손가락(포인팅 핸드) 스탬프 - 주먹+검지 SVG 아이콘(viewBox 0 0 32 32) 트레이스를 그대로 사용.
 * 좌표상 손가락 끝은 x≈1 쪽이지만 실측 렌더 결과 각도 0(반전 없음)일 때 오른쪽을 가리켜
 * STAMP_ANGLES 관례와 맞으므로 반전 없이 그대로 스케일만 적용한다.
 */
const HAND_POINTER_PATH_D =
  'M29,10H19c0-1.654-1.346-3-3-3h-5c-0.656,0-1.301,0.219-1.821,0.617L3.716,11H1' +
  'c-0.552,0-1,0.448-1,1v12c0,0.552,0.448,1,1,1h2.687l2.972,2.069C7.247,27.613,8.214,28,9,28h9.848c1.582,0,3.006-1.16,3.141-2.737' +
  'c0.054-0.633-0.089-1.229-0.375-1.735C22.446,22.995,23,22.061,23,21c0-0.535-0.141-1.037-0.387-1.472' +
  'C23.446,18.995,24,18.061,24,17c0-0.351-0.061-0.687-0.171-1H29c1.657,0,3-1.343,3-3S30.657,10,29,10z M4,23H2V13h2V23z M29,14h-8' +
  'c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.552,0,1,0.449,1,1s-0.448,1-1,1h-1c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1' +
  'c0.552,0,1,0.449,1,1s-0.448,1-1,1h-1c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.552,0,1,0.449,1,1s-0.448,1-1,1H9' +
  'c-0.285,0-0.799-0.213-1-0.414l-3-2.104V12.557l5.277-3.268C10.277,9.289,10.774,9,11,9h5c0.552,0,1,0.449,1,1c0,0.168,0,1,0,1h-4' +
  'c-0.276,0-0.5,0.224-0.5,0.5c0,0.276,0.224,0.5,0.5,0.5h16c0.552,0,1,0.448,1,1C30,13.552,29.552,14,29,14z'

const HAND_POINTER_PATH = new Path2D(HAND_POINTER_PATH_D)

export const drawHandPointerStamp = (
  ctx: CanvasRenderingContext2D,
  item: CanvasItem
) => {
  const x = item.x
  const y = item.y
  const width = item.width ?? 60
  const height = item.height ?? 60
  const direction = item.style.stampDirection ?? 'right'
  const color = item.style.borderColor ?? '#ef4444'

  const cx = x + width / 2
  const cy = y + height / 2
  const angle = STAMP_ANGLES[direction] ?? 0
  const s = width / 32

  ctx.save()
  ctx.globalAlpha = item.style.opacity ?? 1.0
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.scale(s, s)
  ctx.translate(-16, -16)
  ctx.fillStyle = color
  ctx.fill(HAND_POINTER_PATH)

  ctx.restore()
}

/**
 * 마우스 커서 화살표 스탬프 - lucide `mouse-pointer-2` 아이콘(viewBox 0 0 24 24) 트레이스를 그대로 사용.
 * 원본 아이콘의 뾰족한 끝(tip)은 좌상단(4.037,4.688)에 있어 뷰박스 중심(12,12) 기준 위쪽-왼쪽을
 * 가리키므로, tip 방향 벡터를 상쇄하는 baseOffset을 더해 STAMP_ANGLES 관례(각도 0 = 오른쪽)에 맞춘다.
 */
const CURSOR_ARROW_PATH_D =
  'M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58' +
  'a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z'

const CURSOR_ARROW_PATH = new Path2D(CURSOR_ARROW_PATH_D)

const CURSOR_ARROW_TIP_X = 4.037
const CURSOR_ARROW_TIP_Y = 4.688
const CURSOR_ARROW_VIEWBOX_CENTER = 12
const CURSOR_ARROW_BASE_OFFSET = -Math.atan2(
  CURSOR_ARROW_TIP_Y - CURSOR_ARROW_VIEWBOX_CENTER,
  CURSOR_ARROW_TIP_X - CURSOR_ARROW_VIEWBOX_CENTER
)

export const drawCursorArrowStamp = (
  ctx: CanvasRenderingContext2D,
  item: CanvasItem
) => {
  const x = item.x
  const y = item.y
  const width = item.width ?? 60
  const height = item.height ?? 60
  const direction = item.style.stampDirection ?? 'right'
  const color = item.style.borderColor ?? '#ef4444'

  const cx = x + width / 2
  const cy = y + height / 2
  const angle = (STAMP_ANGLES[direction] ?? 0) + CURSOR_ARROW_BASE_OFFSET
  const s = width / 24

  ctx.save()
  ctx.globalAlpha = item.style.opacity ?? 1.0
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.scale(s, s)
  ctx.translate(-CURSOR_ARROW_VIEWBOX_CENTER, -CURSOR_ARROW_VIEWBOX_CENTER)
  ctx.fillStyle = color
  ctx.fill(CURSOR_ARROW_PATH)

  ctx.restore()
}

// 스탬프 모양 디스패처 - item.style.stampShape에 따라 알맞은 렌더 함수로 위임 (기본값 'arrow')
export const drawStamp = (ctx: CanvasRenderingContext2D, item: CanvasItem) => {
  const shape = item.style.stampShape || 'arrow'
  if (shape === 'hand') {
    drawHandPointerStamp(ctx, item)
  } else if (shape === 'cursor') {
    drawCursorArrowStamp(ctx, item)
  } else {
    drawBlockArrowStamp(ctx, item)
  }
}
