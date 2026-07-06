import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Pin } from 'lucide-react'
import { OutletContextType, TocItem } from '@/types'
import FolderTree from '@/components/shared/FolderTree'
import NormalUserTopBar from '@/components/shared/NormalUserTopBar'
import ScrollToTopButton from '@/components/shared/ScrollToTopButton'
import { useUserLocalSettingStore } from '@/store/useUserLocalSettingStore'

const NormalUserMain: React.FC = () => {
  const theme = useUserLocalSettingStore((state) => state.theme)
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement>(null)

  // 페이지 이동 시 메인 콘텐츠 영역 스크롤 최상단 리셋
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0
    }
  }, [location.pathname])
  // 레이아웃 인터랙션 상태
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tocOpen, setTocOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  
  // 데이터 피드백 상태
  const [tocData, setTocData] = useState<TocItem[]>([])

  // 리사이징 드래그 핸들링
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      // 사이드바 너비를 180px ~ 500px 사이로 제어
      const newWidth = Math.max(180, Math.min(e.clientX, 500))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])



  // 테마 동적 주입 및 언마운트 시 클린업 (라이트 모드로 원복하여 /admin 등에 영향 배제)
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="bg-gray-50 dark:bg-slate-950 h-screen text-gray-900 dark:text-slate-100 flex flex-col font-sans select-none antialiased overflow-hidden">
      {/* 1. Header 영역 */}
      <NormalUserTopBar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        tocOpen={tocOpen}
        setTocOpen={setTocOpen}
      />

      {/* 2. 바디 콘텐츠 컨테이너 */}
      <div className="flex-1 flex items-stretch overflow-hidden">
        
        {/* 2.1 왼쪽 사이드바 (3depth 아코디언 트리) */}
        <aside 
          className={`bg-white dark:bg-slate-900 p-4 shrink-0 flex flex-col overflow-hidden border-r border-gray-200 dark:border-slate-800 transition-all duration-75 ${
            sidebarOpen ? '' : 'hidden'
          }`}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* FolderTree 컴포넌트 마운트 */}
          <FolderTree contextMenuEnable={false} isDocUser={false} />
        </aside>

        {/* 2.2 사이드바 폭 드래그 리사이저 */}
        <div 
          className={`w-1 cursor-col-resize hover:bg-indigo-500 active:bg-indigo-600 border-r border-gray-200 dark:border-slate-800 transition-colors shrink-0 flex items-center justify-center ${
            sidebarOpen ? '' : 'hidden'
          } ${isResizing ? 'bg-indigo-500' : 'bg-transparent'}`}
          onMouseDown={startResize}
        >
          <div className="w-0.5 h-4 bg-gray-300 dark:bg-slate-700 rounded-sm"></div>
        </div>

        <div 
          ref={contentScrollRef}
          className="flex-1 flex items-start overflow-y-auto relative bg-white dark:bg-slate-900"
        >
          <main className="flex-1 py-8 px-4 lg:py-12 lg:px-6 min-h-full">
            {/* 서브 라우트(Outlet) 렌더링. 목차 상태 및 Setter 제공 */}
            <Outlet context={{ setTocData, tocOpen, setTocOpen } as OutletContextType} />
          </main>

          {/* 2.4 우측 목차 사이드바 (TOC) */}
          {tocOpen && tocData.length > 0 && (
            <aside 
              className="w-64 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 p-4 shrink-0 flex flex-col sticky z-40"
              style={{ top: '72px', maxHeight: 'calc(100vh - 90px)' }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800 mb-3 shrink-0">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">이 페이지의 목차</p>
                <button 
                  onClick={() => setTocOpen(false)}
                  className="p-1 rounded-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                  title="목차 감추기"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 목차 리스트 */}
              <ul className="space-y-1.5 overflow-y-auto flex-1 text-xs text-gray-500 dark:text-slate-400 custom-scroll pr-1 select-none">
                {tocData.map((item, idx) => (
                  <li 
                    key={idx}
                    className={`hover:text-gray-900 dark:hover:text-slate-200 py-0.5 cursor-pointer transition-colors ${
                      item.level === 1 || item.level === 2 ? 'font-semibold text-gray-800 dark:text-slate-300' : 'pl-3'
                    }`}
                    onClick={() => {
                      const element = document.getElementById(item.id)
                      const container = contentScrollRef.current
                      if (element && container) {
                        const containerRect = container.getBoundingClientRect()
                        const elementRect = element.getBoundingClientRect()
                        const relativeTop = elementRect.top - containerRect.top + container.scrollTop
                        
                        container.scrollTo({
                          top: relativeTop - 20, // 상단 탑바와 여백을 고려한 오프셋
                          behavior: 'smooth'
                        })
                      }
                    }}
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

      </div>

      {/* 3. 탑 플로팅 버튼 (우측 하단 - 본문 뷰어 영역 기준) */}
      <ScrollToTopButton 
        scrollContainerRef={contentScrollRef}
        position={{ right: (tocOpen && tocData.length > 0) ? '280px' : '24px' }}
      />

      {/* 4. 탑 플로팅 버튼 (좌측 하단 - 본문 뷰어 영역 기준) */}
      <ScrollToTopButton 
        scrollContainerRef={contentScrollRef}
        position={{ left: sidebarOpen ? `${sidebarWidth + 24}px` : '24px' }}
      />
    </div>
  )
}

export default NormalUserMain
