import React from 'react'
import { Eye, EyeOff, Bold, Code, List, ListOrdered, Link, Image } from 'lucide-react'

interface EditorToolbarProps {
  insertMarkdown: (prefix: string, suffix?: string) => void
  insertLink: () => void
  insertBullet: () => void
  insertNumber: () => void
  selectAndUploadImage: () => void
  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  insertMarkdown,
  insertLink,
  insertBullet,
  insertNumber,
  selectAndUploadImage,
  previewOpen,
  setPreviewOpen
}) => {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-gray-500 shrink-0 select-none">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => insertMarkdown('# ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-2 cursor-pointer"
          title="H1 헤더 추가"
        >
          H1
        </button>
        <button
          onClick={() => insertMarkdown('## ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-2 cursor-pointer"
          title="H2 헤더 추가"
        >
          H2
        </button>
        <button
          onClick={() => insertMarkdown('### ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-2 cursor-pointer"
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
      </div>

      {/* 미리보기 토글 */}
      <button
        onClick={() => setPreviewOpen(!previewOpen)}
        className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-600 flex items-center space-x-1 cursor-pointer"
      >
        {previewOpen ? (
          <>
            <EyeOff className="w-3.5 h-3.5" />
            <span>미리보기 숨기기</span>
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" />
            <span>미리보기 보이기</span>
          </>
        )}
      </button>
    </div>
  )
}

export default EditorToolbar
