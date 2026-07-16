import { CanvasItem } from './image_editor_types'
import { SYSTEM_ITEM_DEFAULTS } from './image_items_defaults'

export const CALLOUT_DEFAULT_WIDTH = 140
export const CALLOUT_DEFAULT_HEIGHT = 70

// 꼬리 끝점 (style.calloutTailX/Y가 없으면 박스 하단-좌측 기본 오프셋 위치 사용)
// draw/hit-test/margin계산/resize 핸들 등 여러 곳에서 공유하는 단일 소스
export function getCalloutTailPoint(item: CanvasItem): { x: number; y: number } {
  const width = item.width ?? CALLOUT_DEFAULT_WIDTH
  const height = item.height ?? CALLOUT_DEFAULT_HEIGHT
  return {
    x: item.style.calloutTailX ?? item.x + width * 0.25,
    y: item.style.calloutTailY ?? item.y + height + 40
  }
}

// speech-rect 전용: 꼬리 끝점이 어느 방향에 있는지에 따라 4변 중 가장 가까운 변에
// 동적으로 꼬리를 끼워 넣어 박스+꼬리를 하나의 path로 그림 (PowerPoint/LibreOffice의
// 말풍선 도형처럼 꼬리를 박스 바깥 아무 방향으로 옮겨도 박스를 가로지르지 않음)
function traceSpeechRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radius: number, tailX: number, tailY: number
) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  // 꼬리 밑변 폭 (박스가 작으면 비례해서 얇아지되, 코너를 침범하지 않도록 상한을 둠)
  const halfWidth = Math.max(2, Math.min(10, Math.min(w, h) * 0.15, w / 2 - r - 2, h / 2 - r - 2))

  const cx = x + w / 2
  const cy = y + h / 2
  const dx = tailX - cx
  let dy = tailY - cy
  if (dx === 0 && dy === 0) dy = 1 // 중심과 완전히 겹치는 예외 케이스는 하단으로 고정

  // 박스 중심에서 꼬리 방향으로 뻗은 반직선이 상/하/좌/우 중 어느 변을 지나는지 판정
  const edge: 'top' | 'bottom' | 'left' | 'right' =
    Math.abs(dx) * h > Math.abs(dy) * w
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'bottom' : 'top')

  const attachX = Math.min(x + w - r - halfWidth, Math.max(x + r + halfWidth, tailX))
  const attachY = Math.min(y + h - r - halfWidth, Math.max(y + r + halfWidth, tailY))

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  if (edge === 'top') {
    ctx.lineTo(attachX - halfWidth, y)
    ctx.lineTo(tailX, tailY)
    ctx.lineTo(attachX + halfWidth, y)
  }
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  if (edge === 'right') {
    ctx.lineTo(x + w, attachY - halfWidth)
    ctx.lineTo(tailX, tailY)
    ctx.lineTo(x + w, attachY + halfWidth)
  }
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  if (edge === 'bottom') {
    ctx.lineTo(attachX + halfWidth, y + h)
    ctx.lineTo(tailX, tailY)
    ctx.lineTo(attachX - halfWidth, y + h)
  }
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  if (edge === 'left') {
    ctx.lineTo(x, attachY + halfWidth)
    ctx.lineTo(tailX, tailY)
    ctx.lineTo(x, attachY - halfWidth)
  }
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// 박스 내부에 여러 줄 텍스트를 좌측 정렬로 그리는 간단한 헬퍼 (줄바꿈은 \n 기준)
function drawCalloutText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, w: number, h: number,
  textColor: string, fontSize: number
) {
  if (!text) return
  ctx.save()
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillStyle = textColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  const padding = 8
  ctx.rect(x + padding, y + padding, Math.max(0, w - padding * 2), Math.max(0, h - padding * 2))
  ctx.clip()

  const lines = text.split('\n')
  const lineHeight = fontSize * 1.2
  const totalHeight = (lines.length - 1) * lineHeight
  const startY = y + h / 2 - totalHeight / 2
  const textX = x + padding

  lines.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * lineHeight)
  })
  ctx.restore()
}

/**
 * 말풍선/설명선 (callout) 렌더링 함수 — style.calloutShape에 따라 3가지 형태 지원:
 * speech-rect(사각+꼬리), speech-oval(타원+꼬리), line(사각+분리된 직선 포인터)
 */
export function drawCallout(ctx: CanvasRenderingContext2D, item: CanvasItem) {
  const x = item.x
  const y = item.y
  const w = item.width ?? CALLOUT_DEFAULT_WIDTH
  const h = item.height ?? CALLOUT_DEFAULT_HEIGHT
  const shape = item.style.calloutShape ?? SYSTEM_ITEM_DEFAULTS.calloutShape
  const bgColor = item.style.backgroundColor ?? SYSTEM_ITEM_DEFAULTS.calloutBgColor
  const borderColor = item.style.borderColor ?? SYSTEM_ITEM_DEFAULTS.calloutBorderColor
  const borderWidth = item.style.borderWidth ?? SYSTEM_ITEM_DEFAULTS.calloutBorderWidth
  const lineStyle = item.style.lineStyle ?? SYSTEM_ITEM_DEFAULTS.calloutLineStyle
  const opacity = item.style.opacity ?? SYSTEM_ITEM_DEFAULTS.calloutOpacity / 100
  const borderRadius = item.style.borderRadius ?? SYSTEM_ITEM_DEFAULTS.calloutBorderRadius
  const textColor = item.style.textColor ?? SYSTEM_ITEM_DEFAULTS.calloutTextColor
  const fontSize = item.style.fontSize ?? SYSTEM_ITEM_DEFAULTS.calloutFontSize
  const { x: tailX, y: tailY } = getCalloutTailPoint(item)

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = bgColor
  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderWidth
  ctx.setLineDash(lineStyle === 'dashed' ? [4, 4] : [])

  if (shape === 'speech-rect') {
    traceSpeechRectPath(ctx, x, y, w, h, borderRadius, tailX, tailY)
    ctx.fill()
    ctx.stroke()
  } else if (shape === 'speech-oval') {
    // 꼬리 끝점 방향의 타원 호를 생략하고 그 자리에 꼬리 꼭짓점을 끼워 하나의 path로 이어 그림
    // (박스 중심→꼬리끝 방향의 타원 파라미터 각도를 구해 그 주변 호만 비움 — 꼬리가 항상
    //  타원 경계와 정확히 맞닿도록 동적으로 따라감. speech-rect의 동적 변 선택과 동일한 원리)
    const cx = x + w / 2
    const cy = y + h / 2
    const rx = w / 2
    const ry = h / 2
    const dx = tailX - cx
    let dy = tailY - cy
    if (dx === 0 && dy === 0) dy = 1
    const thetaMid = Math.atan2(dy / ry, dx / rx)
    const halfAngle = 0.15 // 꼬리 밑변의 각폭 (라디안, 약 8.6도)

    ctx.beginPath()
    // 꼬리 접합 구간(thetaMid ± halfAngle)을 뺀 나머지 타원 호 전체를 긴 쪽으로 회전하며 그림
    ctx.ellipse(cx, cy, rx, ry, 0, thetaMid + halfAngle, thetaMid - halfAngle + 2 * Math.PI)
    ctx.lineTo(tailX, tailY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else {
    // line: 꼬리 폴리곤 없이 사각 박스만 그리고, 근접 모서리에서 tailX/Y까지 단순 직선만 stroke
    const r = Math.max(0, Math.min(borderRadius, w / 2, h / 2))
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 박스에서 가장 가까운 모서리를 골라 tail 지점까지 직선 포인터만 그림 (화살촉 없음)
    // 선 타입(실선/점선)은 박스 테두리와 동일하게 유지
    const anchorX = tailX < x + w / 2 ? x : x + w
    const anchorY = tailY < y + h / 2 ? y : y + h
    ctx.beginPath()
    ctx.moveTo(anchorX, anchorY)
    ctx.lineTo(tailX, tailY)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  drawCalloutText(ctx, item.text || '', x, y, w, h, textColor, fontSize)

  ctx.restore()
}
