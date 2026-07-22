import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, UserCheck, LogOut, Info, HelpCircle } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import ProfileEditModal from './ProfileEditModal'
import RecentPagesModal from './RecentPagesModal'

interface DocUserTopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onOpenImageEditor?: () => void;
  isImageEditorOpen?: boolean;
  onCloseImageEditor?: () => void;
}

const DocUserTopBar: React.FC<DocUserTopBarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  onOpenImageEditor,
  isImageEditorOpen,
  onCloseImageEditor
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminAssetsPage = location.pathname === '/admin/assets'
  const isAdminUsersPage = location.pathname === '/admin/users'
  const isAdminFoldersPage = location.pathname === '/admin/folders'
  const isAdminPagesPage = location.pathname === '/admin/pages'
  const isAdminSettingsPage = location.pathname === '/admin/settings'
  const isAdminBackupPage = location.pathname === '/admin/backup'
  const isAdminLogsPage = location.pathname === '/admin/logs'
  const isAdminAboutPage = location.pathname === '/admin/about'
  const isDocEditPage = location.pathname === '/admin' || 
    (location.pathname.startsWith('/admin/') && 
     !location.pathname.startsWith('/admin/assets') && 
     !location.pathname.startsWith('/admin/users') && 
     !location.pathname.startsWith('/admin/folders') &&
     !location.pathname.startsWith('/admin/pages') &&
     !location.pathname.startsWith('/admin/settings') &&
     !location.pathname.startsWith('/admin/backup') &&
     !location.pathname.startsWith('/admin/logs') &&
     !location.pathname.startsWith('/admin/about'))
  const [version, setVersion] = useState('0.0.1')

  // Recent Pages Modal States
  const [isRecentPagesOpen, setIsRecentPagesOpen] = useState(false)

  // Profile Edit Modal States
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // 핫키 바인딩 (Alt + H: 작업이력 토글, ESC: 모달 닫기)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltOnly = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
      
      if (isAltOnly && e.key.toLowerCase() === 'h' && !isImageEditorOpen) {
        e.preventDefault();
        setIsRecentPagesOpen((prev) => !prev);
      }
      
      if (e.key === 'Escape') {
        setIsRecentPagesOpen(false);
        setIsProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageEditorOpen]);

  useEffect(() => {
    apiClient.get<any>('/health')
      .then(data => {
        if (data && data.version) {
          setVersion(data.version)
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
      await apiClient.post('/auth/logout')
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
        {!isAdminAssetsPage && !isAdminUsersPage && (
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 transition-colors cursor-pointer"
            title="메뉴 영역 토글(F4)"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-2">
          <span 
            className="text-sm font-semibold tracking-wider px-2 py-0.5 bg-indigo-600 rounded text-indigo-50 cursor-pointer"
            onClick={() => {
              if (onCloseImageEditor) onCloseImageEditor()
              const lastFolderId = localStorage.getItem('aman_last_active_folder_id')
              if (lastFolderId) {
                navigate(`/admin/folder/${lastFolderId}`)
              } else {
                navigate('/admin')
              }
            }}
            title="문서 편집으로 이동"
          >
            A-Man ({version})
          </span>
          <button
            onClick={() => navigate('/docs')}
            className="flex items-center space-x-1 px-2.5 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 rounded-md transition-all cursor-pointer text-[11px] font-bold"
            title="도움말 홈 화면으로 이동"
          >
            홈으로
          </button>
          {user?.role !== 'admin' && (
            <>
              <button
                onClick={() => {
                  if (onCloseImageEditor) onCloseImageEditor()
                  const lastFolderId = localStorage.getItem('aman_last_active_folder_id')
                  if (lastFolderId) {
                    navigate(`/admin/folder/${lastFolderId}`)
                  } else {
                    navigate('/admin')
                  }
                }}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                  isDocEditPage && !isImageEditorOpen
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                }`}
                title="문서 편집 화면으로 이동"
              >
                문서 편집
              </button>
              {onOpenImageEditor && isDocEditPage && (
                <button
                  onClick={isImageEditorOpen ? onCloseImageEditor : onOpenImageEditor}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border shadow-xs ${
                    isImageEditorOpen
                      ? 'bg-pink-600 text-white border-pink-600 hover:bg-pink-700' 
                      : 'bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20'
                  }`}
                  title={isImageEditorOpen ? "도움말 편집 화면으로 복귀" : "도움말 가이드용 이미지 편집기 열기"}
                >
                  이미지 편집
                </button>
              )}
            </>
          )}          
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => navigate('/admin/assets')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                  isAdminAssetsPage 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                }`}
                title="공통 자산 관리 화면으로 이동"
              >
                자산 관리
              </button>
              <button
                onClick={() => navigate('/admin/folders')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                  isAdminFoldersPage 
                    ? 'bg-amber-600 text-white border-amber-600' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                }`}
                title="메뉴 폴더 구조 관리 화면으로 이동"
              >
                메뉴 관리
              </button>
            </>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/pages')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                isAdminPagesPage 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
              }`}
              title="도움말 페이지 관리 화면으로 이동"
            >
              페이지 관리
            </button>
          )}
          {user?.role !== 'admin' && !isImageEditorOpen && (
            <button
              onClick={() => setIsRecentPagesOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-md transition-all cursor-pointer text-[11px] font-bold"
              title="최근 작업 문서 이력 보기 (Alt + H)"
            >
              작업이력
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/users')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                isAdminUsersPage 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
              title="사용자 계정 관리 화면으로 이동"
            >
              사용자 관리
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/settings')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                isAdminSettingsPage 
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
              }`}
              title="시스템 환경 설정 화면으로 이동"
            >
              설정
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/backup')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                isAdminBackupPage 
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
              }`}
              title="시스템 백업 관리 화면으로 이동"
            >
              백업 관리
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/logs')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
                isAdminLogsPage 
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
              }`}
              title="시스템 로그 조회 화면으로 이동"
            >
              로그 조회
            </button>
          )}
        </div>
      </div>
      
      {/* 우측 로그인 사용자 정보 및 로그아웃 */}
      <div className="flex items-center space-x-4 text-xs font-semibold">
        <button
          onClick={() => navigate('/admin/about')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs font-bold border ${
            isAdminAboutPage 
              ? 'bg-sky-600 text-white border-sky-600' 
              : 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20'
          }`}
          title="시스템 정보 (About)"
        >
          <Info className="w-3.5 h-3.5" />
          <span>About</span>
        </button>
        <button
          onClick={() => window.open('/aman/manual/help', '_blank')}
          className="flex items-center space-x-1 px-2.5 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 rounded-md transition-all cursor-pointer text-xs font-bold"
          title="문서 작성자 도움말 (Help)"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help</span>
        </button>
        <button 
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center space-x-1.5 text-gray-300 hover:text-white transition-colors cursor-pointer group"
          title="개인정보 변경"
        >
          <UserCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
          <span className="font-medium border-b border-dashed border-gray-400 group-hover:border-white">{displayName}</span>
        </button>        
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-1 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-all cursor-pointer"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />

      {/* 최근 작업 문서 (UserWorkStack) 모달 */}
      <RecentPagesModal 
        isOpen={isRecentPagesOpen} 
        onClose={() => setIsRecentPagesOpen(false)} 
      />
    </header>
  )
}

export default DocUserTopBar
