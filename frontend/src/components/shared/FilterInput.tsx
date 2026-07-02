import React from 'react'
import { Filter, X } from 'lucide-react'

interface FilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (val: string) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const FilterInput: React.FC<FilterInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '필터링...',
  inputRef
}) => {
  return (
    <div className="relative flex-1">
      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400 dark:text-slate-500">
        <Filter className="w-3.5 h-3.5" />
      </span>
      <input 
        ref={inputRef}
        type="text" 
        placeholder={placeholder} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch?.(value)
          }
        }}
        className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            onSearch?.('')
            inputRef?.current?.focus()
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 dark:text-slate-500 hover:text-gray-650 dark:hover:text-slate-350 cursor-pointer"
          title="검색어 지우기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default FilterInput
