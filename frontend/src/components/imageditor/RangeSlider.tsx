import React, { useState } from 'react'
import { RotateCcw, Edit3 } from 'lucide-react'

interface RangeSliderProps {
  label: string
  value: number
  min: number
  max: number
  onChangeValue: (val: number) => void
  unit?: string
  button_inc_dev_enable?: boolean
  button_inc_dev_step?: number
  defaultValue?: number
  manual_input_enable?: boolean
  manual_input_type?: 'number' | 'select'
  manual_input_options?: number[]
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  value,
  min,
  max,
  onChangeValue,
  unit = 'px',
  button_inc_dev_enable = false,
  button_inc_dev_step = 1,
  defaultValue,
  manual_input_enable = false,
  manual_input_type = 'number',
  manual_input_options
}) => {
  const [isManualInputMode, setIsManualInputMode] = useState(false)
  const [manualInputValue, setManualInputValue] = useState(String(value))

  const handleStep = (step: number) => {
    const newValue = Math.max(min, Math.min(max, value + step))
    onChangeValue(newValue)
  }

  const handleReset = () => {
    if (defaultValue !== undefined) {
      onChangeValue(defaultValue)
    }
  }

  const handleToggleEdit = () => {
    setManualInputValue(String(value))
    setIsManualInputMode(!isManualInputMode)
  }

  const handleConfirm = () => {
    let num = Number(manualInputValue)
    if (isNaN(num)) {
      num = value
    }
    const clamped = Math.max(min, Math.min(max, num))
    onChangeValue(clamped)
    setIsManualInputMode(false)
  }

  const handleCancel = () => {
    setIsManualInputMode(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-700 dark:text-slate-300 text-xs">{label}</span>
        <span className="font-bold text-indigo-650 dark:text-indigo-400 text-xs">{value}{unit}</span>
      </div>
      
      {isManualInputMode && manual_input_enable ? (
        <div className="flex items-center space-x-2">
          {manual_input_type === 'select' && manual_input_options ? (
            <select
              value={value}
              onChange={(e) => {
                onChangeValue(Number(e.target.value))
                setIsManualInputMode(false)
              }}
              onBlur={() => setIsManualInputMode(false)}
              className="flex-1 text-xs border border-gray-200 dark:border-slate-800 rounded px-2 py-0.5 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-6"
              autoFocus
            >
              {manual_input_options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}{unit}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min={min}
              max={max}
              value={manualInputValue}
              onChange={(e) => setManualInputValue(e.target.value)}
              className="flex-1 text-xs border border-gray-200 dark:border-slate-800 rounded px-2 py-0.5 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-6"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm()
                } else if (e.key === 'Escape') {
                  handleCancel()
                }
              }}
            />
          )}
          {manual_input_type !== 'select' && (
            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs px-2 py-0.5 bg-gray-300 hover:bg-indigo-500 text-white rounded cursor-pointer font-bold h-6 flex items-center justify-center transition-colors"
            >
              확인
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs px-2 py-0.5 bg-gray-300  hover:bg-gray-500  text-white  rounded cursor-pointer font-bold h-6 flex items-center justify-center transition-colors"
          >
            취소
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {defaultValue !== undefined && (
            <button
              type="button"
              onClick={handleReset}
              className="w-5 h-5 hover:bg-gray-250 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 cursor-pointer flex items-center justify-center text-[10px] select-none border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
              title={`${defaultValue}${unit}으로 초기화`}
            >
              <RotateCcw size={11} />
            </button>
          )}
          
          {button_inc_dev_enable && (
            <button
              onClick={() => handleStep(-button_inc_dev_step)}
              className="w-5 h-5 hover:bg-gray-250 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 cursor-pointer flex items-center justify-center text-[8px] select-none border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
              title="감소"
              type="button"
            >
              ▼
            </button>
          )}
          
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChangeValue(Number(e.target.value))}
            className="flex-1 h-1 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
          />
          
          {button_inc_dev_enable && (
            <button
              onClick={() => handleStep(button_inc_dev_step)}
              className="w-5 h-5 hover:bg-gray-250 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 cursor-pointer flex items-center justify-center text-[8px] select-none border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
              title="증가"
              type="button"
            >
              ▲
            </button>
          )}

          {manual_input_enable && (
            <button
              type="button"
              onClick={handleToggleEdit}
              className={`w-5 h-5 hover:bg-gray-250 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 cursor-pointer flex items-center justify-center text-[10px] select-none border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors ${
                isManualInputMode ? 'text-indigo-650 dark:text-indigo-400 border-indigo-300' : ''
              }`}
              title="수동 입력 모드 토글"
            >
              <Edit3 size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default RangeSlider
