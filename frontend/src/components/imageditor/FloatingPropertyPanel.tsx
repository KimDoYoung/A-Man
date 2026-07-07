import React, { useState, useEffect, useRef } from 'react'
import { Minimize2, Maximize2, Settings, Layout, Type, Palette, Trash2, CircleDot, Square } from 'lucide-react'
import { CanvasItem } from './image_editor_types'
import ColorPicker from './ColorPicker'
import RangeSlider from './RangeSlider'

interface FloatingPropertyPanelProps {
  primaryColor: string
  setPrimaryColor: (color: string) => void
  indigoColor: string
  setIndigoColor: (color: string) => void
  lineWidth: number
  setLineWidth: (width: number) => void
  fontSize: number
  setFontSize: (size: number) => void
  
  hasBorder: boolean
  setHasBorder: (val: boolean) => void
  borderColor: string
  setBorderColor: (color: string) => void
  borderWidth: number
  setBorderWidth: (width: number) => void
  borderStyle: 'basic' | 'rounded'
  setBorderStyle: (style: 'basic' | 'rounded') => void

  hasCaption: boolean
  setHasCaption: (val: boolean) => void
  captionText: string
  setCaptionText: (text: string) => void

  selectedItemId: string | null
  setSelectedItemId: (id: string | null) => void
  circleCounter: number
  setCircleCounter: (val: number) => void
  textColor: string
  setTextColor: (color: string) => void
  activeTool: 'pointer' | 'circle-number' | 'box' | 'text' | 'crop'
  items: CanvasItem[]
  pushToUndo: (newItems: CanvasItem[]) => void
}

const FloatingPropertyPanel: React.FC<FloatingPropertyPanelProps> = ({
  primaryColor,
  setPrimaryColor,
  indigoColor,
  setIndigoColor,
  lineWidth,
  setLineWidth,
  fontSize,
  setFontSize,
  hasBorder,
  setHasBorder,
  borderColor,
  setBorderColor,
  borderWidth,
  setBorderWidth,
  borderStyle,
  setBorderStyle,
  hasCaption,
  setHasCaption,
  captionText,
  setCaptionText,
  selectedItemId,
  setSelectedItemId,
  circleCounter,
  setCircleCounter,
  textColor,
  setTextColor,
  activeTool,
  items,
  pushToUndo
}) => {
  // 초기 띄우는 위치 (부모 캔버스 위에 뜨도록 고정/절대 좌표 적용)
  const [position, setPosition] = useState({ x: 100, y: 150 })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'border' | 'caption'>('basic')

  const selectedItem = items.find(item => item.id === selectedItemId)
  const isSelectedCircle = selectedItem?.type === 'circle-number'

  const handleCircleNumberChange = (val: number) => {
    const safeVal = Math.max(1, val)
    setCircleCounter(safeVal)
    if (selectedItemId && isSelectedCircle) {
      const updated = items.map(item => {
        if (item.id === selectedItemId) {
          return { ...item, text: String(safeVal) }
        }
        return item
      })
      pushToUndo(updated)
    }
  }

  const getSelectedIcon = () => {
    // 1순위: 선택된 아이템이 있을 때
    if (selectedItemId && selectedItem) {
      switch (selectedItem.type) {
        case 'circle-number':
          return <CircleDot className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
        case 'box':
          return <Square className="w-3.5 h-3.5 text-red-500 animate-pulse" />
        case 'text':
          return <Type className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
      }
    }
    // 2순위: 선택된 아이템은 없지만 현재 활성화된 도구가 있을 때
    switch (activeTool) {
      case 'circle-number':
        return <CircleDot className="w-3.5 h-3.5 text-indigo-500" />
      case 'box':
        return <Square className="w-3.5 h-3.5 text-red-500" />
      case 'text':
        return <Type className="w-3.5 h-3.5 text-blue-500" />
      default:
        return <Settings className="w-3.5 h-3.5 text-indigo-650" />
    }
  }

  const getSelectedLabel = () => {
    if (selectedItemId && selectedItem) {
      switch (selectedItem.type) {
        case 'circle-number':
          return `속성 조절기 (${selectedItem.text}번 원숫자)`
        case 'box':
          return '속성 조절기 (강조 박스)'
        case 'text':
          return '속성 조절기 (설명 텍스트)'
      }
    }
    switch (activeTool) {
      case 'circle-number':
        return '속성 조절기 (원숫자 도구)'
      case 'box':
        return '속성 조절기 (강조 박스 도구)'
      case 'text':
        return '속성 조절기 (설명 텍스트 도구)'
      case 'crop':
        return '속성 조절기 (이미지 자르기)'
      default:
        return '속성 조절기 판넬'
    }
  }
  
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; panelX: number; panelY: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    // 내부 폼 요소(인풋, 셀렉트, 버튼 등) 클릭 시에는 드래그 차단
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) {
      return
    }

    e.preventDefault()
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panelX: position.x,
      panelY: position.y
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current) return
    const deltaX = e.clientX - dragStartRef.current.mouseX
    const deltaY = e.clientY - dragStartRef.current.mouseY
    
    let newX = dragStartRef.current.panelX + deltaX
    let newY = dragStartRef.current.panelY + deltaY

    // 화면 경계를 이탈하지 않도록 윈도우 너비/높이 한계 산출 및 클램핑
    const panelW = panelRef.current?.offsetWidth || 340
    const panelH = panelRef.current?.offsetHeight || 260
    const maxX = window.innerWidth - panelW - 30
    const maxY = window.innerHeight - panelH - 80

    newX = Math.max(20, Math.min(newX, maxX))
    newY = Math.max(80, Math.min(newY, maxY)) // 헤더를 가리지 않게 최소 y를 80px로 잡음

    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    dragStartRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div
      ref={panelRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="absolute z-50 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200/60 dark:border-slate-800/65 shadow-2xl rounded-xl overflow-hidden flex flex-col text-xs text-gray-500 transition-all select-none animate-in fade-in zoom-in-95 duration-200"
    >
      {/* 1. 드래그 가능 헤더 영역 */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setIsCollapsed(!isCollapsed)}
        className="h-10 px-4 bg-gray-50 dark:bg-slate-950 border-b border-gray-150 dark:border-slate-850 flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="flex items-center space-x-1.5 font-bold text-gray-700 dark:text-slate-200">
          {getSelectedIcon()}
          <span>{getSelectedLabel()}</span>
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
          title={isCollapsed ? '펼치기' : '접기'}
        >
          {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 2. 바디 영역 (접혀 있지 않을 때만 노출) */}
      {!isCollapsed && (
        <div className="flex flex-col flex-1 min-h-[220px]">
          {/* 탭 네비게이션 */}
          <div className="flex bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-150 dark:border-slate-850 shrink-0">
            {[
              { id: 'basic', label: '기본속성', icon: <Palette className="w-3.5 h-3.5" /> },
              { id: 'border', label: '테두리', icon: <Layout className="w-3.5 h-3.5" /> },
              { id: 'caption', label: '설명캡션', icon: <Type className="w-3.5 h-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-3 border-b-2 font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-[11px] ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 탭 내용 영역 */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            
            {/* 탭 A: 기본속성 */}
            {activeTab === 'basic' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 강조선 색상 */}
                <ColorPicker
                  label="강조선 색상"
                  selectedColor={primaryColor}
                  onChangeColor={(col) => {
                    setPrimaryColor(col)
                    if (selectedItemId) {
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          if (item.type === 'text') {
                            return { ...item, style: { ...item.style, textColor: col } }
                          }
                          return { ...item, style: { ...item.style, borderColor: col } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }
                  }}
                  colors={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a']}
                />

                {/* 원배경 색상 */}
                <ColorPicker
                  label="원배경 색상"
                  selectedColor={indigoColor}
                  onChangeColor={(col) => {
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
                  colors={['#4f46e5', '#3b82f6', '#0f172a', '#10b981', '#ef4444']}
                />

                {/* 글자 색상 */}
                <ColorPicker
                  label="글자 색상"
                  selectedColor={textColor}
                  onChangeColor={(col) => {
                    setTextColor(col)
                    if (selectedItemId) {
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, textColor: col } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }
                  }}
                  colors={['#ffffff', '#0f172a', '#ef4444', '#3b82f6', '#10b981']}
                />

                {/* 원숫자 번호 카운터 설정 */}
                <div className="space-y-2">
                  <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    {isSelectedCircle ? '선택된 원숫자 번호' : '다음 원숫자 번호'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCircleNumberChange((isSelectedCircle ? Number(selectedItem.text) : circleCounter) - 1)}
                      className="w-7 h-7 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-md flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs transition-colors"
                      title="1 감소"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={isSelectedCircle ? Number(selectedItem.text) : circleCounter}
                      onChange={(e) => handleCircleNumberChange(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1.5 text-center bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-750 rounded-md text-xs text-gray-850 dark:text-slate-100 font-bold focus:outline-hidden focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleCircleNumberChange((isSelectedCircle ? Number(selectedItem.text) : circleCounter) + 1)}
                      className="w-7 h-7 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-md flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs transition-colors"
                      title="1 증가"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 선 두께 */}
                <RangeSlider
                  label="선 두께"
                  value={lineWidth}
                  min={1}
                  max={8}
                  onChangeValue={(val) => {
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
                />

                {/* 글자 크기 */}
                <RangeSlider
                  label="글자 크기"
                  value={fontSize}
                  min={10}
                  max={28}
                  onChangeValue={(val) => {
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
                />

                {selectedItemId && (
                  <div className="pt-2 border-t border-gray-100 dark:border-slate-850">
                    <button
                      onClick={() => {
                        const filtered = items.filter((x) => x.id !== selectedItemId)
                        pushToUndo(filtered)
                        setSelectedItemId(null)
                      }}
                      className="w-full py-1.5 flex items-center justify-center space-x-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md font-bold cursor-pointer transition-colors border border-red-100 dark:border-red-900/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>선택 요소 삭제 (Del)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 탭 B: 테두리 */}
            {activeTab === 'border' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-slate-300">외곽테두리 사용</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBorder}
                      onChange={(e) => setHasBorder(e.target.checked)}
                      className="sr-only peer cursor-pointer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {hasBorder && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-850 animate-in slide-in-from-top-1 duration-200">
                    {/* 테두리 스타일 */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-gray-700 dark:text-slate-300">테두리 모서리 스타일</span>
                      <select
                        value={borderStyle}
                        onChange={(e) => setBorderStyle(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-750 rounded-md text-xs text-gray-800 dark:text-slate-100 font-semibold cursor-pointer focus:outline-hidden"
                      >
                        <option value="basic">직각 모서리 (Basic)</option>
                        <option value="rounded">둥근 모서리 (Rounded Window)</option>
                      </select>
                    </div>

                    {/* 테두리 색상 */}
                    <ColorPicker
                      label="테두리 색상"
                      selectedColor={borderColor}
                      onChangeColor={setBorderColor}
                      colors={['#cbd5e1', '#64748b', '#3b82f6', '#ef4444', '#10b981']}
                    />

                    {/* 테두리 두께 */}
                    <RangeSlider
                      label="테두리 두께"
                      value={borderWidth}
                      min={1}
                      max={6}
                      onChangeValue={setBorderWidth}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 탭 C: 설명캡션 */}
            {activeTab === 'caption' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-slate-300">설명캡션 사용</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCaption}
                      onChange={(e) => setHasCaption(e.target.checked)}
                      className="sr-only peer cursor-pointer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {hasCaption && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-slate-850 animate-in slide-in-from-top-1 duration-200">
                    <span className="font-bold text-gray-700 dark:text-slate-300">설명 캡션 문구 기입</span>
                    <textarea
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      placeholder="이미지 하단 설명 문구 입력..."
                      rows={4}
                      className="w-full p-2.5 bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-750 rounded-md text-xs text-gray-800 dark:text-slate-100 font-semibold focus:outline-hidden focus:border-indigo-500 resize-none font-sans"
                      autoFocus
                    />
                    <span className="text-[10px] text-gray-400">설명캡션은 캔버스 하단 영역에 결합되어 파일 저장 시 하나의 이미지로 자동 출력됩니다.</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

export default FloatingPropertyPanel
