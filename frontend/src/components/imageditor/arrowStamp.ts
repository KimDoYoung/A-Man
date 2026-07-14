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
