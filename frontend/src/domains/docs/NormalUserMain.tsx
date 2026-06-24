import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { ArrowUp, Pin } from 'lucide-react'
import { OutletContextType, TocItem } from '@/types'
import FolderTree from '@/components/shared/FolderTree'
import NormalUserTopBar from '@/components/shared/NormalUserTopBar'

const NormalUserMain: React.FC = () => {
  // 레이아웃 인터랙션 상태
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tocOpen, setTocOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const [showTopBtn, setShowTopBtn] = useState(false)
  
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

  // 탑 버튼 스크롤 핸들링
  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.pageYOffset > 200)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 flex flex-col font-sans select-none antialiased">
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
        {sidebarOpen && (
          <aside 
            className="bg-white p-4 shrink-0 flex flex-col overflow-hidden border-r border-gray-200 transition-all duration-75"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* FolderTree 컴포넌트 마운트 */}
            <FolderTree contextMenuEnable={false} />
          </aside>
        )}

        {/* 2.2 사이드바 폭 드래그 리사이저 */}
        {sidebarOpen && (
          <div 
            className={`w-1 cursor-col-resize hover:bg-indigo-500 active:bg-indigo-600 border-r border-gray-200 transition-colors shrink-0 flex items-center justify-center ${
              isResizing ? 'bg-indigo-500' : 'bg-transparent'
            }`}
            onMouseDown={startResize}
          >
            <div className="w-0.5 h-4 bg-gray-300 rounded-sm"></div>
          </div>
        )}

        {/* 2.3 메인 본문 콘텐츠 및 우측 목차 감싸기 */}
        <div className="flex-1 flex items-start overflow-y-auto relative bg-white">
          <main className="flex-1 p-8 lg:p-12 min-h-full">
            {/* 서브 라우트(Outlet) 렌더링. 목차 상태 및 Setter 제공 */}
            <Outlet context={{ setTocData, tocOpen, setTocOpen } as OutletContextType} />
          </main>

          {/* 2.4 우측 목차 사이드바 (TOC) */}
          {tocOpen && tocData.length > 0 && (
            <aside className="w-64 bg-white border-l border-gray-200 p-4 shrink-0 flex flex-col h-full sticky top-0 z-40">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3 shrink-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">이 페이지의 목차</p>
                <button 
                  onClick={() => setTocOpen(false)}
                  className="p-1 rounded-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                  title="목차 감추기"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 목차 리스트 */}
              <ul className="space-y-1.5 overflow-y-auto flex-1 text-xs text-gray-500 custom-scroll pr-1 select-none">
                {tocData.map((item, idx) => (
                  <li 
                    key={idx}
                    className={`hover:text-gray-900 py-0.5 cursor-pointer transition-colors ${
                      item.level === 1 ? 'font-semibold text-gray-800' : 'pl-3'
                    }`}
                    onClick={() => {
                      const element = document.getElementById(item.id)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' })
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

      {/* 3. 탑 플로팅 버튼 */}
      {showTopBtn && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all border border-indigo-500 cursor-pointer animate-bounce"
          title="맨 위로 스크롤"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default NormalUserMain
