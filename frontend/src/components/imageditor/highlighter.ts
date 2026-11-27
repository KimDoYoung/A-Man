// 형광펜(highlighter) 도형 - 그리기·생성·선택 판정 (docs/이미지편집-형광펜기능-설계.md)
//
// "사람이 형광펜으로 칠한 것처럼" 보이게 하는 방법
//  1. 곱하기 합성(multiply): 흰 바탕만 형광색으로 물들고 검은 글씨는 그대로 검게 보인다.
//  2. 굵고 끝이 둥근 선 (lineCap/lineJoin = round)
//  3. 한 획은 하나의 path로 한 번만 stroke → 같은 획 안에서 겹쳐도 진해지지 않음
//  4. 손떨림 보정: 가까운 점은 버리고, 중간점을 잇는 2차 곡선으로 부드럽게 그림
import { CanvasItem } from './image_editor_types'
import { getDistanceToSegment } from './canvasDrawHelpers'

type Point = { x: number; y: number }

/** 직전 점과 이 거리(px) 미만이면 버린다 (손떨림 보정 + 저장 데이터 축소) */
const MIN_POINT_DISTANCE = 2

/**
 * 그리는 중인 획에 점을 추가한 새 배열을 돌려준다.
 * straight(Shift) 이면 시작점 높이로 고정한 수평 직선(점 2개)이 된다.
 */
export function addHighlighterPoint(points: Point[], p: Point, straight: boolean): Point[] {
  if (points.length === 0) return [p]
  const first = points[0]
  if (straight) {
    return [first, { x: p.x, y: first.y }]
  }
  const last = points[points.length - 1]
  if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_DISTANCE) return points
  return [...points, p]
}

/** 획 전체 길이 */
function pathLength(points: Point[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return len
}

/**
 * 절대좌표 점들로 형광펜 도형을 만든다.
 * x, y, width, height = 선 두께까지 포함해 획을 감싸는 사각형, points = x, y 기준 상대좌표.
 * 너무 짧은 획(클릭만 한 경우 등)은 null.
 */
export function buildHighlighterItem(
  absPoints: Point[],
  color: string,
  width: number,
  opacityPercent: number
): CanvasItem | null {
  if (absPoints.length < 2 || pathLength(absPoints) < 3) return null
  const pad = width / 2
  const xs = absPoints.map((p) => p.x)
  const ys = absPoints.map((p) => p.y)
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const maxX = Math.max(...xs) + pad
  const maxY = Math.max(...ys) + pad
  return {
    id: `item-${Date.now()}`,
    type: 'highlighter',
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: absPoints.map((p) => ({ x: p.x - minX, y: p.y - minY })),
    style: {
      borderColor: color,
      borderWidth: width,
      opacity: opacityPercent / 100
    }
  }
}

/** 도형의 점들을 캔버스 절대좌표로 */
export function getHighlighterAbsPoints(item: CanvasItem): Point[] {
  return (item.points || []).map((p) => ({ x: item.x + p.x, y: item.y + p.y }))
}

/** 절대좌표 점들로 형광펜 획 그리기 (그리는 중 미리보기와 저장된 도형 공용) */
export function drawHighlighterPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
  opacity: number // 0 ~ 1
) {
  if (points.length === 0) return
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash([])

  if (points.length === 1) {
    ctx.beginPath()
    ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  // 각 점을 제어점으로, 이웃 점과의 중간점을 끝점으로 하는 2차 곡선 → 꺾임 없이 부드럽게
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2
    const midY = (points[i].y + points[i + 1].y) / 2
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY)
  }
  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
  ctx.restore()
}

/** 저장된 형광펜 도형 그리기. 선택되어 있으면 감싸는 사각형을 점선으로 표시 */
export function drawHighlighter(ctx: CanvasRenderingContext2D, item: CanvasItem, isSelected: boolean) {
  drawHighlighterPath(
    ctx,
    getHighlighterAbsPoints(item),
    item.style.borderColor || '#FFF200',
    item.style.borderWidth || 20,
    item.style.opacity ?? 0.45
  )
  if (isSelected) {
    ctx.save()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(item.x, item.y, item.width || 0, item.height || 0)
    ctx.restore()
  }
}

/** (x, y)가 형광펜 획 위(두께/2 + 4px 이내)인지 */
export function hitTestHighlighter(item: CanvasItem, x: number, y: number): boolean {
  const pts = getHighlighterAbsPoints(item)
  const tolerance = (item.style.borderWidth || 20) / 2 + 4
  if (pts.length === 1) {
    return Math.hypot(pts[0].x - x, pts[0].y - y) <= tolerance
  }
  for (let i = 1; i < pts.length; i++) {
    if (getDistanceToSegment(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= tolerance) {
      return true
    }
  }
  return false
}
