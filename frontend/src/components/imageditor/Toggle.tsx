import React from 'react'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  labelClassName?: string
  className?: string
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  labelClassName = 'font-bold text-xs text-gray-700 dark:text-slate-300',
  className = ''
}) => (
  <div className={`flex items-center justify-between ${className}`.trim()}>
    <span className={labelClassName}>{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer cursor-pointer"
      />
      <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
    </label>
  </div>
)

export default Toggle
