// 선분과 점 사이의 거리를 계산하는 수학 헬퍼 함수
export function getDistanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
}

// 텍스트 아이템의 실제 너비와 높이를 계산하는 헬퍼 함수
export function getTextBounds(
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

// 화살표 그리기 헬퍼 함수
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  width: number,
  lineStyle: 'solid' | 'dashed',
  isSelected: boolean,
  headSizeLevel: number = 1
) {
  ctx.save()

  // 1. 선 스타일 설정
  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (lineStyle === 'dashed') {
    ctx.setLineDash([4, 4])
  } else {
    ctx.setLineDash([])
  }

  const angle = Math.atan2(toY - fromY, toX - fromX)
  const scale = headSizeLevel === 2 ? 1.5 : headSizeLevel === 3 ? 2.0 : 1.0
  const headLength = Math.max(12, width * 3) * scale
  const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2)
  const offset = Math.min(distance * 0.8, headLength * 0.8)
  const lineToX = toX - offset * Math.cos(angle)
  const lineToY = toY - offset * Math.sin(angle)

  // 2. 선택 상태일 때 외곽 파란색 하이라이트선 먼저 그리기
  if (isSelected) {
    ctx.save()
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.lineWidth = width + 6
    ctx.setLineDash([])

    // 메인 선분 그리기
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(lineToX, lineToY)
    ctx.stroke()

    // 화살촉 그리기
    const arrowAngle = Math.PI / 6
    const leftX = toX - headLength * Math.cos(angle - arrowAngle)
    const leftY = toY - headLength * Math.sin(angle - arrowAngle)
    const rightX = toX - headLength * Math.cos(angle + arrowAngle)
    const rightY = toY - headLength * Math.sin(angle + arrowAngle)

    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(leftX, leftY)
    ctx.lineTo(rightX, rightY)
    ctx.closePath()
    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.fill()
    ctx.restore()
  }

  // 3. 메인 화살표 선 그리기
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(lineToX, lineToY)
  ctx.stroke()

  // 4. 화살촉 채우기
  const arrowAngle = Math.PI / 6
  const leftX = toX - headLength * Math.cos(angle - arrowAngle)
  const leftY = toY - headLength * Math.sin(angle - arrowAngle)
  const rightX = toX - headLength * Math.cos(angle + arrowAngle)
  const rightY = toY - headLength * Math.sin(angle + arrowAngle)

  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(leftX, leftY)
  ctx.lineTo(rightX, rightY)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  // 5. 선택 상태일 때 양 끝 앵커 포인트 그려서 조작감 극대화
  if (isSelected) {
    ctx.beginPath()
    ctx.arc(fromX, fromY, 6, 0, 2 * Math.PI)
    ctx.moveTo(toX + 6, toY)
    ctx.arc(toX, toY, 6, 0, 2 * Math.PI)
    ctx.fillStyle = '#3b82f6'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}

// 직각으로 꺾이는 화살표 그리기 헬퍼 함수 (3세그먼트 H-V-H 모델)
// midX/midY 둘 다 저장, 어느 축이 더 "바깥"인지로 경로 자동 결정
// xOutside >= yOutside → ㄷ 경로: from→(midX,fromY)→(midX,toY)→to
// xOutside  < yOutside → 冖 경로: from→(fromX,midY)→(toX,midY)→to
export function drawOrthogonalArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  midX: number,
  midY: number,
  color: string,
  width: number,
  lineStyle: 'solid' | 'dashed',
  isSelected: boolean,
  headSizeLevel: number = 1
) {
  const minX = Math.min(fromX, toX), maxX = Math.max(fromX, toX)
  const minY = Math.min(fromY, toY), maxY = Math.max(fromY, toY)
  const xOutside = Math.max(0, minX - midX, midX - maxX)
  const yOutside = Math.max(0, minY - midY, midY - maxY)
  const useHorizontal = xOutside >= yOutside

  const p1x = useHorizontal ? midX : fromX
  const p1y = useHorizontal ? fromY : midY
  const p2x = useHorizontal ? midX : toX
  const p2y = useHorizontal ? toY : midY

  let angle: number
  if (useHorizontal) {
    angle = Math.abs(toX - midX) > 0.5 ? Math.atan2(0, toX - midX) : Math.atan2(toY - fromY, 0)
  } else {
    angle = Math.abs(toY - midY) > 0.5 ? Math.atan2(toY - midY, 0) : Math.atan2(0, toX - fromX)
  }

  const scale = headSizeLevel === 2 ? 1.5 : headSizeLevel === 3 ? 2.0 : 1.0
  const headLength = Math.max(12, width * 3) * scale
  const lastSegLen = useHorizontal
    ? (Math.abs(toX - midX) > 0.5 ? Math.abs(toX - midX) : Math.abs(toY - fromY))
    : (Math.abs(toY - midY) > 0.5 ? Math.abs(toY - midY) : Math.abs(toX - fromX))
  const offset = Math.min(lastSegLen * 0.8, headLength * 0.8)
  const lineToX = toX - offset * Math.cos(angle)
  const lineToY = toY - offset * Math.sin(angle)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash(lineStyle === 'dashed' ? [4, 4] : [])

  if (isSelected) {
    ctx.save()
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.lineWidth = width + 6
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(p1x, p1y)
    ctx.lineTo(p2x, p2y)
    ctx.lineTo(lineToX, lineToY)
    ctx.stroke()
    ctx.restore()
  }

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(p1x, p1y)
  ctx.lineTo(p2x, p2y)
  ctx.lineTo(lineToX, lineToY)
  ctx.stroke()

  const arrowAngle = Math.PI / 6
  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(toX - headLength * Math.cos(angle - arrowAngle), toY - headLength * Math.sin(angle - arrowAngle))
  ctx.lineTo(toX - headLength * Math.cos(angle + arrowAngle), toY - headLength * Math.sin(angle + arrowAngle))
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  if (isSelected) {
    const drawHandle = (hx: number, hy: number, fill: string) => {
      ctx.beginPath()
      ctx.arc(hx, hy, 6, 0, 2 * Math.PI)
      ctx.fillStyle = fill
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.fill()
      ctx.stroke()
    }
    drawHandle(fromX, fromY, '#3b82f6')
    drawHandle(toX, toY, '#3b82f6')
    // 핸들 위치: ㄷ=수직 arm 중앙, 冖=수평 arm 중앙
    const hx = useHorizontal ? midX : (fromX + toX) / 2
    const hy = useHorizontal ? (fromY + toY) / 2 : midY
    drawHandle(hx, hy, '#10b981')
  }

  ctx.restore()
}

// box/image 타입 공용: 선택 영역 하이라이트 및 4꼭지점 조절 핸들 그리기
export function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  item: { x: number; y: number; width?: number; height?: number }
) {
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.strokeRect(item.x - 3, item.y - 3, (item.width || 0) + 6, (item.height || 0) + 6)

  // 4꼭지점 핸들 그리기
  ctx.save()
  ctx.setLineDash([])
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1.5
  const handleSize = 6
  const points = [
    { x: item.x, y: item.y }, // TL
    { x: item.x + (item.width || 0), y: item.y }, // TR
    { x: item.x, y: item.y + (item.height || 0) }, // BL
    { x: item.x + (item.width || 0), y: item.y + (item.height || 0) } // BR
  ]
  points.forEach((pt) => {
    ctx.fillRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize)
    ctx.strokeRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize)
  })
  ctx.restore()
}

// 둥근 사각형 경로 생성 헬퍼 함수
export function createRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}
