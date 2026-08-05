import React, { useState } from 'react'

interface ManualVideoCardProps {
  src: string
  alt?: string
}

const ManualVideoCard: React.FC<ManualVideoCardProps> = ({ src, alt }) => {
  const [isHidden, setIsHidden] = useState(true)

  const handleToggle = () => {
    setIsHidden(!isHidden)
  }

  const getYouTubeVideoId = (url: string) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const ytId = getYouTubeVideoId(src)

  return (
    <div className="manual-video-card bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 my-6 transition-all duration-300">
      <div className="manual-video-header flex items-center justify-between gap-3">
        <div className="manual-video-title flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
          {ytId ? (
            // 유튜브 로고 아이콘
            <svg 
              className="w-4.5 h-4.5 text-red-600 fill-current" 
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.163c-.272-1.02-.1.272-1.02-1.02-2.31 0-4.62-.272-1.02-1.02-2.31 0-4.62 0-6.93 0s-4.62 0-6.93 0c-1.02 0-2.31 0-4.62.272-1.02.272-1.02.272-1.02 1.02-.272 1.02-.272 2.1-.272 3.19s0 2.17.272 3.19c.272 1.02.272 1.02 1.02 1.02 2.31.272 4.62.272 6.93.272s4.62 0 6.93-.272c1.02 0 1.02 0 1.02-1.02.272-1.02.272-2.1.272-3.19s-.026-2.17-.272-3.19zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
          isHidden ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
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
              className="w-auto max-w-full h-auto max-h-[480px] rounded-lg display-block outline-none shadow-md"
            />
          )
        )}
      </div>
    </div>
  )
}

export default ManualVideoCard
