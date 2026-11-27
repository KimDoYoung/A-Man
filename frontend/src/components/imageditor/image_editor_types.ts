export interface CanvasItem {
  id: string
  type: 'circle-number' | 'box' | 'text' | 'arrow' | 'orthogonal-arrow' | 'bracket-arrow' | 'symbol' | 'image' | 'block-arrow-stamp' | 'callout' | 'highlighter'
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  imageSrc?: string
  // 형광펜(highlighter) 획의 점들. x, y 기준 상대좌표 (이동·자르기는 x, y만 바꾸면 따라감)
  points?: { x: number; y: number }[]
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
    midY?: number
    hasBorder?: boolean
    hasCaption?: boolean
    fontStyle?: 'normal' | 'italic'
    textDecoration?: 'none' | 'underline' | 'line-through'
    stampDirection?: string
    stampShape?: 'arrow' | 'hand' | 'cursor'
    rotation?: number
    calloutShape?: 'speech-rect' | 'speech-oval' | 'line'
    calloutTailX?: number
    calloutTailY?: number
    shape?: 'circle' | 'rect'
    orthogonalRouting?: 'hvh' | 'vhv'
  }
}

export interface ImageWork {
  id: number
  title: string
  jsonData: string
  createdAt: string
  updatedAt: string
}

export interface ActionImageEditorProps {
  isOpen: boolean
}
