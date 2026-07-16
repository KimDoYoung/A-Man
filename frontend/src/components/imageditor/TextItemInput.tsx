import React, { useRef, useEffect } from 'react'

interface TextItemInputProps {
  x: number
  y: number
  zoom: number
  rotation: number
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  onCancel: () => void
}

const TextItemInput: React.FC<TextItemInputProps> = ({
  x,
  y,
  zoom,
  value,
  onChange,
  onSubmit,
  onCancel
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="absolute z-40 bg-white dark:bg-slate-900 border border-indigo-500 shadow-xl rounded p-2 flex flex-col space-y-1.5"
      style={{
        top: y * zoom,
        left: x * zoom,
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'top left'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="설명 텍스트 기입..."
        className="w-48 h-16 p-1 text-xs focus:outline-hidden border border-gray-200 dark:border-slate-850 rounded bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-sans"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
      />
      <div className="flex justify-between items-center text-[10px]">
        <div className="flex space-x-1">
          <button
            onClick={onSubmit}
            className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 rounded cursor-pointer text-gray-700 dark:text-slate-300 font-semibold"
          >
            확인
          </button>
          <button
            onClick={onCancel}
            className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 rounded cursor-pointer text-gray-700 dark:text-slate-300 font-semibold"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

export default TextItemInput
