import { CanvasItem } from './image_editor_types'
import { getCalloutTailPoint } from './calloutStamp'

export interface ItemGeometryDefaults {
  circleNumberFontSize: number
  textFontSize: number
}

// 캔버스 여백(margin) 계산용: 아이템 타입별 상/하/좌/우 끝단 좌표를 계산하는 공용 헬퍼
// (minBottomMargin/minRightMargin/canShrinkTop/canShrinkLeft 4곳에서 각각 축만 바꿔
// 중복 구현되던 per-type 분기를 하나로 통합)
export function getItemEdgeBounds(
  item: CanvasItem,
  defaults: ItemGeometryDefaults
): { top: number; bottom: number; left: number; right: number } {
  let top = item.y
  let bottom = item.y
  let left = item.x
  let right = item.x

  if (item.type === 'circle-number') {
    const r = (item.style.fontSize || defaults.circleNumberFontSize) * 1.05
    top = item.y - r
    bottom = item.y + r
    left = item.x - r
    right = item.x + r
  } else if (item.type === 'box' || item.type === 'image' || item.type === 'block-arrow-stamp') {
    bottom = item.y + (item.height || 0)
    right = item.x + (item.width || 0)
  } else if (item.type === 'callout') {
    const tail = getCalloutTailPoint(item)
    top = Math.min(item.y, tail.y)
    bottom = Math.max(item.y + (item.height || 0), tail.y)
    left = Math.min(item.x, tail.x)
    right = Math.max(item.x + (item.width || 0), tail.x)
  } else if (item.type === 'text') {
    bottom = item.y + (item.style.fontSize || defaults.textFontSize) * 1.2
    right = item.x + 100 // approximate text width
  } else if (item.type === 'arrow' || item.type === 'orthogonal-arrow') {
    bottom = Math.max(item.y, item.y + (item.height || 0))
    right = Math.max(item.x, item.x + (item.width || 0))
  } else if (item.type === 'symbol') {
    const radius = (item.style.fontSize || 48) / 2
    top = item.y - radius
    bottom = item.y + radius
    left = item.x - radius
    right = item.x + radius
  }

  return { top, bottom, left, right }
}

// callout 아이템의 y좌표 이동 시 꼬리 끝점(calloutTailY)도 함께 이동시키는 헬퍼
export function shiftItemY(item: CanvasItem, delta: number): CanvasItem {
  if (item.type === 'orthogonal-arrow' && item.style.midY !== undefined) {
    return { ...item, y: item.y + delta, style: { ...item.style, midY: item.style.midY + delta } }
  }
  if (item.type === 'callout') {
    const tail = getCalloutTailPoint(item)
    return { ...item, y: item.y + delta, style: { ...item.style, calloutTailY: tail.y + delta } }
  }
  return { ...item, y: item.y + delta }
}

export function shiftItemX(item: CanvasItem, delta: number): CanvasItem {
  if (item.type === 'orthogonal-arrow' && item.style.midX !== undefined) {
    return { ...item, x: item.x + delta, style: { ...item.style, midX: item.style.midX + delta } }
  }
  if (item.type === 'callout') {
    const tail = getCalloutTailPoint(item)
    return { ...item, x: item.x + delta, style: { ...item.style, calloutTailX: tail.x + delta } }
  }
  return { ...item, x: item.x + delta }
}

// 크롭 시 아이템 좌표를 크롭 원점(cX, cY) 기준으로 오프셋
export function offsetItemForCrop(item: CanvasItem, cX: number, cY: number): CanvasItem {
  if (item.type === 'orthogonal-arrow' && item.style.midX !== undefined) {
    return {
      ...item,
      x: item.x - cX,
      y: item.y - cY,
      style: {
        ...item.style,
        midX: item.style.midX - cX,
        ...(item.style.midY !== undefined ? { midY: item.style.midY - cY } : {})
      }
    }
  }
  if (item.type === 'callout') {
    const tail = getCalloutTailPoint(item)
    return {
      ...item,
      x: item.x - cX,
      y: item.y - cY,
      style: {
        ...item.style,
        calloutTailX: tail.x - cX,
        calloutTailY: tail.y - cY
      }
    }
  }
  return { ...item, x: item.x - cX, y: item.y - cY }
}

// 크롭 캔버스 범위(0,0)-(cW,cH) 내부에 들어오는 아이템인지 판정 (이미 offsetItemForCrop 적용된 좌표 기준)
export function isItemWithinCropBounds(item: CanvasItem, cW: number, cH: number): boolean {
  if (item.type === 'circle-number') {
    const r = (item.style.fontSize || 13) * 1.05
    return item.x >= -r && item.x <= cW + r && item.y >= -r && item.y <= cH + r
  } else if (item.type === 'box' || item.type === 'image' || item.type === 'block-arrow-stamp' || item.type === 'callout') {
    return item.x >= -(item.width || 0) && item.x <= cW && item.y >= -(item.height || 0) && item.y <= cH
  } else if (item.type === 'text') {
    return item.x >= -50 && item.x <= cW && item.y >= -15 && item.y <= cH
  } else if (item.type === 'arrow' || item.type === 'orthogonal-arrow') {
    const x2 = item.x + (item.width || 0)
    const y2 = item.y + (item.height || 0)
    const startIn = item.x >= 0 && item.x <= cW && item.y >= 0 && item.y <= cH
    const endIn = x2 >= 0 && x2 <= cW && y2 >= 0 && y2 <= cH
    return startIn || endIn
  } else if (item.type === 'symbol') {
    const radius = (item.style.fontSize || 48) / 2
    return item.x >= -radius && item.x <= cW + radius && item.y >= -radius && item.y <= cH + radius
  }
  return true
}
