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
            className={`w-5 h-5 rounded-full border border-white cursor-pointer transition-transform ${
              selectedColor === col ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: col }}
            title={col}
          />
        ))}
      </div>
    </div>
  )
}

export default ColorPicker
