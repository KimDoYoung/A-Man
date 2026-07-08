import React, { useState, useEffect, useRef } from 'react'
import { Minimize2, Maximize2, Settings, Layout, Type, Palette, CircleDot, Square, Save } from 'lucide-react'
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
  captionAlign: 'left' | 'center'
  setCaptionAlign: (align: 'left' | 'center') => void
  circleBorderColor: string
  setCircleBorderColor: (color: string) => void

  selectedItemId: string | null
  circleCounter: number
  setCircleCounter: (val: number) => void
  textColor: string
  setTextColor: (color: string) => void
  boxBgColor: string
  setBoxBgColor: (color: string) => void
  boxOpacity: number
  setBoxOpacity: (val: number) => void
  boxLineStyle: 'solid' | 'dashed'
  setBoxLineStyle: (style: 'solid' | 'dashed') => void
  selectedEmoji: string
  setSelectedEmoji: (emoji: string) => void
  symbolScale: number
  setSymbolScale: (scale: number) => void
  boxBorderRadius: number
  setBoxBorderRadius: (val: number) => void
  onSaveDefaults: () => Promise<void> | void
  activeTool: 'pointer' | 'circle-number' | 'box' | 'text' | 'crop' | 'arrow' | 'symbol'
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
  captionAlign,
  setCaptionAlign,
  circleBorderColor,
  setCircleBorderColor,
  selectedItemId,
  circleCounter,
  setCircleCounter,
  textColor,
  setTextColor,
  boxBgColor,
  setBoxBgColor,
  boxOpacity,
  setBoxOpacity,
  boxLineStyle,
  setBoxLineStyle,
  selectedEmoji,
  setSelectedEmoji,
  symbolScale,
  setSymbolScale,
  boxBorderRadius,
  setBoxBorderRadius,
  onSaveDefaults,
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
          {selectedItemId && selectedItem ? (
            /* A. 개별 아이템 선택 모드 (인스펙터) */
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              
              {/* box 또는 arrow 타입 인스펙터 */}
              {(selectedItem.type === 'box' || selectedItem.type === 'arrow') && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 강조선 색상 */}
                  <ColorPicker
                    label="강조선 색상"
                    selectedColor={selectedItem.style.borderColor || primaryColor}
                    onChangeColor={(col) => {
                      setPrimaryColor(col)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, borderColor: col } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                    colors={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a']}
                  />

                  {/* 배경색 및 투명도: box 타입일 때만 */}
                  {selectedItem.type === 'box' && (
                    <>
                      {/* 배경색 */}
                      <ColorPicker
                        label="배경색"
                        selectedColor={selectedItem.style.backgroundColor || boxBgColor}
                        onChangeColor={(col) => {
                          setBoxBgColor(col)
                          const updated = items.map(item => {
                            if (item.id === selectedItemId) {
                              return { ...item, style: { ...item.style, backgroundColor: col } }
                            }
                            return item
                          })
                          pushToUndo(updated)
                        }}
                        colors={['transparent', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a']}
                      />

                      {/* 투명도 */}
                      <RangeSlider
                        label="투명도"
                        value={selectedItem.style.opacity !== undefined ? Math.round(selectedItem.style.opacity * 100) : boxOpacity}
                        min={0}
                        max={100}
                        unit="%"
                        onChangeValue={(val) => {
                          setBoxOpacity(val)
                          const updated = items.map(item => {
                            if (item.id === selectedItemId) {
                              return { ...item, style: { ...item.style, opacity: val / 100 } }
                            }
                            return item
                          })
                          pushToUndo(updated)
                        }}
                      />

                      {/* 모서리 둥글기 */}
                      <RangeSlider
                        label="모서리 둥글기"
                        value={selectedItem.style.borderRadius !== undefined ? selectedItem.style.borderRadius : boxBorderRadius}
                        min={0}
                        max={40}
                        unit="px"
                        onChangeValue={(val) => {
                          setBoxBorderRadius(val)
                          const updated = items.map(item => {
                            if (item.id === selectedItemId) {
                              return { ...item, style: { ...item.style, borderRadius: val } }
                            }
                            return item
                          })
                          pushToUndo(updated)
                        }}
                      />
                    </>
                  )}

                  {/* 선 타입 (실선/점선) */}
                  <div className="space-y-1.5">
                    <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">선 타입</span>
                    <div className="flex space-x-1.5">
                      {[
                        { id: 'solid', label: '실선' },
                        { id: 'dashed', label: '점선' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setBoxLineStyle(t.id as any)
                            const updated = items.map(item => {
                              if (item.id === selectedItemId) {
                                return { ...item, style: { ...item.style, lineStyle: t.id as any } }
                              }
                              return item
                            })
                            pushToUndo(updated)
                          }}
                          className={`px-3 py-1 border rounded-md font-bold text-xs cursor-pointer transition-all ${
                            (selectedItem.style.lineStyle || 'solid') === t.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-50 border-gray-200 dark:border-slate-800'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 선 두께 */}
                  <RangeSlider
                    label="선 두께"
                    value={selectedItem.style.borderWidth || lineWidth}
                    min={1}
                    max={8}
                    onChangeValue={(val) => {
                      setLineWidth(val)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, borderWidth: val } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                  />
                </div>
              )}

              {/* symbol 타입 인스펙터 */}
              {selectedItem.type === 'symbol' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 심볼 이모지 선택 */}
                  <div className="space-y-2">
                    <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">심볼 이모지 선택</span>
                    <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-slate-850 p-2.5 rounded-lg border border-gray-150 dark:border-slate-800">
                      {['💡', '⚠️', '✅', '❌', 'ℹ️', '⭐', '🔥', '📌', '🚀', '🔍', '❓', '💬'].map((emoji) => {
                        const isCurrent = selectedItem.text === emoji
                        return (
                          <button
                            key={emoji}
                            onClick={() => {
                              setSelectedEmoji(emoji)
                              const updated = items.map(item => {
                                if (item.id === selectedItemId) {
                                  return { ...item, text: emoji }
                                }
                                return item
                              })
                              pushToUndo(updated)
                            }}
                            className={`py-1.5 text-center text-lg rounded-md transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-600 shadow-sm transform scale-110'
                                : 'hover:bg-gray-150 dark:hover:bg-slate-800'
                            }`}
                          >
                            {emoji}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 크기 단계 선택 (1-5) */}
                  <div className="space-y-2">
                    <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">크기 선택</span>
                    <div className="flex space-x-1 bg-gray-50 dark:bg-slate-850 p-1 rounded-lg border border-gray-150 dark:border-slate-800">
                      {[1, 2, 3, 4, 5].map((scale) => {
                        const scaleMapping = [20, 32, 48, 64, 80]
                        const currentSize = selectedItem.style.fontSize || 48
                        // 픽셀 값에 가장 가까운 스케일 단계를 매칭하여 판별
                        const currentScale = scaleMapping.findIndex(s => s === currentSize) + 1 || 3
                        const isCurrent = currentScale === scale

                        return (
                          <button
                            key={scale}
                            onClick={() => {
                              setSymbolScale(scale)
                              const actualSize = scaleMapping[scale - 1]
                              const updated = items.map(item => {
                                if (item.id === selectedItemId) {
                                  return { ...item, style: { ...item.style, fontSize: actualSize } }
                                }
                                return item
                              })
                              pushToUndo(updated)
                            }}
                            className={`flex-1 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-xs border border-gray-200 dark:border-slate-800'
                                : 'text-gray-400 hover:text-gray-650 dark:hover:text-slate-350'
                            }`}
                          >
                            {scale}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* circle-number 타입 인스펙터 */}
              {selectedItem.type === 'circle-number' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 원배경 색상 */}
                  <ColorPicker
                    label="원배경 색상"
                    selectedColor={selectedItem.style.backgroundColor || indigoColor}
                    onChangeColor={(col) => {
                      setIndigoColor(col)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, backgroundColor: col } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                    colors={['#4f46e5', '#3b82f6', '#0f172a', '#10b981', '#ef4444']}
                  />

                  {/* 글자 색상 */}
                  <ColorPicker
                    label="글자 색상"
                    selectedColor={selectedItem.style.textColor || textColor}
                    onChangeColor={(col) => {
                      setTextColor(col)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, textColor: col } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                    colors={['#ffffff', '#0f172a', '#ef4444', '#3b82f6', '#eff37f']}
                  />

                  {/* 테두리 색상 */}
                  <ColorPicker
                    label="테두리 색상"
                    selectedColor={selectedItem.style.borderColor || circleBorderColor}
                    onChangeColor={(col) => {
                      setCircleBorderColor(col)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, borderColor: col } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                    colors={['#ffffff', '#ef4444', '#f59e0b', '#3b82f6', '#0f172a']}
                  />

                  {/* 테두리 두께 */}
                  <RangeSlider
                    label="테두리 두께"
                    value={selectedItem.style.borderWidth || lineWidth}
                    min={1}
                    max={8}
                    onChangeValue={(val) => {
                      setLineWidth(val)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, borderWidth: val } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                  />

                  {/* 원숫자 번호 */}
                  <div className="space-y-2">
                    <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                      다음번호
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={Number(selectedItem.text) || 1}
                      onChange={(e) => handleCircleNumberChange(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1.5 text-center bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-750 rounded-md text-xs text-gray-850 dark:text-slate-100 font-bold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  {/* 글자 크기 */}
                  <RangeSlider
                    label="글자 크기"
                    value={selectedItem.style.fontSize || fontSize}
                    min={10}
                    max={28}
                    onChangeValue={(val) => {
                      setFontSize(val)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, fontSize: val } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                  />
                </div>
              )}

              {/* text 타입 인스펙터 */}
              {selectedItem.type === 'text' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 글자 색상 */}
                  <ColorPicker
                    label="글자 색상"
                    selectedColor={selectedItem.style.textColor || textColor}
                    onChangeColor={(col) => {
                      setTextColor(col)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, textColor: col } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                    colors={['#ffffff', '#0f172a', '#ef4444', '#3b82f6', '#10b981']}
                  />

                  {/* 글자 크기 */}
                  <RangeSlider
                    label="글자 크기"
                    value={selectedItem.style.fontSize || fontSize}
                    min={10}
                    max={28}
                    onChangeValue={(val) => {
                      setFontSize(val)
                      const updated = items.map(item => {
                        if (item.id === selectedItemId) {
                          return { ...item, style: { ...item.style, fontSize: val } }
                        }
                        return item
                      })
                      pushToUndo(updated)
                    }}
                  />
                </div>
              )}

            </div>
          ) : (
            /* B. 일반 전역 설정 모드 (아무것도 선택되지 않았을 때) */
            <>
              {/* 탭 네비게이션 */}
              <div className="flex bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-150 dark:border-slate-850 shrink-0">
                {[
                  { id: 'basic', label: '기본도구', icon: <Palette className="w-3.5 h-3.5" /> },
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
                
                {/* 탭 A: 기본도구 */}
                {activeTab === 'basic' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* 활성화된 그리기 툴 별 기본값 설정 */}
                    {activeTool === 'circle-number' && (
                      <>
                        <ColorPicker
                          label="원배경 색상"
                          selectedColor={indigoColor}
                          onChangeColor={setIndigoColor}
                          colors={['#4f46e5', '#3b82f6', '#0f172a', '#10b981', '#ef4444']}
                        />
                        <ColorPicker
                          label="글자 색상"
                          selectedColor={textColor}
                          onChangeColor={setTextColor}
                          colors={['#ffffff', '#0f172a', '#ef4444', '#3b82f6', '#10b981']}
                        />
                        <ColorPicker
                          label="테두리 색상"
                          selectedColor={circleBorderColor}
                          onChangeColor={setCircleBorderColor}
                          colors={['#ffffff', '#ef4444', '#f59e0b', '#3b82f6', '#0f172a']}
                        />
                        <RangeSlider
                          label="테두리 두께"
                          value={lineWidth}
                          min={1}
                          max={5}
                          onChangeValue={setLineWidth}
                        />

                        <RangeSlider
                          label="글자 크기"
                          value={fontSize}
                          min={10}
                          max={28}
                          onChangeValue={setFontSize}
                        />
                        <div className="space-y-2">
                          <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">다음번호</span>
                          <input
                            type="number"
                            min="1"
                            value={circleCounter}
                            onChange={(e) => setCircleCounter(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 px-2 py-1.5 text-center bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-750 rounded-md text-xs text-gray-850 dark:text-slate-100 font-bold focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>                        
                      </>
                    )}

                    {(activeTool === 'box' || activeTool === 'arrow') && (
                      <>
                        <ColorPicker
                          label="강조선 색상"
                          selectedColor={primaryColor}
                          onChangeColor={setPrimaryColor}
                          colors={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a']}
                        />
                        {activeTool === 'box' && (
                          <>
                            <ColorPicker
                              label="배경색"
                              selectedColor={boxBgColor}
                              onChangeColor={setBoxBgColor}
                              colors={['transparent', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a']}
                            />
                            <RangeSlider
                              label="투명도"
                              value={boxOpacity}
                              min={0}
                              max={100}
                              unit="%"
                              onChangeValue={setBoxOpacity}
                            />
                            <RangeSlider
                              label="모서리 둥글기"
                              value={boxBorderRadius}
                              min={0}
                              max={40}
                              unit="px"
                              onChangeValue={setBoxBorderRadius}
                            />
                          </>
                        )}
                        {/* 선 종류 */}
                        <div className="space-y-1.5">
                          <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">선 종류</span>
                          <div className="flex space-x-1.5">
                            {[
                              { id: 'solid', label: '실선' },
                              { id: 'dashed', label: '점선' }
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setBoxLineStyle(t.id as any)}
                                className={`px-3 py-1 border rounded-md font-bold text-xs cursor-pointer transition-all ${
                                  boxLineStyle === t.id
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-50 border-gray-200 dark:border-slate-800'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <RangeSlider
                          label="선 두께"
                          value={lineWidth}
                          min={1}
                          max={8}
                          onChangeValue={setLineWidth}
                        />
                      </>
                    )}

                    {activeTool === 'symbol' && (
                      <>
                        {/* 심볼 이모지 선택 */}
                        <div className="space-y-2">
                          <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">심볼 이모지 선택</span>
                          <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-slate-850 p-2.5 rounded-lg border border-gray-150 dark:border-slate-800">
                            {['💡', '⚠️', '✅', '❌', 'ℹ️', '⭐', '🔥', '📌', '🚀', '🔍', '❓', '💬'].map((emoji) => {
                              const isCurrent = selectedEmoji === emoji
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => setSelectedEmoji(emoji)}
                                  className={`py-1.5 text-center text-lg rounded-md transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-indigo-600 shadow-sm transform scale-110'
                                      : 'hover:bg-gray-150 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {emoji}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* 크기 단계 선택 (1-5) */}
                        <div className="space-y-2">
                          <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">크기 선택</span>
                          <div className="flex space-x-1 bg-gray-50 dark:bg-slate-850 p-1 rounded-lg border border-gray-150 dark:border-slate-800">
                            {[1, 2, 3, 4, 5].map((scale) => {
                              const isCurrent = symbolScale === scale
                              return (
                                <button
                                  key={scale}
                                  onClick={() => setSymbolScale(scale)}
                                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-xs border border-gray-200 dark:border-slate-800'
                                      : 'text-gray-400 hover:text-gray-650 dark:hover:text-slate-350'
                                  }`}
                                >
                                  {scale}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {activeTool === 'text' && (
                      <>
                        <ColorPicker
                          label="글자 색상"
                          selectedColor={textColor}
                          onChangeColor={setTextColor}
                          colors={['#ffffff', '#0f172a', '#ef4444', '#3b82f6', '#10b981']}
                        />
                        <RangeSlider
                          label="글자 크기"
                          value={fontSize}
                          min={10}
                          max={28}
                          onChangeValue={setFontSize}
                        />
                      </>
                    )}

                    {activeTool === 'pointer' && (
                      <div className="text-center text-gray-400 dark:text-slate-500 py-8 leading-relaxed">
                        캔버스 위의 요소를 클릭하면<br />그 요소의 세부 속성을 수정할 수 있습니다.
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

                        <ColorPicker
                          label="테두리 색상"
                          selectedColor={borderColor}
                          onChangeColor={setBorderColor}
                          colors={['#cbd5e1', '#64748b', '#3b82f6', '#ef4444', '#10b981']}
                        />

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
                        {/* 정렬 방식 선택 */}
                        <div className="space-y-1.5">
                          <span className="block font-bold text-gray-700 dark:text-slate-300 mb-1">정렬 방식</span>
                          <div className="flex space-x-1.5">
                            {[
                              { id: 'center', label: '중앙 정렬 (Center)' },
                              { id: 'left', label: '왼쪽 정렬 (Left)' }
                            ].map((a) => (
                              <button
                                key={a.id}
                                onClick={() => setCaptionAlign(a.id as 'left' | 'center')}
                                className={`flex-1 py-1 border rounded-md font-bold text-xs cursor-pointer transition-all ${
                                  captionAlign === a.id
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-50 border-gray-200 dark:border-slate-800'
                                }`}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <span className="font-bold text-gray-700 dark:text-slate-300 block mt-2">설명 캡션 문구 기입</span>
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
            </>
          )}

          {/* 기본 속성으로 지정 버튼: 개별 요소 선택이 아닐 때만 렌더링 */}
          {!selectedItemId && (
            <div className="p-3 pt-0 border-t border-gray-150 dark:border-slate-850 shrink-0">
              <button
                onClick={onSaveDefaults}
                className="w-full py-1.5 flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 rounded-md font-bold cursor-pointer transition-colors border border-indigo-100 dark:border-indigo-900/50 text-xs shadow-2xs"
                title="현재 지정된 색상, 두께, 둥글기 등의 전역 설정을 개인 기본값으로 영구 지정합니다."
              >
                <Save className="w-3.5 h-3.5" />
                <span>현재 설정을 내 기본값으로 지정</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FloatingPropertyPanel
