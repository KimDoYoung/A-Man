import React, { useState, useEffect, useRef } from 'react'
import { Undo, Redo, Download, Copy, Trash2, Type, Square, CircleDot, Check, Save, MousePointer, Crop, Edit2 } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { formatRelativeTime } from '@/lib/utils'

import { CanvasItem, ImageWork, ActionImageEditorProps } from './image_editor_types'


const ActionImageEditor: React.FC<ActionImageEditorProps> = ({
  isOpen
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 에디터 상태
  const [activeTool, setActiveTool] = useState<'pointer' | 'circle-number' | 'box' | 'text' | 'crop'>('pointer')
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [bgImageSrc, setBgImageSrc] = useState<string>('')
  const [items, setItems] = useState<CanvasItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [circleCounter, setCircleCounter] = useState<number>(1)
  
  // 드로잉/인터랙션 임시 상태
  const [isDrawing, setIsDrawing] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean; id?: string }>({ x: 0, y: 0, visible: false })
  const [textInputValue, setTextInputValue] = useState('')
  const [draggedItemOffset, setDraggedItemOffset] = useState<{ x: number; y: number } | null>(null)
  
  // 기본 스타일 상태
  const [primaryColor, setPrimaryColor] = useState('#ef4444') // 강조 사각형 기본 Red
  const [indigoColor, setIndigoColor] = useState('#4f46e5') // 원숫자 기본 Indigo
  const [fontSize, setFontSize] = useState(16)
  const [lineWidth, setLineWidth] = useState(3)
  
  // 마지막 저장 시점 상태 (isDirty 체크용)
  const [lastSavedState, setLastSavedState] = useState<{ title: string; bgImageSrc: string; items: CanvasItem[] }>({
    title: '',
    bgImageSrc: '',
    items: []
  })
  
  // 헤더 3초 알림 메시지 상태
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })
  
  // 생성된 물리 정적 이미지 URL 상태
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('')
  
  // 현재 로드되어 편집 중인 임시작업의 레코드 ID
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null)
  
  // 임시 보관함 이력 상태
  const [historyList, setHistoryList] = useState<ImageWork[]>([])
  const [editorTitle, setEditorTitle] = useState('새 이미지 작업')
  const [savingWork, setSavingWork] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [insertingImage, setInsertingImage] = useState(false)

  // 다중 선택 삭제 상태
  const [selectedWorkIds, setSelectedWorkIds] = useState<number[]>([])
  // 제목 실시간 편집 상태
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')

  // Undo / Redo 작업 스택
  const [undoStack, setUndoStack] = useState<CanvasItem[][]>([])
  const [redoStack, setRedoStack] = useState<CanvasItem[][]>([])

  // 에디터 모달 열릴 때 이력 목록 갱신 및 메시지 클리어
  useEffect(() => {
    if (isOpen) {
      fetchHistory()
      setSaveMessage({ text: '', type: '' })
    }
  }, [isOpen])

  // 변경사항 여부 계산 (isDirty)
  const isDirty = bgImage !== null && (
    editorTitle.trim() !== lastSavedState.title.trim() ||
    bgImageSrc !== lastSavedState.bgImageSrc ||
    JSON.stringify(items) !== JSON.stringify(lastSavedState.items)
  )

  // items 나 bgImageSrc가 달라지면 이미 생성한 url은 무효가 되므로 비워줍니다.
  useEffect(() => {
    setGeneratedImageUrl('')
  }, [items, bgImageSrc, editorTitle])

  // 3초간 헤더에 메시지 표시 헬퍼
  const showSaveMessage = (text: string, type: 'success' | 'error') => {
    setSaveMessage({ text, type })
    setTimeout(() => {
      setSaveMessage((prev) => prev.text === text ? { text: '', type: '' } : prev)
    }, 3000)
  }

  // 임시 보관 목록 가져오기
  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const data = await apiClient.get<ImageWork[]>('/admin/image-work')
      setHistoryList(data)
    } catch (err) {
      console.error('이미지 작업 목록 로드 실패:', err)
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

  // 캔버스 그리기 함수
  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 2. 배경 이미지 그리기
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0)
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
        const radius = 14
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
        // 사각형 강조 박스
        ctx.strokeStyle = item.style.borderColor || primaryColor
        ctx.lineWidth = item.style.borderWidth || lineWidth
        ctx.strokeRect(item.x, item.y, item.width || 0, item.height || 0)

        // 선택 영역 하이라이트
        if (isSelected) {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.strokeRect(item.x - 3, item.y - 3, (item.width || 0) + 6, (item.height || 0) + 6)
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
        ctx.strokeRect(dragStart.x, dragStart.y, dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y)
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
  }

  // 데이터 및 배경 변경 시 리렌더링 (열고 닫힐 때 재그리기 보장)
  useEffect(() => {
    draw()
  }, [bgImage, items, selectedItemId, isDrawing, dragCurrent, activeTool, isOpen])

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
      setLastSavedState({ title: '새 이미지 작업', bgImageSrc: '', items: [] })
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
      // 가장 마지막에 추가된 도형부터 역순으로 클릭 타겟 판정 (상위 레이어 우선)
      let found = false
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        
        if (item.type === 'circle-number') {
          const dist = Math.hypot(item.x - x, item.y - y)
          if (dist <= 16) {
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
          borderColor: '#ffffff',
          borderWidth: 2,
          textColor: '#ffffff',
          fontSize: 13
        }
      }
      pushToUndo([...items, newItem])
      setCircleCounter((prev) => prev + 1)
      setSelectedItemId(newItem.id)
    } 
    else if (activeTool === 'box' || activeTool === 'crop') {
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
              borderWidth: lineWidth
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
            return item.x >= -14 && item.x <= cW + 14 && item.y >= -14 && item.y <= cH + 14
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
        textColor: '#0f172a',
        fontSize: fontSize
      }
    }
    pushToUndo([...items, newItem])
    setSelectedItemId(newItem.id)
    setTextInput({ x: 0, y: 0, visible: false })
    setTextInputValue('')
    setDragStart(null)
  }

  // 키보드로 지우기 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      // 인풋을 작성 중일 땐 차단
      if (textInput.visible) return

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
        physicalUrl: generatedImageUrl // 물리 url이 이미 생성된 상태면 함께 저장
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
        items: items
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
              physicalUrl: res.url
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
              items: items
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
      
      setEditingId(null)
      fetchHistory()
    } catch (err) {
      console.error('제목 수정 오류:', err)
      alert('제목을 수정하지 못했습니다.')
    }
  }

  // 선택된 항목 다중 삭제 (SQLite 락 충돌 방지를 위해 직렬 순차 처리)
  const handleDeleteSelected = async () => {
    if (selectedWorkIds.length === 0) return
    if (!confirm(`선택된 ${selectedWorkIds.length}개의 항목을 정말 모두 삭제하시겠습니까?`)) return
    
    try {
      for (const id of selectedWorkIds) {
        await apiClient.delete(`/admin/image-work/${id}`)
      }
      setSelectedWorkIds([])
      fetchHistory()
    } catch (err) {
      console.error('선택 항목 삭제 중 에러:', err)
      alert('일부 항목 삭제를 실패했습니다.')
      fetchHistory()
    }
  }

  // 임시 보관 작업 복원하기
  const handleLoadWork = (work: ImageWork) => {
    try {
      const data = JSON.parse(work.jsonData)
      
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = img.width
          canvas.height = img.height
        }
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

        setLastSavedState({ title: work.title, bgImageSrc: data.originalImageUrl || '', items: data.items || [] })
      }
      img.src = data.originalImageUrl
    } catch (e) {
      console.error('Failed to parse load data:', e)
      showSaveMessage('이미지 작업 데이터를 복원하는 데 실패했습니다.', 'error')
    }
  }

  // 이력 삭제
  const handleDeleteHistory = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('임시 보관된 이 작업을 정말 삭제하시겠습니까?')) return
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
                className={`block max-w-full ${activeTool === 'pointer' ? 'cursor-default' : 'cursor-crosshair'}`}
                width={800}
                height={500}
              />

              {/* 텍스트 실시간 캔버스 오버레이 인풋 창 */}
              {textInput.visible && (
                <div
                  className="absolute z-40 bg-white dark:bg-slate-900 border border-indigo-500 shadow-xl rounded p-2 flex flex-col space-y-1.5"
                  style={{ top: textInput.y, left: textInput.x }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
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

            {/* 하단 속성 조절기 판넬 (도형 스타일 세팅용) */}
            {bgImage && (
              <div className="mt-4 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm flex items-center space-x-5 text-xs text-gray-500 select-none">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">강조선 색상:</span>
                  <div className="flex space-x-1">
                    {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a'].map((col) => (
                      <button
                        key={col}
                        onClick={() => {
                          setPrimaryColor(col)
                          if (selectedItemId) {
                            const updated = items.map(item => {
                              if (item.id === selectedItemId) {
                                return { ...item, style: { ...item.style, borderColor: col } }
                              }
                              return item
                            })
                            pushToUndo(updated)
                          }
                        }}
                        className={`w-4 h-4 rounded-full border border-white cursor-pointer transition-transform ${
                          primaryColor === col ? 'scale-120 ring-2 ring-indigo-500' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <span className="w-px h-3.5 bg-gray-200 dark:bg-slate-800"></span>

                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">원배경 색상:</span>
                  <div className="flex space-x-1">
                    {['#4f46e5', '#3b82f6', '#0f172a', '#10b981', '#ef4444'].map((col) => (
                      <button
                        key={col}
                        onClick={() => {
                          setIndigoColor(col)
                          if (selectedItemId) {
                            const updated = items.map(item => {
                              if (item.id === selectedItemId) {
                                return { ...item, style: { ...item.style, backgroundColor: col } }
                              }
                              return item
                            })
                            pushToUndo(updated)
                          }
                        }}
                        className={`w-4 h-4 rounded-full border border-white cursor-pointer transition-transform ${
                          indigoColor === col ? 'scale-120 ring-2 ring-indigo-500' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <span className="w-px h-3.5 bg-gray-200 dark:bg-slate-800"></span>

                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">선 두께:</span>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={lineWidth}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setLineWidth(val)
                      if (selectedItemId) {
                        const updated = items.map(item => {
                          if (item.id === selectedItemId) {
                            return { ...item, style: { ...item.style, borderWidth: val } }
                          }
                          return item
                        })
                        pushToUndo(updated)
                      }
                    }}
                    className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-bold text-[10px] w-3">{lineWidth}px</span>
                </div>

                <span className="w-px h-3.5 bg-gray-200 dark:bg-slate-800"></span>

                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">글자 크기:</span>
                  <input
                    type="range"
                    min="10"
                    max="28"
                    value={fontSize}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setFontSize(val)
                      if (selectedItemId) {
                        const updated = items.map(item => {
                          if (item.id === selectedItemId) {
                            return { ...item, style: { ...item.style, fontSize: val } }
                          }
                          return item
                        })
                        pushToUndo(updated)
                      }
                    }}
                    className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-bold text-[10px] w-4">{fontSize}px</span>
                </div>

                {selectedItemId && (
                  <>
                    <span className="w-px h-3.5 bg-gray-200 dark:bg-slate-800"></span>
                    <button
                      onClick={() => {
                        const filtered = items.filter((x) => x.id !== selectedItemId)
                        pushToUndo(filtered)
                        setSelectedItemId(null)
                      }}
                      className="flex items-center space-x-1 text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제 (Del)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </main>

          {/* 3. 우측 임시 보관 히스토리 사이드바 */}
          <aside className="w-64 border-l border-gray-200 dark:border-slate-800 flex flex-col shrink-0 overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">임시 보관 작업 목록</span>
              {historyList.length > 0 && (
                <div className="flex items-center space-x-1" title="전체 선택 / 해제">
                  <input
                    type="checkbox"
                    checked={historyList.length > 0 && selectedWorkIds.length === historyList.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWorkIds(historyList.map((h) => h.id))
                      } else {
                        setSelectedWorkIds([])
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400 font-medium select-none">전체</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
              {loadingHistory ? (
                <div className="text-center text-xs text-gray-400 py-6">로딩 중...</div>
              ) : historyList.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-10 leading-relaxed select-none">
                  임시 보관함이 비어 있습니다.<br />
                  (이전 진행 상태를 여기에 임시 저장하고 불러올 수 있습니다.)
                </div>
              ) : (
                historyList.map((work) => (
                  <div
                    key={work.id}
                    onClick={() => handleLoadWork(work)}
                    className="p-2 border border-gray-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg cursor-pointer transition-all flex flex-col space-y-1.5 select-none relative group"
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedWorkIds.includes(work.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          if (e.target.checked) {
                            setSelectedWorkIds((prev) => [...prev, work.id])
                          } else {
                            setSelectedWorkIds((prev) => prev.filter((id) => id !== work.id))
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer mr-2 shrink-0"
                      />
                      <div className="flex-1 flex justify-between items-center min-w-0">
                        {editingId === work.id ? (
                          <input
                            type="text"
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => handleUpdateTitle(work, editingTitleValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleUpdateTitle(work, editingTitleValue)
                              } else if (e.key === 'Escape') {
                                setEditingId(null)
                              }
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-indigo-500 rounded font-semibold text-gray-800 dark:text-slate-100 w-full focus:outline-hidden"
                          />
                        ) : (
                          <div className="flex items-center space-x-1 flex-1 min-w-0" onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingId(work.id)
                            setEditingTitleValue(work.title)
                          }}>
                            <span className="font-semibold text-gray-800 dark:text-slate-200 text-xs truncate max-w-[150px]" title={work.title}>
                              {work.title}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(work.id)
                              setEditingTitleValue(work.title)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-indigo-650 rounded transition-all cursor-pointer"
                            title="제목 수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteHistory(work.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                            title="기록 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium pl-5.5">
                      수정: {new Date(work.updatedAt).toLocaleDateString()} {new Date(work.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatRelativeTime(work.updatedAt)})
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 선택 삭제 제어부 */}
            {selectedWorkIds.length > 0 && (
              <div className="p-3 border-t border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shrink-0">
                <button
                  onClick={handleDeleteSelected}
                  className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 rounded-md text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>선택 항목 모두 삭제 ({selectedWorkIds.length})</span>
                </button>
              </div>
            )}
          </aside>

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
                  title="변경사항이 있을 때만 임시저장 활성화"
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
