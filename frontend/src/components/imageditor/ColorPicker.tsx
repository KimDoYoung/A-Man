import React, { useRef } from 'react'
import { Plus } from 'lucide-react'

interface ColorPickerProps {
  label: string
  selectedColor: string
  onChangeColor: (color: string) => void
  colors: string[]
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  selectedColor,
  onChangeColor,
  colors
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const isPresetSelected = colors.includes(selectedColor)
  const isCustomSelected = !isPresetSelected && selectedColor !== 'transparent' && selectedColor !== ''

  const handleCustomClick = () => {
    inputRef.current?.click()
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeColor(e.target.value)
  }

  return (
    <div className="space-y-2">
      <span className="block font-bold text-gray-700 dark:text-slate-300 mb-2">{label}</span>
      <div className="flex items-center space-x-2">
        {colors.map((col) => (
          <button
            key={col}
            onClick={() => onChangeColor(col)}
            className={`w-4 h-4 rounded-full border border-gray-200 dark:border-slate-800 cursor-pointer transition-transform relative flex items-center justify-center ${
              selectedColor === col ? 'scale-100 ring-2 ring-indigo-500 border-indigo-500' : 'hover:scale-110'
            }`}
            style={col === 'transparent' ? { backgroundColor: '#ffffff' } : { backgroundColor: col }}
            title={col === 'transparent' ? '투명 배경' : col}
          >
            {col === 'transparent' && (
              <div className="w-full h-full relative overflow-hidden rounded-full flex items-center justify-center">
                {/* 투명 표시 사선 (/) */}
                <div className="w-[140%] h-[1.5px] bg-red-500 transform rotate-45 absolute" />
              </div>
            )}
          </button>
        ))}

        {/* 사용자 정의 색상 선택 (방향 1) */}
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="color"
            value={isCustomSelected ? selectedColor : '#ffffff'}
            onChange={handleCustomChange}
            className="sr-only"
          />
          <button
            onClick={handleCustomClick}
            className={`w-4 h-4 rounded-full cursor-pointer transition-all flex items-center justify-center ${
              isCustomSelected
                ? 'scale-100 ring-2 ring-indigo-500 border-indigo-500'
                : 'border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 hover:bg-gray-100 hover:scale-110 text-gray-400 dark:text-slate-500'
            }`}
            style={isCustomSelected ? { backgroundColor: selectedColor } : {}}
            title={isCustomSelected ? `사용자 색상: ${selectedColor}` : '사용자 정의 색상 선택'}
          >
            {!isCustomSelected && <Plus className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColorPicker
