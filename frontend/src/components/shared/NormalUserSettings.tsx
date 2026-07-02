import React from 'react'
import { AArrowDown, AArrowUp, Maximize2, Sun, Moon } from 'lucide-react'
import { useUserLocalSettingStore, FontSize, ContentWidth } from '@/store/useUserLocalSettingStore'

const NormalUserSettings: React.FC = () => {
  const { fontSize, contentWidth, setFontSize, setContentWidth } = useUserLocalSettingStore()

  const fontSizes: FontSize[] = ['sm', 'base', 'lg', 'xl']
  const contentWidths: ContentWidth[] = ['normal', 'wide', 'full']

  const handleDecreaseFont = () => {
    const idx = fontSizes.indexOf(fontSize)
    if (idx > 0) {
      setFontSize(fontSizes[idx - 1])
    }
  }

  const handleIncreaseFont = () => {
    const idx = fontSizes.indexOf(fontSize)
    if (idx < fontSizes.length - 1) {
      setFontSize(fontSizes[idx + 1])
    }
  }

  const handleCycleWidth = () => {
    const idx = contentWidths.indexOf(contentWidth)
    const nextIdx = (idx + 1) % contentWidths.length
    setContentWidth(contentWidths[nextIdx])
  }

  return (
    <div className="hidden md:flex items-center space-x-2 ml-4 border-l border-gray-200 pl-4 shrink-0 select-none">
      {/* 글자 크기 조절 (AArrowDown, AArrowUp 아이콘 적용) */}
      <div className="flex items-center h-8 bg-gray-50 border border-gray-200 rounded-md px-1.5 space-x-1">
        <button 
          onClick={handleDecreaseFont} 
          disabled={fontSize === 'sm'}
          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 cursor-pointer text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center"
          title="글자 크기 축소"
        >
          <AArrowDown className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-gray-400 font-semibold font-mono min-w-[24px] text-center">
          {fontSize.toUpperCase()}
        </span>
        <button 
          onClick={handleIncreaseFont} 
          disabled={fontSize === 'xl'}
          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 cursor-pointer text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center"
          title="글자 크기 확대"
        >
          <AArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* 본문 너비 조절 */}
      <button 
        onClick={handleCycleWidth}
        className="flex items-center h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-2.5 text-xs text-gray-700 cursor-pointer transition-colors"
        title="본문 가로 너비 전환"
      >
        <Maximize2 className="w-4 h-4 text-gray-500 mr-1.5" />
        <span className="font-semibold text-[11px]">
          폭: {contentWidth === 'normal' ? '보통' : contentWidth === 'wide' ? '넓게' : '꽉차게'}
        </span>
      </button>

      {/* 다크/라이트 모드 스위치 UI (단순 UI 검토용) */}
      <div className="flex items-center h-8 bg-gray-50 border border-gray-200 rounded-md px-2 space-x-1.5">
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <button
          type="button"
          className="relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-gray-300 bg-gray-200/50 focus:outline-none"
          title="테마 토글 스위치 (UI 검토용)"
        >
          <span className="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out translate-x-0" />
        </button>
        <Moon className="w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
  )
}

export default NormalUserSettings
