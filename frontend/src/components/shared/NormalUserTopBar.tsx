import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, BookOpen, Pin, Key } from 'lucide-react'

interface NormalUserTopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  tocOpen: boolean;
  setTocOpen: (open: boolean) => void;
}

const NormalUserTopBar: React.FC<NormalUserTopBarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  tocOpen,
  setTocOpen
}) => {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-xs shrink-0">
      <div className="flex items-center space-x-3">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/docs')}>
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span className="text-base font-bold tracking-tight">
            AssetERP <span className="text-indigo-600">Docs</span>
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-sm">
          Public Manual API
        </span>
        {/* 어드민으로 이동 */}
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-all cursor-pointer"
          title="관리자 모드로 이동"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>

        {!tocOpen && (
          <button 
            onClick={() => setTocOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-all cursor-pointer"
            title="목차 열기"
          >
            <Pin className="w-3.5 h-3.5" />
            <span>목차 보기</span>
          </button>
        )}
      </div>
    </header>
  )
}

export default NormalUserTopBar
