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
      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400">
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
        className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-hidden focus:bg-white focus:border-indigo-500 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            onSearch?.('')
            inputRef?.current?.focus()
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-650 cursor-pointer"
          title="검색어 지우기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default FilterInput
