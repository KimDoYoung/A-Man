import React, { useState, useEffect, useRef } from 'react'
import { Undo, Redo, Download, Copy, Trash2, Type, Square, CircleDot, Check, Save, MousePointer, Crop, MoveUpRight, Smile } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { formatRelativeTime } from '@/lib/utils'

// 선분과 점 사이의 거리를 계산하는 수학 헬퍼 함수
function getDistanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
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

// 화살표 그리기 헬퍼 함수
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  width: number,
  lineStyle: 'solid' | 'dashed',
  isSelected: boolean
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

  // 2. 선택 상태일 때 외곽 파란색 하이라이트선 먼저 그리기
  if (isSelected) {
    ctx.save()
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.lineWidth = width + 6
    ctx.setLineDash([])
    
    // 메인 선분 그리기
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // 화살촉 그리기
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const headLength = Math.max(12, width * 3)
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
  ctx.lineTo(toX, toY)
  ctx.stroke()

  // 4. 화살촉 채우기
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const headLength = Math.max(12, width * 3)
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
    ctx.arc(fromX, fromY, 4, 0, 2 * Math.PI)
    ctx.arc(toX, toY, 4, 0, 2 * Math.PI)
    ctx.fillStyle = '#3b82f6'
    ctx.fill()
  }

  ctx.restore()
}

import { CanvasItem, ImageWork, ActionImageEditorProps } from './image_editor_types'
import FloatingPropertyPanel from './FloatingPropertyPanel'
import WorkHistory from './WorkHistory'


const ActionImageEditor: React.FC<ActionImageEditorProps> = ({
  isOpen
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  
  // 에디터 상태
  const [activeTool, setActiveTool] = useState<'pointer' | 'circle-number' | 'box' | 'text' | 'crop' | 'arrow' | 'symbol'>('pointer')
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [bgImageSrc, setBgImageSrc] = useState<string>('')
  const [items, setItems] = useState<CanvasItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [circleCounter, setCircleCounter] = useState<number>(1)
  const [textColor, setTextColor] = useState<string>('#ffffff')
  const [boxBgColor, setBoxBgColor] = useState<string>('transparent')
  const [boxOpacity, setBoxOpacity] = useState<number>(30)
  const [boxLineStyle, setBoxLineStyle] = useState<'solid' | 'dashed'>('solid')
  const [selectedEmoji, setSelectedEmoji] = useState<string>('💡')
  const [symbolScale, setSymbolScale] = useState<number>(3)
  const [boxBorderRadius, setBoxBorderRadius] = useState<number>(0)
  
  // 드로잉/인터랙션 임시 상태
  const [isDrawing, setIsDrawing] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean; id?: string }>({ x: 0, y: 0, visible: false })
  const [textInputValue, setTextInputValue] = useState('')
  const [draggedItemOffset, setDraggedItemOffset] = useState<{ x: number; y: number } | null>(null)
  const [resizeHandle, setResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  
  // 기본 스타일 상태
  const [primaryColor, setPrimaryColor] = useState('#ef4444') // 강조 사각형 기본 Red
  const [indigoColor, setIndigoColor] = useState('#4f46e5') // 원숫자 기본 Indigo
  const [fontSize, setFontSize] = useState(16)
  const [lineWidth, setLineWidth] = useState(3)
  
  // 마지막 저장 시점 상태 (isDirty 체크용)
  const [lastSavedState, setLastSavedState] = useState<{
    title: string
    bgImageSrc: string
    items: CanvasItem[]
    hasBorder: boolean
    borderColor: string
    borderWidth: number
    borderStyle: 'basic' | 'rounded'
    hasCaption: boolean
    captionText: string
    textColor: string
    boxBgColor: string
    boxOpacity: number
    boxLineStyle: 'solid' | 'dashed'
    selectedEmoji: string
    symbolScale: number
    boxBorderRadius: number
  }>({
    title: '',
    bgImageSrc: '',
    items: [],
    hasBorder: false,
    borderColor: '#cbd5e1',
    borderWidth: 2,
    borderStyle: 'basic',
    hasCaption: false,
    captionText: '',
    textColor: '#ffffff',
    boxBgColor: 'transparent',
    boxOpacity: 30,
    boxLineStyle: 'solid',
    selectedEmoji: '💡',
    symbolScale: 3,
    boxBorderRadius: 0
  })
  
  // 헤더 3초 알림 메시지 상태
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })
  
  // 생성된 물리 정적 이미지 URL 상태
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('')
  
  // 현재 로드되어 편집 중인 임시작업의 레코드 ID
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null)

  // 테두리(박스라인) 및 캡션 설정 상태
  const [hasBorder, setHasBorder] = useState<boolean>(false)
  const [borderColor, setBorderColor] = useState<string>('#cbd5e1')
  const [borderWidth, setBorderWidth] = useState<number>(2)
  const [borderStyle, setBorderStyle] = useState<'basic' | 'rounded'>('basic')
  
  const [hasCaption, setHasCaption] = useState<boolean>(false)
  const [captionText, setCaptionText] = useState<string>('')
  const captionHeight = 42 // 고정 높이 42px
  
  // 임시 보관함 이력 상태
  const [historyList, setHistoryList] = useState<ImageWork[]>([])
  const [editorTitle, setEditorTitle] = useState('새 이미지 작업')
  const [savingWork, setSavingWork] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [insertingImage, setInsertingImage] = useState(false)



  // Undo / Redo 작업 스택
  const [undoStack, setUndoStack] = useState<CanvasItem[][]>([])
  const [redoStack, setRedoStack] = useState<CanvasItem[][]>([])

  // 텍스트 입력창이 켜질 때 명시적으로 인풋 포커스 이동
  useEffect(() => {
    if (textInput.visible) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [textInput.visible])

  // activeHistoryId 상태가 변경되면 localStorage에 자동 보관
  useEffect(() => {
    if (activeHistoryId !== null) {
      localStorage.setItem('aman_active_image_work_id', activeHistoryId.toString())
    } else {
      localStorage.removeItem('aman_active_image_work_id')
    }
  }, [activeHistoryId])

  // 에디터 모달 열릴 때 이력 목록 갱신 및 메시지 클리어
  useEffect(() => {
    if (isOpen) {
      setSaveMessage({ text: '', type: '' })
      
      const savedIdStr = localStorage.getItem('aman_active_image_work_id')
      const savedId = savedIdStr ? parseInt(savedIdStr, 10) : null
      
      fetchHistory().then((data) => {
        if (savedId && activeHistoryId !== savedId) {
          const savedWork = data.find(w => w.id === savedId)
          if (savedWork) {
            // display: none 해제 및 탭 전환 애니메이션 레이아웃 계산을 위한 약간의 지연 처리
            setTimeout(() => {
              handleLoadWork(savedWork)
            }, 100)
          }
        }
      })
    }
  }, [isOpen])

  // 변경사항 여부 계산 (isDirty)
  const isDirty = bgImage !== null && (
    editorTitle.trim() !== lastSavedState.title.trim() ||
    bgImageSrc !== lastSavedState.bgImageSrc ||
    JSON.stringify(items) !== JSON.stringify(lastSavedState.items) ||
    hasBorder !== lastSavedState.hasBorder ||
    borderColor !== lastSavedState.borderColor ||
    borderWidth !== lastSavedState.borderWidth ||
    borderStyle !== lastSavedState.borderStyle ||
    hasCaption !== lastSavedState.hasCaption ||
    captionText !== lastSavedState.captionText
  )

  // items 나 bgImageSrc, 설정이 달라지면 이미 생성한 url은 무효가 되므로 비워줍니다.
  useEffect(() => {
    setGeneratedImageUrl('')
  }, [items, bgImageSrc, editorTitle, hasBorder, borderColor, borderWidth, borderStyle, hasCaption, captionText])

  // 3초간 헤더에 메시지 표시 헬퍼
  const showSaveMessage = (text: string, type: 'success' | 'error') => {
    setSaveMessage({ text, type })
    setTimeout(() => {
      setSaveMessage((prev) => prev.text === text ? { text: '', type: '' } : prev)
    }, 3000)
  }

  // 임시 보관 목록 가져오기
  const fetchHistory = async (): Promise<ImageWork[]> => {
    setLoadingHistory(true)
    try {
      const data = await apiClient.get<ImageWork[]>('/admin/image-work')
      setHistoryList(data)
      return data
    } catch (err) {
      console.error('이미지 작업 목록 로드 실패:', err)
      return []
    } finally {
      setLoadingHistory(false)
    }
  }

  // 캔버스 변경 히스토리 푸시 (Undo용)
  const pushToUndo = (newItems: CanvasItem[]) => {
    setUndoStack((prev) => [...prev, items])
    setRedoStack([]) // 새로운 액션이 생기면 redo 스택 초기화
    setItems(newItems)
  }

  // Undo 실행
  const handleUndo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((old) => old.slice(0, -1))
    setRedoStack((old) => [...old, items])
    setItems(prev)
    setSelectedItemId(null)
  }

  // Redo 실행
  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((old) => old.slice(0, -1))
    setUndoStack((old) => [...old, items])
    setItems(next)
    setSelectedItemId(null)
  }

  // 둥근 사각형 경로 생성 헬퍼 함수
  const createRoundedRectPath = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
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

  // 캔버스 그리기 함수
  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // bgImage가 존재하는 경우, 캔버스의 실제 해상도가 이미지 크기와 일치하도록 보정
    if (bgImage) {
      const targetHeight = bgImage.height + (hasCaption ? captionHeight : 0)
      if (canvas.width !== bgImage.width || canvas.height !== targetHeight) {
        canvas.width = bgImage.width
        canvas.height = targetHeight
      }
    } else {
      // 이미지가 없는 기본 상태의 크기로 복원 (안내문 렌더링용)
      if (canvas.width !== 800 || canvas.height !== 500) {
        canvas.width = 800
        canvas.height = 500
      }
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 2. 배경 이미지 및 캡션 영역 그리기
    if (bgImage) {
      ctx.save()
      
      // 만약 둥근 모서리 테두리가 적용되어 있다면 클리핑 처리
      if (hasBorder && borderStyle === 'rounded') {
        createRoundedRectPath(ctx, 0, 0, canvas.width, canvas.height, 8)
        ctx.clip()
      }

      // 이미지 그리기
      ctx.drawImage(bgImage, 0, 0)

      // 캡션 그리기
      if (hasCaption) {
        const captionY = bgImage.height
        // 캡션 배경색 (옅은 회색)
        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(0, captionY, canvas.width, captionHeight)

        // 이미지와 캡션 사이 구분선
        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, captionY)
        ctx.lineTo(canvas.width, captionY)
        ctx.stroke()

        // 캡션 텍스트 그리기
        ctx.fillStyle = '#475569'
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(captionText || '여기에 이미지 설명 캡션을 입력하십시오.', canvas.width / 2, captionY + (captionHeight / 2))
      }

      ctx.restore()
    } else {
      // 배경 이미지가 없을 때 기본 안내문 렌더링
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Ctrl + V 키를 누르거나 이미지를 업로드하세요.', canvas.width / 2, canvas.height / 2)
      return
    }

    // 3. 아이템들 그리기 (원숫자, 사각형, 텍스트)
    items.forEach((item) => {
      const isSelected = item.id === selectedItemId
      ctx.save()

      if (item.type === 'circle-number') {
        const radius = (item.style.fontSize || 13) * 1.05
        // 테두리 및 그림자
        ctx.beginPath()
        ctx.arc(item.x, item.y, radius, 0, 2 * Math.PI)
        ctx.fillStyle = item.style.backgroundColor || indigoColor
        ctx.shadowColor = 'rgba(0,0,0,0.15)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetY = 2
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(item.x, item.y, radius, 0, 2 * Math.PI)
        ctx.lineWidth = item.style.borderWidth || 2
        ctx.strokeStyle = item.style.borderColor || '#ffffff'
        ctx.shadowColor = 'transparent' // 테두리엔 그림자 제외
        ctx.stroke()

        // 텍스트 그리기
        ctx.fillStyle = item.style.textColor || '#ffffff'
        ctx.font = `bold ${item.style.fontSize || 13}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.text || '1', item.x, item.y)

        // 선택 영역 하이라이트
        if (isSelected) {
          ctx.beginPath()
          ctx.arc(item.x, item.y, radius + 4, 0, 2 * Math.PI)
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.stroke()
        }
      } 
      else if (item.type === 'box') {
        // 사각형 강조 박스 (둥글기 borderRadius 반영)
        const radius = Math.min(item.style.borderRadius || 0, Math.min(Math.abs(item.width || 0), Math.abs(item.height || 0)) / 2)
        
        ctx.save()
        // 1순위: 배경색 칠하기 (배경색이 투명이 아닐 때만)
        if (item.style.backgroundColor && item.style.backgroundColor !== 'transparent') {
          ctx.save()
          ctx.globalAlpha = item.style.opacity !== undefined ? item.style.opacity : 0.3
          ctx.fillStyle = item.style.backgroundColor
          if (radius > 0) {
            ctx.beginPath()
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(item.x, item.y, item.width || 0, item.height || 0, radius)
            } else {
              const x = item.x, y = item.y, w = item.width || 0, h = item.height || 0
              ctx.moveTo(x + radius, y)
              ctx.arcTo(x + w, y, x + w, y + h, radius)
              ctx.arcTo(x + w, y + h, x, y + h, radius)
              ctx.arcTo(x, y + h, x, y, radius)
              ctx.arcTo(x, y, x + w, y, radius)
            }
            ctx.fill()
          } else {
            ctx.fillRect(item.x, item.y, item.width || 0, item.height || 0)
          }
          ctx.restore()
        }

        // 2순위: 테두리선 그리기
        ctx.strokeStyle = item.style.borderColor || primaryColor
        ctx.lineWidth = item.style.borderWidth || lineWidth
        if (item.style.lineStyle === 'dashed') {
          ctx.setLineDash([4, 4])
        } else {
          ctx.setLineDash([])
        }
        
        if (radius > 0) {
          ctx.beginPath()
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(item.x, item.y, item.width || 0, item.height || 0, radius)
          } else {
            const x = item.x, y = item.y, w = item.width || 0, h = item.height || 0
            ctx.moveTo(x + radius, y)
            ctx.arcTo(x + w, y, x + w, y + h, radius)
            ctx.arcTo(x + w, y + h, x, y + h, radius)
            ctx.arcTo(x, y + h, x, y, radius)
            ctx.arcTo(x, y, x + w, y, radius)
          }
          ctx.stroke()
        } else {
          ctx.strokeRect(item.x, item.y, item.width || 0, item.height || 0)
        }
        ctx.restore()

        // 선택 영역 하이라이트 및 4꼭지점 조절 핸들
        if (isSelected) {
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
      } 
      else if (item.type === 'arrow') {
        const toX = item.x + (item.width || 0)
        const toY = item.y + (item.height || 0)
        drawArrow(
          ctx,
          item.x,
          item.y,
          toX,
          toY,
          item.style.borderColor || primaryColor,
          item.style.borderWidth || lineWidth,
          item.style.lineStyle || 'solid',
          isSelected
        )
      }
      else if (item.type === 'symbol') {
        // 이모지 심볼 그리기 (중앙 정렬)
        const emojiSize = item.style.fontSize || 48
        ctx.font = `bold ${emojiSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        ctx.shadowColor = 'rgba(0,0,0,0.1)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetY = 2
        
        ctx.fillText(item.text || '💡', item.x, item.y)

        // 선택 영역 하이라이트 (중앙 원형 점선)
        if (isSelected) {
          ctx.shadowColor = 'transparent'
          ctx.beginPath()
          ctx.arc(item.x, item.y, (emojiSize / 2) + 4, 0, 2 * Math.PI)
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.stroke()
        }
      }
      else if (item.type === 'text') {
        // 텍스트 박스
        ctx.fillStyle = item.style.textColor || '#0f172a'
        ctx.font = `bold ${item.style.fontSize || fontSize}px sans-serif`
        ctx.textBaseline = 'top'
        ctx.textAlign = 'left'

        // 텍스트 감싸는 흰색 반투명 박스가 필요한 경우 추가 지원 가능
        if (item.style.backgroundColor) {
          const metrics = ctx.measureText(item.text || '')
          const bgW = metrics.width + 12
          const bgH = (item.style.fontSize || fontSize) + 10
          ctx.fillStyle = item.style.backgroundColor
          ctx.fillRect(item.x - 6, item.y - 4, bgW, bgH)
          ctx.strokeStyle = item.style.borderColor || '#cbd5e1'
          ctx.lineWidth = 1
          ctx.strokeRect(item.x - 6, item.y - 4, bgW, bgH)
        }

        ctx.fillStyle = item.style.textColor || '#0f172a'
        ctx.fillText(item.text || '', item.x, item.y)

        // 선택 영역 하이라이트
        if (isSelected) {
          const metrics = ctx.measureText(item.text || '')
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.strokeRect(item.x - 8, item.y - 6, metrics.width + 16, (item.style.fontSize || fontSize) + 12)
        }
      }

      ctx.restore()
    })

    // 4. 임시 드로잉 가이드 피드백 (사각형 그리기 도중 또는 크롭 점선)
    if (isDrawing && dragStart && dragCurrent) {
      ctx.save()
      if (activeTool === 'box') {
        ctx.strokeStyle = primaryColor
        ctx.lineWidth = lineWidth
        ctx.setLineDash([4, 4])
        const w = dragCurrent.x - dragStart.x
        const h = dragCurrent.y - dragStart.y
        const radius = Math.min(boxBorderRadius, Math.min(Math.abs(w), Math.abs(h)) / 2)
        if (radius > 0) {
          ctx.beginPath()
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(dragStart.x, dragStart.y, w, h, radius)
          } else {
            const x = dragStart.x, y = dragStart.y
            ctx.moveTo(x + radius, y)
            ctx.arcTo(x + w, y, x + w, y + h, radius)
            ctx.arcTo(x + w, y + h, x, y + h, radius)
            ctx.arcTo(x, y + h, x, y, radius)
            ctx.arcTo(x, y, x + w, y, radius)
          }
          ctx.stroke()
        } else {
          ctx.strokeRect(dragStart.x, dragStart.y, w, h)
        }
      } else if (activeTool === 'arrow') {
        drawArrow(
          ctx,
          dragStart.x,
          dragStart.y,
          dragCurrent.x,
          dragCurrent.y,
          primaryColor,
          lineWidth,
          boxLineStyle,
          false
        )
      } else if (activeTool === 'crop') {
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        // 반투명 딤 처리
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        // 선택 영역 클리어
        ctx.clearRect(dragStart.x, dragStart.y, dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y)
        // 선택 영역의 배경 이미지만 다시 그리기
        if (bgImage) {
          const sX = Math.min(dragStart.x, dragCurrent.x)
          const sY = Math.min(dragStart.y, dragCurrent.y)
          const sW = Math.abs(dragCurrent.x - dragStart.x)
          const sH = Math.abs(dragCurrent.y - dragStart.y)
          if (sW > 0 && sH > 0) {
            ctx.drawImage(bgImage, sX, sY, sW, sH, sX, sY, sW, sH)
          }
        }
        ctx.strokeRect(dragStart.x, dragStart.y, dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y)
      }
      ctx.restore()
    }

    // 5. 외곽 테두리(박스라인) 그리기 (맨 위 레이어에 씌움)
    if (bgImage && hasBorder) {
      ctx.save()
      ctx.strokeStyle = borderColor
      ctx.lineWidth = borderWidth
      
      if (borderStyle === 'rounded') {
        const radius = 8
        const offset = borderWidth / 2
        createRoundedRectPath(ctx, offset, offset, canvas.width - borderWidth, canvas.height - borderWidth, radius - offset)
        ctx.stroke()
      } else {
        const offset = borderWidth / 2
        ctx.strokeRect(offset, offset, canvas.width - borderWidth, canvas.height - borderWidth)
      }
      ctx.restore()
    }
  }

  // 데이터 및 배경 변경 시 리렌더링 (열고 닫힐 때 재그리기 보장)
  useEffect(() => {
    draw()
  }, [bgImage, items, selectedItemId, isDrawing, dragCurrent, activeTool, isOpen, hasBorder, borderColor, borderWidth, borderStyle, hasCaption, captionText])

  // 파일 업로드 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    loadImage(file)
    e.target.value = '' // 동일 파일 연속 업로드 가능하도록 브라우저 인풋값 리셋
  }

  // 클립보드 Paste 처리
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return
      const items = e.clipboardData?.items
      if (!items) return
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile()
          if (blob) {
            loadImage(blob)
            e.preventDefault()
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen])

  // Ctrl + S 임시저장 단축키 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveToHistory()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, items, bgImageSrc, editorTitle, activeHistoryId, historyList, circleCounter])

  // 도화지 및 상태 초기화
  const handleResetToEmpty = () => {
    if (window.confirm('현재 작업 중인 캔버스 내용이 완전히 소실됩니다. 정말 초기화하시겠습니까?')) {
      setItems([])
      setBgImage(null)
      setBgImageSrc('')
      setSelectedItemId(null)
      setCircleCounter(1)
      setEditorTitle('새 이미지 작업')
      setUndoStack([])
      setRedoStack([])
      setSelectedWorkIds([])
      setEditingId(null)
      setGeneratedImageUrl('')
      setActiveHistoryId(null)
      
      setHasBorder(false)
      setBorderColor('#cbd5e1')
      setBorderWidth(2)
      setBorderStyle('basic')
      setHasCaption(false)
      setCaptionText('')
      
      setLastSavedState({
        title: '새 이미지 작업',
        bgImageSrc: '',
        items: [],
        hasBorder: false,
        borderColor: '#cbd5e1',
        borderWidth: 2,
        borderStyle: 'basic',
        hasCaption: false,
        captionText: ''
      })
      showSaveMessage('캔버스가 초기 상태로 재설정되었습니다.', 'success')
    }
  }

  // 이미지 파일을 HTMLImageElement로 로드 및 비율 유지 축소 리사이징
  const loadImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // 1. 최대 한계치 상수 정의
        const MAX_CANVAS_WIDTH = 1200
        const MAX_CANVAS_HEIGHT = 900

        let targetWidth = img.width
        let targetHeight = img.height

        // 2. 가로세로 비율 유지 축소 비율 산출
        if (targetWidth > MAX_CANVAS_WIDTH || targetHeight > MAX_CANVAS_HEIGHT) {
          const widthRatio = MAX_CANVAS_WIDTH / targetWidth
          const heightRatio = MAX_CANVAS_HEIGHT / targetHeight
          const bestRatio = Math.min(widthRatio, heightRatio)

          targetWidth = Math.round(targetWidth * bestRatio)
          targetHeight = Math.round(targetHeight * bestRatio)
        }

        // 3. 캔버스 해상도 세팅
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = targetWidth
          canvas.height = targetHeight
        }

        // 4. [용량 축소 핵심] 임시/메인 캔버스를 이용해 부드럽게 리사이징된 신규 Base64 이미지 소스 생성
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = targetWidth
        tempCanvas.height = targetHeight
        const tempCtx = tempCanvas.getContext('2d')
        let finalSrc = event.target?.result as string || ''

        if (tempCtx && (img.width > MAX_CANVAS_WIDTH || img.height > MAX_CANVAS_HEIGHT)) {
          tempCtx.drawImage(img, 0, 0, targetWidth, targetHeight)
          finalSrc = tempCanvas.toDataURL('image/png')
          
          // 축소된 데이터로 신규 HTMLImageElement 객체를 재성성하여 바인딩
          const resizedImg = new Image()
          resizedImg.onload = () => {
            setBgImage(resizedImg)
            setBgImageSrc(finalSrc)
            setItems([])
            setCircleCounter(1)
            setUndoStack([])
            setRedoStack([])
            setGeneratedImageUrl('')
            setActiveHistoryId(null)
            setLastSavedState({ title: '새 이미지 작업', bgImageSrc: finalSrc, items: [] })
          }
          resizedImg.src = finalSrc
        } else {
          // 크기가 한계치 이하여서 축소가 불필요한 경우 그대로 보관
          setBgImage(img)
          setBgImageSrc(finalSrc)
          setItems([])
          setCircleCounter(1)
          setUndoStack([])
          setRedoStack([])
          setGeneratedImageUrl('')
          setActiveHistoryId(null)
          setLastSavedState({ title: '새 이미지 작업', bgImageSrc: finalSrc, items: [] })
        }
      }
      img.src = event.target?.result as string || ''
    }
    reader.readAsDataURL(file)
  }

  // 캔버스 마우스 상대 좌표 스케일링 계산 함수
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  // 마우스 다운 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bgImage) return
    const { x, y } = getCanvasCoords(e)

    if (activeTool === 'pointer') {
      // 1순위: 선택된 사각형이 존재할 때 네 꼭지점 리사이즈 핸들 클릭 여부를 우선 판정!
      if (selectedItemId) {
        const selectedItem = items.find(item => item.id === selectedItemId)
        if (selectedItem && selectedItem.type === 'box') {
          const tl = { x: selectedItem.x, y: selectedItem.y }
          const tr = { x: selectedItem.x + (selectedItem.width || 0), y: selectedItem.y }
          const bl = { x: selectedItem.x, y: selectedItem.y + (selectedItem.height || 0) }
          const br = { x: selectedItem.x + (selectedItem.width || 0), y: selectedItem.y + (selectedItem.height || 0) }
          const clickRadius = 8 // 클릭 반경 8px 허용

          if (Math.hypot(tl.x - x, tl.y - y) <= clickRadius) {
            setResizeHandle('tl')
            setIsDrawing(true)
            setDragStart({ x, y })
            return
          } else if (Math.hypot(tr.x - x, tr.y - y) <= clickRadius) {
            setResizeHandle('tr')
            setIsDrawing(true)
            setDragStart({ x, y })
            return
          } else if (Math.hypot(bl.x - x, bl.y - y) <= clickRadius) {
            setResizeHandle('bl')
            setIsDrawing(true)
            setDragStart({ x, y })
            return
          } else if (Math.hypot(br.x - x, br.y - y) <= clickRadius) {
            setResizeHandle('br')
            setIsDrawing(true)
            setDragStart({ x, y })
            return
          }
        }
      }

      // 가장 마지막에 추가된 도형부터 역순으로 클릭 타겟 판정 (상위 레이어 우선)
      let found = false
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        
        if (item.type === 'circle-number') {
          const radius = (item.style.fontSize || 13) * 1.05
          const dist = Math.hypot(item.x - x, item.y - y)
          if (dist <= radius + 2) {
            setSelectedItemId(item.id)
            setDraggedItemOffset({ x: x - item.x, y: y - item.y })
            found = true
            break
          }
        } 
        else if (item.type === 'box') {
          const x2 = item.x + (item.width || 0)
          const y2 = item.y + (item.height || 0)
          const minX = Math.min(item.x, x2)
          const maxX = Math.max(item.x, x2)
          const minY = Math.min(item.y, y2)
          const maxY = Math.max(item.y, y2)
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            setSelectedItemId(item.id)
            setDraggedItemOffset({ x: x - item.x, y: y - item.y })
            found = true
            break
          }
        } 
        else if (item.type === 'arrow') {
          const x2 = item.x + (item.width || 0)
          const y2 = item.y + (item.height || 0)
          const dist = getDistanceToSegment(x, y, item.x, item.y, x2, y2)
          if (dist <= 8) {
            setSelectedItemId(item.id)
            setDraggedItemOffset({ x: x - item.x, y: y - item.y })
            found = true
            break
          }
        }
        else if (item.type === 'symbol') {
          const radius = (item.style.fontSize || 48) / 2
          const dist = Math.hypot(item.x - x, item.y - y)
          if (dist <= radius + 4) {
            setSelectedItemId(item.id)
            setDraggedItemOffset({ x: x - item.x, y: y - item.y })
            found = true
            break
          }
        }
        else if (item.type === 'text') {
          // 텍스트 대략적인 선택 감지 바운딩 박스
          const textLength = item.text?.length || 1
          const boundsWidth = textLength * (item.style.fontSize || fontSize) * 0.65
          const boundsHeight = (item.style.fontSize || fontSize) + 6
          if (x >= item.x - 4 && x <= item.x + boundsWidth && y >= item.y - 4 && y <= item.y + boundsHeight) {
            setSelectedItemId(item.id)
            setDraggedItemOffset({ x: x - item.x, y: y - item.y })
            found = true
            break
          }
        }
      }

      if (!found) {
        setSelectedItemId(null)
      }
    } 
    else if (activeTool === 'circle-number') {
      const newItem: CanvasItem = {
        id: `item-${Date.now()}`,
        type: 'circle-number',
        x,
        y,
        text: String(circleCounter),
        style: {
          backgroundColor: indigoColor,
          borderColor: primaryColor,
          borderWidth: lineWidth,
          textColor: textColor,
          fontSize: fontSize
        }
      }
      pushToUndo([...items, newItem])
      setCircleCounter((prev) => prev + 1)
      setSelectedItemId(newItem.id)
    } 
    else if (activeTool === 'symbol') {
      const scaleMapping = [20, 32, 48, 64, 80]
      const actualSize = scaleMapping[symbolScale - 1] || 48
      const newItem: CanvasItem = {
        id: `item-${Date.now()}`,
        type: 'symbol',
        x,
        y,
        text: selectedEmoji,
        style: {
          fontSize: actualSize
        }
      }
      pushToUndo([...items, newItem])
      setSelectedItemId(newItem.id)
    }
    else if (activeTool === 'box' || activeTool === 'crop' || activeTool === 'arrow') {
      setIsDrawing(true)
      setDragStart({ x, y })
      setDragCurrent({ x, y })
    } 
    else if (activeTool === 'text') {
      // 텍스트 인풋 띄우기
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const clickY = e.clientY - rect.top
        
        setTextInputValue('')
        setTextInput({ x: clickX, y: clickY, visible: true })
        setDragStart({ x, y }) // 캔버스 실제 픽셀 좌표 저장
      }
    }
  }

  // 마우스 무브 핸들러
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bgImage) return
    const { x, y } = getCanvasCoords(e)

    if (isDrawing && dragStart) {
      setDragCurrent({ x, y })
    }

    // 포인터 모드 리사이징 처리
    if (activeTool === 'pointer' && selectedItemId && resizeHandle) {
      const updated = items.map((item) => {
        if (item.id === selectedItemId && item.type === 'box') {
          const originalX = item.x
          const originalY = item.y
          const originalW = item.width || 0
          const originalH = item.height || 0
          
          let newX = originalX
          let newY = originalY
          let newW = originalW
          let newH = originalH

          const minSize = 5 // 최소 크기 제한

          if (resizeHandle === 'br') {
            newW = Math.max(minSize, x - originalX)
            newH = Math.max(minSize, y - originalY)
          } 
          else if (resizeHandle === 'bl') {
            const originalRight = originalX + originalW
            newW = Math.max(minSize, originalRight - x)
            newX = originalRight - newW
            newH = Math.max(minSize, y - originalY)
          } 
          else if (resizeHandle === 'tr') {
            const originalBottom = originalY + originalH
            newW = Math.max(minSize, x - originalX)
            newH = Math.max(minSize, originalBottom - y)
            newY = originalBottom - newH
          } 
          else if (resizeHandle === 'tl') {
            const originalRight = originalX + originalW
            const originalBottom = originalY + originalH
            newW = Math.max(minSize, originalRight - x)
            newX = originalRight - newW
            newH = Math.max(minSize, originalBottom - y)
            newY = originalBottom - newH
          }

          return { ...item, x: newX, y: newY, width: newW, height: newH }
        }
        return item
      })
      setItems(updated)
    }

    // 포인터 모드 드래그 이동
    if (activeTool === 'pointer' && selectedItemId && draggedItemOffset) {
      const updated = items.map((item) => {
        if (item.id === selectedItemId) {
          const newX = x - draggedItemOffset.x
          const newY = y - draggedItemOffset.y
          return { ...item, x: newX, y: newY }
        }
        return item
      })
      setItems(updated)
    }
  }

  // 마우스 업 핸들러
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bgImage) return
    const { x, y } = getCanvasCoords(e)

    if (isDrawing && dragStart) {
      setIsDrawing(false)
      const w = x - dragStart.x
      const h = y - dragStart.y

      if (activeTool === 'box') {
        // 의미 있는 크기만 등록
        if (Math.abs(w) > 5 && Math.abs(h) > 5) {
          const newItem: CanvasItem = {
            id: `item-${Date.now()}`,
            type: 'box',
            x: Math.min(dragStart.x, x),
            y: Math.min(dragStart.y, y),
            width: Math.abs(w),
            height: Math.abs(h),
            style: {
              borderColor: primaryColor,
              borderWidth: lineWidth,
              lineStyle: boxLineStyle,
              backgroundColor: boxBgColor,
              opacity: boxBgColor === 'transparent' ? 1.0 : boxOpacity / 100,
              borderRadius: boxBorderRadius
            }
          }
          pushToUndo([...items, newItem])
          setSelectedItemId(newItem.id)
        }
      } 
      else if (activeTool === 'arrow') {
        // 어느정도 선 길이가 있을 때만 화살표 생성
        if (Math.hypot(w, h) > 8) {
          const newItem: CanvasItem = {
            id: `item-${Date.now()}`,
            type: 'arrow',
            x: dragStart.x,
            y: dragStart.y,
            width: w,
            height: h,
            style: {
              borderColor: primaryColor,
              borderWidth: lineWidth,
              lineStyle: boxLineStyle
            }
          }
          pushToUndo([...items, newItem])
          setSelectedItemId(newItem.id)
        }
      }
      else if (activeTool === 'crop') {
        const cX = Math.min(dragStart.x, x)
        const cY = Math.min(dragStart.y, y)
        const cW = Math.abs(w)
        const cH = Math.abs(h)

        if (cW > 10 && cH > 10) {
          cropImage(cX, cY, cW, cH)
        }
      }
      // 리사이즈 드래그 끝마침 처리
      if (resizeHandle) {
        setResizeHandle(null)
        pushToUndo([...items])
      }

      setDragStart(null)
      setDragCurrent(null)
    }

    setDraggedItemOffset(null)
  }

  // 이미지 크롭 처리
  const cropImage = (cX: number, cY: number, cW: number, cH: number) => {
    const canvas = canvasRef.current
    if (!canvas || !bgImage) return

    // 새 가상 캔버스로 크롭 영역을 따냄
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cW
    tempCanvas.height = cH
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    tempCtx.drawImage(bgImage, cX, cY, cW, cH, 0, 0, cW, cH)

    const croppedImg = new Image()
    croppedImg.onload = () => {
      canvas.width = cW
      canvas.height = cH
      
      // 크롭 영역 바깥의 아이템 필터링 및 오프셋 조정
      const updatedItems = items
        .map((item) => {
          if (item.type === 'circle-number') {
            return { ...item, x: item.x - cX, y: item.y - cY }
          } else if (item.type === 'box') {
            return { ...item, x: item.x - cX, y: item.y - cY }
          } else if (item.type === 'text') {
            return { ...item, x: item.x - cX, y: item.y - cY }
          }
          return item
        })
        .filter((item) => {
          // 크롭 캔버스 범위 내부에 들어오는 것만 유지
          if (item.type === 'circle-number') {
            const r = (item.style.fontSize || 13) * 1.05
            return item.x >= -r && item.x <= cW + r && item.y >= -r && item.y <= cH + r
          } else if (item.type === 'box') {
            return item.x >= -(item.width || 0) && item.x <= cW && item.y >= -(item.height || 0) && item.y <= cH
          } else if (item.type === 'text') {
            return item.x >= -50 && item.x <= cW && item.y >= -15 && item.y <= cH
          }
          return true
        })

      setBgImage(croppedImg)
      setBgImageSrc(tempCanvas.toDataURL('image/png'))
      pushToUndo(updatedItems)
      setSelectedItemId(null)
    }
    croppedImg.src = tempCanvas.toDataURL('image/png')
    setActiveTool('pointer')
  }

  // 텍스트 완료 처리
  const handleTextSubmit = () => {
    if (!textInputValue.trim() || !dragStart) {
      setTextInput({ x: 0, y: 0, visible: false })
      return
    }

    const newItem: CanvasItem = {
      id: `item-${Date.now()}`,
      type: 'text',
      x: dragStart.x,
      y: dragStart.y,
      text: textInputValue,
      style: {
        textColor: primaryColor,
        fontSize: fontSize
      }
    }
    pushToUndo([...items, newItem])
    setSelectedItemId(newItem.id)
    setTextInput({ x: 0, y: 0, visible: false })
    setTextInputValue('')
    setDragStart(null)
  }

  // 키보드로 지우기 감지 및 ESC/복제(Ctrl+D) 핸들링
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      // 인풋을 작성 중일 땐 차단
      if (textInput.visible) return

      if (e.key === 'Escape') {
        setSelectedItemId(null)
        setActiveTool('pointer')
        return
      }

      // Ctrl + D / Cmd + D (Duplicate 복제)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedItemId) {
          e.preventDefault() // 브라우저 북마크 추가 동작 방지
          const targetItem = items.find(item => item.id === selectedItemId)
          if (targetItem) {
            const duplicatedItem: CanvasItem = {
              ...targetItem,
              id: `item-${Date.now()}`,
              x: targetItem.x + 20,
              y: targetItem.y + 20,
              style: {
                ...targetItem.style
              }
            }
            const newItems = [...items, duplicatedItem]
            pushToUndo(newItems)
            setItems(newItems)
            setSelectedItemId(duplicatedItem.id)
          }
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId) {
          const filtered = items.filter((x) => x.id !== selectedItemId)
          pushToUndo(filtered)
          setSelectedItemId(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedItemId, items, textInput])

  // 현재 이미지 복사(Copy)
  const handleCopyClipboard = () => {
    const canvas = canvasRef.current
    if (!canvas || !bgImage) {
      alert('복사할 이미지가 없습니다.')
      return
    }

    canvas.toBlob((blob) => {
      if (blob) {
        try {
          const item = new ClipboardItem({ 'image/png': blob })
          navigator.clipboard.write([item]).then(() => {
            alert('최종 편집 이미지가 클립보드에 복사되었습니다. (Ctrl+V 붙여넣기 가능)')
          })
        } catch (err) {
          console.error('Clipboard API 실패, 복사 수동 처리 유도:', err)
          alert('브라우저 보안으로 직접 복사를 실패했습니다. 다운로드 버튼을 이용해 주세요.')
        }
      }
    }, 'image/png')
  }

  // 로컬 다운로드
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas || !bgImage) return

    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `${editorTitle.replace(/\s+/g, '_')}_edited.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // [중요] 백엔드 임시저장
  const handleSaveToHistory = async () => {
    if (!bgImage) {
      alert('저장할 대상 이미지가 로드되지 않았습니다.')
      return
    }

    setSavingWork(true)
    try {
      // 캔버스 최종 그래픽을 Base64 포맷으로 복제
      const canvas = canvasRef.current
      const editedBase64 = canvas?.toDataURL('image/png') || ''

      // 임시저장(Ctrl+S) 시에는 버전 이력 누적을 위해 언제나 새로운 레코드로 추가 저장 수행
      const prefix = editorTitle.trim() || '임시작업'
      const cleanPrefix = prefix.replace(/_\d+$/, '') // "작업_3" 형태일 때 중복 방지
      const count = historyList.filter(h => h.title === cleanPrefix || h.title.startsWith(cleanPrefix + '_')).length
      const finalTitle = `${cleanPrefix}_${count + 1}`

      const dataToSave = {
        title: finalTitle,
        originalImageUrl: bgImageSrc, // 원본 Base64 또는 URL
        editedImageUrl: editedBase64,  // 최종 편집본 Base64
        items: items,
        circleCounter: circleCounter,
        physicalUrl: generatedImageUrl, // 물리 url이 이미 생성된 상태면 함께 저장
        hasBorder: hasBorder,
        borderColor: borderColor,
        borderWidth: borderWidth,
        borderStyle: borderStyle,
        hasCaption: hasCaption,
        captionText: captionText,
        textColor: textColor,
        boxBgColor: boxBgColor,
        boxOpacity: boxOpacity,
        boxLineStyle: boxLineStyle,
        selectedEmoji: selectedEmoji,
        symbolScale: symbolScale,
        boxBorderRadius: boxBorderRadius
      }

      // id 값을 전달하지 않아 언제나 새로운 이미지 작업 레코드로 DB 저장되게 처리
      const res = await apiClient.post<{ id: number }>('/admin/image-work', {
        title: finalTitle,
        jsonData: JSON.stringify(dataToSave)
      })

      if (res && res.id) {
        setActiveHistoryId(res.id)
      }

      // 저장 완료 후 기준 상태 동기화
      setLastSavedState({
        title: finalTitle,
        bgImageSrc: bgImageSrc,
        items: items,
        hasBorder: hasBorder,
        borderColor: borderColor,
        borderWidth: borderWidth,
        borderStyle: borderStyle,
        hasCaption: hasCaption,
        captionText: captionText,
        textColor: textColor,
        boxBgColor: boxBgColor,
        boxOpacity: boxOpacity,
        boxLineStyle: boxLineStyle,
        selectedEmoji: selectedEmoji,
        symbolScale: symbolScale,
        boxBorderRadius: boxBorderRadius
      })
      setEditorTitle(finalTitle)

      showSaveMessage(`작업이 '${finalTitle}' 명칭으로 임시 보관함에 저장되었습니다.`, 'success')
      fetchHistory()
    } catch (err) {
      console.error('작업 임시저장 에러:', err)
      showSaveMessage('작업 임시 저장 도중 오류가 발생했습니다.', 'error')
    } finally {
      setSavingWork(false)
    }
  }

  // 최종 이미지 서버 물리 저장 및 정적 URL 획득
  const handleGenerateUrl = () => {
    const canvas = canvasRef.current
    if (!canvas || !bgImage) {
      alert('저장할 이미지가 없습니다.')
      return
    }

    setInsertingImage(true)
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setInsertingImage(false)
        return
      }

      try {
        const formData = new FormData()
        const cleanTitle = editorTitle.replace(/[^a-zA-Z0-9가-힣]/g, '_')
        const file = new File([blob], `${cleanTitle || 'edited'}_${Date.now()}.png`, { type: 'image/png' })
        formData.append('file', file)

        const res = await apiClient.post<{ url: string }>('/content/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        if (res && res.url) {
          setGeneratedImageUrl(res.url)
          
          // 1번: 클립보드에 마크다운 복사까지 즉시 수행
          const markdownFormat = `![image](${res.url})\n`
          await navigator.clipboard.writeText(markdownFormat)
          
          // 2번: 물리 url을 해당 이미지 작업 레코드에 영구적으로 귀속 저장 (덮어쓰기 업데이트)
          if (activeHistoryId) {
            const dataToSave = {
              title: editorTitle,
              originalImageUrl: bgImageSrc,
              editedImageUrl: canvas.toDataURL('image/png') || '',
              items: items,
              circleCounter: circleCounter,
              physicalUrl: res.url,
              hasBorder: hasBorder,
              borderColor: borderColor,
              borderWidth: borderWidth,
              borderStyle: borderStyle,
              hasCaption: hasCaption,
              captionText: captionText,
              textColor: textColor,
              boxBgColor: boxBgColor,
              boxOpacity: boxOpacity,
              boxLineStyle: boxLineStyle,
              selectedEmoji: selectedEmoji,
              symbolScale: symbolScale,
              boxBorderRadius: boxBorderRadius
            }
            
            await apiClient.post('/admin/image-work', {
              id: activeHistoryId,
              title: editorTitle,
              jsonData: JSON.stringify(dataToSave)
            })
            
            // 기준 상태 동기화
            setLastSavedState({
              title: editorTitle,
              bgImageSrc: bgImageSrc,
              items: items,
              hasBorder: hasBorder,
              borderColor: borderColor,
              borderWidth: borderWidth,
              borderStyle: borderStyle,
              hasCaption: hasCaption,
              captionText: captionText,
              textColor: textColor,
              boxBgColor: boxBgColor,
              boxOpacity: boxOpacity,
              boxLineStyle: boxLineStyle,
              selectedEmoji: selectedEmoji,
              symbolScale: symbolScale,
              boxBorderRadius: boxBorderRadius
            })
            
            fetchHistory()
          }

          showSaveMessage('물리 이미지 저장 성공 및 마크다운이 클립보드에 자동 복사되었습니다!', 'success')
        } else {
          showSaveMessage('서버로부터 업로드 URL을 받지 못했습니다.', 'error')
        }
      } catch (err) {
        console.error('이미지 업로드 실패:', err)
        showSaveMessage('이미지 업로드에 실패했습니다.', 'error')
      } finally {
        setInsertingImage(false)
      }
    }, 'image/png')
  }

  // 제목 인라인 수정 완료 처리
  const handleUpdateTitle = async (work: ImageWork, newTitle: string) => {
    if (!newTitle.trim()) {
      alert('제목은 비워둘 수 없습니다.')
      return
    }
    try {
      let updatedJsonData = work.jsonData
      try {
        const parsed = JSON.parse(work.jsonData)
        parsed.title = newTitle.trim()
        updatedJsonData = JSON.stringify(parsed)
      } catch (e) {
        console.warn('jsonData 파싱 실패로 텍스트 치환 시도')
      }

      await apiClient.post('/admin/image-work', {
        id: work.id,
        title: newTitle.trim(),
        jsonData: updatedJsonData
      })
      
      fetchHistory()
    } catch (err) {
      console.error('제목 수정 오류:', err)
      alert('제목을 수정하지 못했습니다.')
    }
  }

  // 선택된 항목 다중 삭제 (SQLite 락 충돌 방지를 위해 직렬 순차 처리)
  const handleDeleteSelected = async (ids: number[]) => {
    try {
      for (const id of ids) {
        await apiClient.delete(`/admin/image-work/${id}`)
      }
      fetchHistory()
    } catch (err) {
      console.error('선택 항목 삭제 중 에러:', err)
      alert('일부 항목 삭제를 실패했습니다.')
      fetchHistory()
    }
  }

  // 임시 보관 작업 복원하기
  function handleLoadWork(work: ImageWork) {
    try {
      const data = JSON.parse(work.jsonData)
      
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = img.width
          canvas.height = img.height
        }
        
        // 새로운 설정 값들 로드 및 적용
        const loadedHasBorder = data.hasBorder ?? false
        const loadedBorderColor = data.borderColor ?? '#cbd5e1'
        const loadedBorderWidth = data.borderWidth ?? 2
        const loadedBorderStyle = data.borderStyle ?? 'basic'
        const loadedHasCaption = data.hasCaption ?? false
        const loadedCaptionText = data.captionText ?? ''
        const loadedTextColor = data.textColor ?? '#ffffff'
        const loadedBoxBgColor = data.boxBgColor ?? 'transparent'
        const loadedBoxOpacity = data.boxOpacity ?? 30
        const loadedBoxLineStyle = data.boxLineStyle ?? 'solid'
        const loadedSelectedEmoji = data.selectedEmoji ?? '💡'
        const loadedSymbolScale = data.symbolScale ?? 3
        const loadedBoxBorderRadius = data.boxBorderRadius ?? 0
        
        setHasBorder(loadedHasBorder)
        setBorderColor(loadedBorderColor)
        setBorderWidth(loadedBorderWidth)
        setBorderStyle(loadedBorderStyle)
        setHasCaption(loadedHasCaption)
        setCaptionText(loadedCaptionText)
        setTextColor(loadedTextColor)
        setBoxBgColor(loadedBoxBgColor)
        setBoxOpacity(loadedBoxOpacity)
        setBoxLineStyle(loadedBoxLineStyle)
        setSelectedEmoji(loadedSelectedEmoji)
        setSymbolScale(loadedSymbolScale)
        setBoxBorderRadius(loadedBoxBorderRadius)

        setBgImage(img)
        setBgImageSrc(data.originalImageUrl || '')
        setItems(data.items || [])
        setCircleCounter(data.circleCounter || 1)
        setEditorTitle(work.title)
        setUndoStack([])
        setRedoStack([])
        setSelectedItemId(null)
        
        // 2번: 물리 url이 이미 존재한다면 바로 보여줍니다.
        if (data.physicalUrl) {
          setGeneratedImageUrl(data.physicalUrl)
        } else {
          setGeneratedImageUrl('')
        }

        // 현재 작업 중인 이력 ID 세팅
        setActiveHistoryId(work.id)

        setLastSavedState({
          title: work.title,
          bgImageSrc: data.originalImageUrl || '',
          items: data.items || [],
          hasBorder: loadedHasBorder,
          borderColor: loadedBorderColor,
          borderWidth: loadedBorderWidth,
          borderStyle: loadedBorderStyle,
          hasCaption: loadedHasCaption,
          captionText: loadedCaptionText,
          textColor: loadedTextColor,
          boxBgColor: loadedBoxBgColor,
          boxOpacity: loadedBoxOpacity,
          boxLineStyle: loadedBoxLineStyle,
          selectedEmoji: loadedSelectedEmoji,
          symbolScale: loadedSymbolScale,
          boxBorderRadius: loadedBoxBorderRadius
        })
      }
      img.src = data.originalImageUrl
    } catch (e) {
      console.error('Failed to parse load data:', e)
      showSaveMessage('이미지 작업 데이터를 복원하는 데 실패했습니다.', 'error')
    }
  }

  // 이력 삭제
  const handleDeleteHistory = async (id: number) => {
    try {
      await apiClient.delete(`/admin/image-work/${id}`)
      fetchHistory()
    } catch (err) {
      console.error('이력 삭제 오류:', err)
    }
  }



  if (!isOpen) return null

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 transition-all animate-in fade-in duration-200">
      <div className="w-full h-full flex flex-col overflow-hidden">
        
        {/* 헤더 영역 */}
        <div className="h-14 border-b border-gray-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-slate-950">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-gray-800 dark:text-slate-100 flex items-center space-x-1.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>도움말 이미지 편집기</span>
            </span>
            <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold shrink-0 ml-3">임시보관 접두어:</label>
            <input
              type="text"
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded font-semibold text-gray-800 dark:text-slate-100 w-48 focus:outline-hidden focus:border-indigo-500"
              placeholder="작업 제목 입력"
              title="이 작업의 임시보관용 제목"
            />
            {saveMessage.text && (
              <span className={`text-xs px-3 py-1 rounded-md font-bold animate-in fade-in slide-in-from-top-1 duration-200 ${
                saveMessage.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' 
                  : 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/50'
              }`}>
                {saveMessage.text}
              </span>
            )}
          </div>

        </div>

        {/* 바디 영역 */}
        <div className="flex-1 flex overflow-hidden items-stretch">
          
          {/* 1. 좌측 에디터 툴바 */}
          <aside className="w-14 bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col items-center py-4 space-y-2 shrink-0">
            {[
              { id: 'pointer', label: '선택 / 이동 (Del로 삭제)', icon: <MousePointer className="w-4 h-4" /> },
              { id: 'circle-number', label: '원숫자 마크 스탬프', icon: <CircleDot className="w-4 h-4 text-indigo-500" /> },
              { id: 'box', label: '강조 사각형 박스', icon: <Square className="w-4 h-4 text-red-500" /> },
              { id: 'arrow', label: '가리키는 화살표선', icon: <MoveUpRight className="w-4 h-4 text-emerald-500" /> },
              { id: 'symbol', label: '아이콘 이모지 심볼 스탬프', icon: <Smile className="w-4 h-4 text-pink-500" /> },
              { id: 'text', label: '글씨 텍스트 캡션', icon: <Type className="w-4 h-4" /> },
              { id: 'crop', label: '러버밴드 점선 자르기', icon: <Crop className="w-4 h-4" /> }
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id as any)
                  setSelectedItemId(null)
                }}
                className={`p-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
                  activeTool === tool.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-200 dark:ring-indigo-900/50 scale-105'
                    : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}

            <span className="w-6 h-px bg-gray-200 dark:bg-slate-800 my-2"></span>

            {/* Undo / Redo */}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="실행 취소 (Undo)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="재실행 (Redo)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </aside>

          {/* 2. 중앙 이미지 캔버스 편집 영역 */}
          <main className="flex-1 bg-gray-100 dark:bg-slate-950 p-6 flex flex-col items-center justify-center overflow-auto relative">
            
            {/* 파일 로드 컨트롤 (업로드 유도) */}
            {!bgImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-full text-indigo-600 dark:text-indigo-400 mb-4 animate-bounce">
                  <Square className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-2">로컬 이미지 업로드 또는 클립보드 붙여넣기</h4>
                <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm mb-5 leading-relaxed">
                  스크린샷 캡쳐 후 이 화면 위에서 <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[10px]">Ctrl + V</kbd> 키를 누르면 클립보드 원본 이미지가 즉시 편집창으로 가져와집니다.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  이미지 파일 선택
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* 실제 캔버스 영역 */}
            <div className="relative shadow-xl max-w-full max-h-full border border-gray-300 dark:border-slate-800 rounded bg-white overflow-auto custom-scroll">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`block ${activeTool === 'pointer' ? 'cursor-default' : 'cursor-crosshair'}`}
                width={bgImage ? bgImage.width : 800}
                height={bgImage ? bgImage.height + (hasCaption ? captionHeight : 0) : 500}
              />

              {/* 텍스트 실시간 캔버스 오버레이 인풋 창 */}
              {textInput.visible && (
                <div
                  className="absolute z-40 bg-white dark:bg-slate-900 border border-indigo-500 shadow-xl rounded p-2 flex flex-col space-y-1.5"
                  style={{ top: textInput.y, left: textInput.x }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    ref={textInputRef}
                    autoFocus
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    placeholder="설명 텍스트 기입..."
                    className="w-48 h-16 p-1 text-xs focus:outline-hidden border border-gray-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-sans"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleTextSubmit()
                      }
                    }}
                  />
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-medium">Enter 로 삽입</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={handleTextSubmit}
                        className="px-1.5 py-0.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded cursor-pointer font-bold"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setTextInput({ x: 0, y: 0, visible: false })}
                        className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 rounded cursor-pointer text-gray-700 dark:text-slate-300"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 플로팅 속성 조절기 판넬 (드래그 가능 및 탭 구조) */}
            {bgImage && (
              <FloatingPropertyPanel
                primaryColor={primaryColor}
                setPrimaryColor={setPrimaryColor}
                indigoColor={indigoColor}
                setIndigoColor={setIndigoColor}
                lineWidth={lineWidth}
                setLineWidth={setLineWidth}
                fontSize={fontSize}
                setFontSize={setFontSize}
                hasBorder={hasBorder}
                setHasBorder={setHasBorder}
                borderColor={borderColor}
                setBorderColor={setBorderColor}
                borderWidth={borderWidth}
                setBorderWidth={setBorderWidth}
                borderStyle={borderStyle}
                setBorderStyle={setBorderStyle}
                hasCaption={hasCaption}
                setHasCaption={setHasCaption}
                captionText={captionText}
                setCaptionText={setCaptionText}
                selectedItemId={selectedItemId}
                setSelectedItemId={setSelectedItemId}
                circleCounter={circleCounter}
                setCircleCounter={setCircleCounter}
                textColor={textColor}
                setTextColor={setTextColor}
                boxBgColor={boxBgColor}
                setBoxBgColor={setBoxBgColor}
                boxOpacity={boxOpacity}
                setBoxOpacity={setBoxOpacity}
                boxLineStyle={boxLineStyle}
                setBoxLineStyle={setBoxLineStyle}
                selectedEmoji={selectedEmoji}
                setSelectedEmoji={setSelectedEmoji}
                symbolScale={symbolScale}
                setSymbolScale={setSymbolScale}
                boxBorderRadius={boxBorderRadius}
                setBoxBorderRadius={setBoxBorderRadius}
                activeTool={activeTool}
                items={items}
                pushToUndo={pushToUndo}
              />
            )}
          </main>

          {/* 3. 우측 임시 보관 히스토리 사이드바 */}
          <WorkHistory
            historyList={historyList}
            loadingHistory={loadingHistory}
            onLoadWork={handleLoadWork}
            onUpdateTitle={handleUpdateTitle}
            onDeleteHistory={handleDeleteHistory}
            onDeleteSelected={handleDeleteSelected}
          />

        </div>

        {/* 액션바 (푸터) 영역 */}
        <div className="h-16 border-t border-gray-200 dark:border-slate-800 px-6 flex items-center justify-between bg-gray-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer shadow-xs transition-colors"
            >
              새 이미지 업로드
            </button>
            {bgImage && (
              <>
                <button
                  onClick={handleResetToEmpty}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 rounded-md text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  title="모든 도화지와 작업을 완전히 비우고 초기 화면으로 초기화"
                >
                  초기화
                </button>
                <button
                  onClick={handleSaveToHistory}
                  disabled={savingWork || !isDirty}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="변경사항이 있을 때만 임시저장 활성화(ctrl+s)"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingWork ? '저장 중...' : '임시 저장'}</span>
                </button>
                
                <button
                  onClick={handleGenerateUrl}
                  disabled={insertingImage || isDirty || !bgImage || generatedImageUrl !== ''}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 text-white border border-indigo-700 disabled:border-transparent rounded-md text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all disabled:cursor-not-allowed"
                  title={generatedImageUrl ? "이미 완성본 URL이 존재합니다." : "임시저장을 완료하여 변경사항이 없을 때 활성화"}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{insertingImage ? '업로드 중...' : '저장 및 URL 획득'}</span>
                </button>
              </>
            )}

            {/* 생성된 URL 표시창 영역 */}
            {generatedImageUrl && (
              <div className="flex items-center space-x-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 px-2 py-1 rounded ml-3 shrink-0 animate-in fade-in duration-200">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold shrink-0">URL:</span>
                <input
                  type="text"
                  readOnly
                  value={generatedImageUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="text-[11px] font-mono bg-transparent border-0 text-indigo-650 dark:text-indigo-400 w-[360px] focus:outline-hidden"
                  title="클릭하여 전체 선택"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedImageUrl)
                    showSaveMessage('이미지 주소가 클립보드에 복사되었습니다.', 'success')
                  }}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 rounded text-[10px] text-gray-600 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                  title="순수 이미지 URL 주소 복사"
                >
                  주소 복사
                </button>
                <button
                  onClick={() => {
                    const markdownFormat = `![image](${generatedImageUrl})\n`
                    navigator.clipboard.writeText(markdownFormat)
                    showSaveMessage('마크다운 이미지 태그가 클립보드에 복사되었습니다.', 'success')
                  }}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                  title="마크다운 이미지 태그(![image](url)) 포맷으로 복사"
                >
                  마크다운 복사
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {bgImage && (
              <>
                <button
                  onClick={handleDownload}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </button>
                <button
                  onClick={handleCopyClipboard}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                  title="클립보드 복사"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>클립보드 복사</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default ActionImageEditor
