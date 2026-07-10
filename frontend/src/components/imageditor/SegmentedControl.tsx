import React from 'react'

interface SegmentedOption {
  id: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (id: string) => void
  sizeClassName?: string
  unselectedTextClassName?: string
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  sizeClassName = 'px-3 py-1 text-xs',
  unselectedTextClassName = 'text-gray-500'
}) => (
  <div className="flex space-x-1.5">
    {options.map((opt) => (
      <button
        key={opt.id}
        onClick={() => onChange(opt.id)}
        className={`${sizeClassName} border rounded-md font-bold cursor-pointer transition-all ${
          value === opt.id
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 shadow-xs'
            : `bg-white dark:bg-slate-900 ${unselectedTextClassName} hover:bg-gray-50 border-gray-200 dark:border-slate-800`
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
)

export default SegmentedControl
