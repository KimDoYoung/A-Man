import React from 'react'

interface RangeSliderProps {
  label: string
  value: number
  min: number
  max: number
  onChangeValue: (val: number) => void
  unit?: string
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  value,
  min,
  max,
  onChangeValue,
  unit = 'px'
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-700 dark:text-slate-300">{label}</span>
        <span className="font-bold text-indigo-650 dark:text-indigo-400">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChangeValue(Number(e.target.value))}
        className="w-full h-1 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
      />
    </div>
  )
}

export default RangeSlider
