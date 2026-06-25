import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Bold, Code, List, ListOrdered, Link, Image, Smile } from 'lucide-react'

const EMOJIS = [
  '‼️', '❗', '✔️', '🚩', '➡️', '📝', '▶️', '🔴', '🔷', '🔵', 
  '👉', '🚫', '❓', '💡', '🔥', '✨', '🎉', '📌', '⚠️', '✅', 
  '❌', '💬', '😀', '😃', '👍', '✒️​', '📌​', '❤️​',
  '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'
]

interface EditorToolbarProps {
  insertMarkdown: (prefix: string, suffix?: string) => void
  insertLink: () => void
  insertBullet: () => void
  insertNumber: () => void
  selectAndUploadImage: () => void
  aka: string
  onAkaChange: (value: string) => void
  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  insertMarkdown,
  insertLink,
  insertBullet,
  insertNumber,
  selectAndUploadImage,
  aka,
  onAkaChange,
  previewOpen,
  setPreviewOpen
}) => {
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(event.target as Node)) {
        setEmojiOpen(false)
      }
    }
    if (emojiOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [emojiOpen])
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-gray-500 shrink-0 select-none">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => insertMarkdown('# ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-1 cursor-pointer"
          title="H1 헤더 추가"
        >
          H1
        </button>
        <button
          onClick={() => insertMarkdown('## ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-1 cursor-pointer"
          title="H2 헤더 추가"
        >
          H2
        </button>
        <button
          onClick={() => insertMarkdown('### ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-1 cursor-pointer"
          title="H3 헤더 추가"
        >
          H3
        </button>
        <span className="w-px h-3.5 bg-gray-300"></span>
        <button
          onClick={() => insertMarkdown('**', '**')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="굵게"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertMarkdown('`', '`')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="인라인 코드"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-3.5 bg-gray-300"></span>
        <button
          onClick={insertBullet}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="글머리 기호 (Ctrl+0)"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={insertNumber}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="번호 매기기 (Ctrl+9)"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={insertLink}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="링크 삽입 (Ctrl+L)"
        >
          <Link className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={selectAndUploadImage}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="이미지 업로드 및 삽입"
        >
          <Image className="w-3.5 h-3.5" />
        </button>
        <div className="relative" ref={emojiPanelRef}>
          <button
            onClick={() => setEmojiOpen(!emojiOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer ${emojiOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}`}
            title="이모지 삽입"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          {emojiOpen && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg grid grid-cols-8 gap-1 w-48 z-50">
              {EMOJIS.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => {
                    insertMarkdown(emoji)
                    setEmojiOpen(false)
                  }}
                  className="w-5.5 h-5.5 flex items-center justify-center text-base hover:bg-gray-100 rounded transition-colors cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 별칭 AKA 입력창 */}
      <div className="flex items-center space-x-1.5 ml-auto mr-4">
        <span className="text-[10px] font-semibold text-gray-400">별칭(AKA):</span>
        <input
          type="text"
          value={aka || ''}
          onChange={(e) => onAkaChange(e.target.value)}
          placeholder="예: 1110"
          className="w-24 px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded focus:outline-hidden focus:border-indigo-500 font-mono text-gray-800"
          title="이 페이지의 별칭을 지정합니다 (예: 1110 입력 시 /aman/manual/1110 으로 접근 가능)"
        />
      </div>

      {/* 미리보기 토글 */}
      <button
        onClick={() => setPreviewOpen(!previewOpen)}
        className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-600 flex items-center space-x-1 cursor-pointer"
      >
        {previewOpen ? (
          <>
            <EyeOff className="w-3.5 h-3.5" />
            <span>숨기기</span>
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" />
            <span>보이기</span>
          </>
        )}
      </button>
    </div>
  )
}

export default EditorToolbar
