import React, { useState } from 'react'
import { extractYouTubeId } from '@/utils/youtube'

interface ManualVideoCardProps {
  src: string
  alt?: string
}

const ManualVideoCard: React.FC<ManualVideoCardProps> = ({ src, alt }) => {
  const [isHidden, setIsHidden] = useState(true)

  const handleToggle = () => {
    setIsHidden(!isHidden)
  }

  const ytId = extractYouTubeId(src)

  return (
    <div className="manual-video-card bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 my-6 max-w-[1200px] mx-auto transition-all duration-300">
      <div className="manual-video-header flex items-center justify-between gap-3">
        <div className="manual-video-title flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
          {ytId ? (
            // 유튜브 로고 아이콘
            <svg 
              className="w-4.5 h-4.5 text-red-600 fill-current" 
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          ) : (
            // 일반 비디오 아이콘
            <svg
              className="w-4 h-4 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
          <span>{alt || '동영상'}</span>
        </div>
        <button
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
            isHidden
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
          }`}
        >
          {isHidden ? (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>동영상 보기</span>
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
              <span>동영상 숨기기</span>
            </>
          )}
        </button>
      </div>
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden bg-transparent rounded-lg mt-3 flex justify-center items-center ${
          isHidden ? 'max-h-0 opacity-0' : 'max-h-[700px] opacity-100'
        }`}
      >
        {!isHidden && (
          ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              className="w-full aspect-video rounded-lg border-none shadow-md"
              allowFullScreen
            />
          ) : (
            <video
              src={src}
              controls
              autoPlay
              className="w-auto max-w-full h-auto max-h-[700px] rounded-lg display-block outline-none shadow-md"
            />
          )
        )}
      </div>
    </div>
  )
}

export default ManualVideoCard
