export interface CanvasItem {
  id: string
  type: 'circle-number' | 'box' | 'text' | 'arrow' | 'orthogonal-arrow' | 'symbol'
  x: number
  y: number
  width?: number
  height?: number
  text?: string
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
