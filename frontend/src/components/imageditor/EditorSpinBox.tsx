import React, { useState, useEffect, useRef } from 'react'
import { Minus, Plus, ChevronDown, Check } from 'lucide-react'

export interface PresetOption {
  label: string
  value: number
  isFit?: boolean
  onSelect?: () => void
}

export interface EditorSpinBoxProps {
  label: string
  value: number
  unit: string
  min: number
  max: number
  step?: number
  shiftStep?: number
  presets?: PresetOption[]
  onChange: (newValue: number) => void
  disabled?: boolean
  canShrink?: boolean
  shrinkBlockedTitle?: string
  customPrefix?: React.ReactNode
  isOpen?: boolean
  onToggleOpen?: () => void
  className?: string
  title?: string
}

export const EditorSpinBox: React.FC<EditorSpinBoxProps> = ({
  label,
  value,
  unit,
  min,
  max,
  step = 10,
  shiftStep = 50,
  presets = [],
  onChange,
  disabled = false,
  canShrink = true,
  shrinkBlockedTitle,
  customPrefix,
  isOpen: controlledIsOpen,
  onToggleOpen,
  className = '',
  title
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false)
  const [isFocused, setIsFocused] = useState<boolean>(false)
  const [textValue, setTextValue] = useState<string>(String(value))
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDropdownOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const toggleDropdown = () => {
    if (onToggleOpen) {
      onToggleOpen()
    } else {
      setInternalIsOpen(prev => !prev)
    }
  }
  const closeDropdown = () => {
    if (onToggleOpen) {
      if (controlledIsOpen) onToggleOpen()
    } else {
      setInternalIsOpen(false)
    }
  }

  // 외부 value 동기화
  useEffect(() => {
    if (!isFocused) {
      setTextValue(String(value))
    }
  }, [value, isFocused])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      return () => document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isDropdownOpen])

  // 값 적용 및 검증 함수
  const commitValue = (valStr: string) => {
    const parsed = parseInt(valStr, 10)
    if (isNaN(parsed)) {
      setTextValue(String(value))
      return
    }

    const clamped = Math.max(min, Math.min(max, parsed))
    setTextValue(String(clamped))
    if (clamped !== value) {
      onChange(clamped)
    }
  }

  // 스텝 증감 함수
  const handleStep = (delta: number) => {
    if (disabled) return
    if (delta < 0 && !canShrink) return

    const next = Math.max(min, Math.min(max, value + delta))
    if (next !== value) {
      setTextValue(String(next))
      onChange(next)
    }
  }

  // 키보드 이벤트 핸들러 (화살표 키, Enter, Esc)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation() // 캔버스 단축키로 이벤트 전파 차단

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.shiftKey ? shiftStep : step
      handleStep(delta)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const delta = e.shiftKey ? shiftStep : step
      handleStep(-delta)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commitValue(textValue)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setTextValue(String(value))
      inputRef.current?.blur()
    }
  }

  const isHighlighted = isFocused || isDropdownOpen

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center rounded-lg border transition-all duration-200 text-xs shadow-2xs select-none ${
        isHighlighted
          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/25 dark:ring-amber-500/20'
          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
      } ${className}`}
      title={title}
    >
      {/* 1. 레이블 (맨 왼쪽) */}
      {label && (
        <span className={`pl-2 pr-1 text-[11px] font-bold shrink-0 transition-colors ${
          isHighlighted 
            ? 'text-amber-900 dark:text-amber-200' 
            : 'text-gray-650 dark:text-slate-350'
        }`}>
          {label}:
        </span>
      )}

      {/* 2. 커스텀 요소 (예: 바탕 확장 방향 라디오 등) */}
      {customPrefix && (
        <div className="flex items-center px-1 border-l border-r border-gray-200/80 dark:border-slate-800/80 mr-0.5 ml-0.5">
          {customPrefix}
        </div>
      )}

      {/* 3. 감소 버튼 (-) */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => handleStep(-step)}
        disabled={disabled || !canShrink || value <= min}
        className="p-1 rounded-md text-gray-500 dark:text-slate-400 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 hover:text-amber-900 dark:hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
        title={!canShrink && shrinkBlockedTitle ? shrinkBlockedTitle : `${step}${unit} 감소 (단축키: ↓)`}
      >
        <Minus className="w-3 h-3" />
      </button>

      {/* 4. 숫자 입력창 + 단위 */}
      <div className="flex items-center px-0.5">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={textValue}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            commitValue(textValue)
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setTextValue(raw)
          }}
          onKeyDown={handleKeyDown}
          className={`w-9 text-center font-bold py-0.5 text-xs rounded transition-colors focus:outline-hidden ${
            isFocused 
              ? 'bg-white dark:bg-slate-900 text-amber-950 dark:text-amber-100 shadow-2xs' 
              : 'bg-transparent text-gray-800 dark:text-slate-100'
          }`}
          title="직접 숫자 입력 (Enter: 적용, Esc: 취소, ↑/↓: 증감, Shift+↑/↓: 대폭 증감)"
        />
        <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 shrink-0 select-none mr-0.5">
          {unit}
        </span>
      </div>

      {/* 5. 증가 버튼 (+) */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => handleStep(step)}
        disabled={disabled || value >= max}
        className="p-1 rounded-md text-gray-500 dark:text-slate-400 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 hover:text-amber-900 dark:hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0 mr-0.5"
        title={`${step}${unit} 증가 (단축키: ↑)`}
      >
        <Plus className="w-3 h-3" />
      </button>

      {/* 6. 프리셋 드롭다운 토글 버튼 (▾) */}
      {presets.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          onClick={toggleDropdown}
          className={`px-1 py-1.5 border-l border-gray-200/80 dark:border-slate-800/80 rounded-r-lg hover:bg-amber-100/80 dark:hover:bg-amber-900/40 cursor-pointer transition-colors ${
            isDropdownOpen 
              ? 'text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/40' 
              : 'text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
          title="빠른 프리셋 선택"
        >
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* 7. 프리셋 팝오버 패널 */}
      {isDropdownOpen && presets.length > 0 && (
        <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-lg p-1.5 flex flex-wrap gap-1 min-w-[130px] max-w-[200px] animate-in fade-in zoom-in-95 duration-150">
          <div className="w-full text-[10px] font-bold text-gray-400 dark:text-slate-400 px-1 py-0.5 border-b border-gray-100 dark:border-slate-800 mb-0.5">
            빠른 선택 ({label})
          </div>
          {presets.map((p) => {
            const isSelected = p.value === value
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  if (p.onSelect) {
                    p.onSelect()
                  } else {
                    onChange(p.value)
                  }
                  closeDropdown()
                }}
                className={`flex items-center justify-between gap-1 px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex-1 min-w-[42%] ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{p.label}</span>
                {isSelected && <Check className="w-2.5 h-2.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
