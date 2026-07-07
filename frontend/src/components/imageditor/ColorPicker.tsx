import React from 'react'

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
  return (
    <div className="space-y-2">
      <span className="block font-bold text-gray-700 dark:text-slate-300 mb-2">{label}</span>
      <div className="flex space-x-2">
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
      </div>
    </div>
  )
}

export default ColorPicker
