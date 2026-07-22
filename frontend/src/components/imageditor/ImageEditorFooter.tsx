import React from 'react'
import { Save, Download, Copy, Check, Upload, RotateCcw } from 'lucide-react'

interface ImageEditorFooterProps {
  bgImage: HTMLImageElement | null
  savingWork: boolean
  isDirty: boolean
  insertingImage: boolean
  generatedImageUrl: string
  onUploadClick: () => void
  onReset: () => void
  onSaveToHistory: () => void
  onGenerateUrl: () => void
  onCopyUrl: () => void
  onCopyMarkdown: () => void
  onDownload: () => void
  onCopyClipboard: () => void
}

const ImageEditorFooter: React.FC<ImageEditorFooterProps> = ({
  bgImage,
  savingWork,
  isDirty,
  insertingImage,
  generatedImageUrl,
  onUploadClick,
  onReset,
  onSaveToHistory,
  onGenerateUrl,
  onCopyUrl,
  onCopyMarkdown,
  onDownload,
  onCopyClipboard
}) => {
  return (
    <div className="h-16 border-t border-gray-200 dark:border-slate-800 px-6 flex items-center justify-between bg-gray-50 dark:bg-slate-950 shrink-0">
      <div className="flex items-center space-x-2">
        <button
          onClick={onUploadClick}
          className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>새 이미지 업로드</span>
        </button>
        {bgImage && (
          <>
            <button
              onClick={onReset}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 rounded-md text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
              title="모든 도화지와 작업을 완전히 비우고 초기 화면으로 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
            <button
              onClick={onSaveToHistory}
              disabled={savingWork || !isDirty}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="변경사항이 있을 때만 임시저장 활성화(ctrl+s)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingWork ? '저장 중...' : '임시 저장'}</span>
            </button>

            <button
              onClick={onGenerateUrl}
              disabled={insertingImage || isDirty || !bgImage || generatedImageUrl !== ''}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 text-white border border-indigo-700 disabled:border-transparent rounded-md text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all disabled:cursor-not-allowed"
              title={generatedImageUrl ? "이미 완성본 URL이 존재합니다." : "임시저장을 완료하여 변경사항이 없을 때 활성화"}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{insertingImage ? '업로드 중...' : '저장 및 URL 획득'}</span>
            </button>
          </>
        )}

        {/* 생성된 URL 표시창 영역 */}
        {generatedImageUrl && (
          <div className="flex items-center space-x-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 px-2 py-1 rounded ml-3 shrink-0 animate-in fade-in duration-200">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold shrink-0">URL:</span>
            <input
              type="text"
              readOnly
              value={generatedImageUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="text-[11px] font-mono bg-transparent border-0 text-indigo-650 dark:text-indigo-400 w-[360px] focus:outline-hidden"
              title="클릭하여 전체 선택"
            />
            <button
              onClick={onCopyUrl}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 rounded text-[10px] text-gray-600 dark:text-slate-300 font-bold cursor-pointer transition-colors"
              title="순수 이미지 URL 주소 복사"
            >
              주소 복사
            </button>
            <button
              onClick={onCopyMarkdown}
              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
              title="마크다운 이미지 태그(![image](url)) 포맷으로 복사"
            >
              마크다운 복사
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {bgImage && (
          <>
            <button
              onClick={onDownload}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드</span>
            </button>
            <button
              onClick={onCopyClipboard}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
              title="클립보드 복사"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>클립보드 복사</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ImageEditorFooter
