export interface CanvasItem {
  id: string
  type: 'circle-number' | 'box' | 'text' | 'arrow' | 'orthogonal-arrow' | 'symbol' | 'image'
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
