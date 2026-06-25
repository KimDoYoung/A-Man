import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, UserCheck, LogOut } from 'lucide-react'
import axios from 'axios'

interface DocUserTopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const DocUserTopBar: React.FC<DocUserTopBarProps> = ({
  sidebarOpen,
  setSidebarOpen
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminAssetsPage = location.pathname === '/admin/assets'
  const [version, setVersion] = useState('0.0.1')

  useEffect(() => {
    axios.get('/aman/health')
      .then(res => {
        if (res.data && res.data.version) {
          setVersion(res.data.version)
        }
      })
      .catch(err => {
        console.error('버전 정보 조회 실패:', err)
      })
  }, [])

  // Get logged-in user information
  const userStr = localStorage.getItem('aman_user')
  const user = userStr ? JSON.parse(userStr) : null
  const displayName = user ? `${user.name} (${user.username})` : '관리자'

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return
    try {
      await axios.post('/aman/auth/logout')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    } finally {
      localStorage.removeItem('aman_user')
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="h-14 bg-gray-700 text-white px-6 flex items-center justify-between border-b border-gray-800 shrink-0 select-none">
      {/* 좌측 토글 및 로고 타이틀 */}
      <div className="flex items-center space-x-3">
        {!isAdminAssetsPage && (
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 transition-colors cursor-pointer"
            title="메뉴 영역 토글"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-2">
          <span 
            className="text-sm font-semibold tracking-wider px-2 py-0.5 bg-indigo-600 rounded text-indigo-50 cursor-pointer"
            onClick={() => navigate('/admin')}
            title="문서 편집으로 이동"
          >
            A-Man ({version})
          </span>
          <button
            onClick={() => navigate(isAdminAssetsPage ? '/admin' : '/admin/assets')}
            className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-md transition-all cursor-pointer text-[11px] font-bold"
            title={isAdminAssetsPage ? '문서 편집 화면으로 이동' : '공통 자산 관리 화면으로 이동'}
          >
            {isAdminAssetsPage ? '문서 편집' : '자산 관리'}
          </button>
        </div>
      </div>
      
      {/* 우측 로그인 사용자 정보 및 로그아웃 */}
      <div className="flex items-center space-x-4 text-xs font-semibold">
        <div className="flex items-center space-x-1.5 text-gray-300">
          <UserCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-medium">{displayName}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-1 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-all cursor-pointer"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  )
}

export default DocUserTopBar
