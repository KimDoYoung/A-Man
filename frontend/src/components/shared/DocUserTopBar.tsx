import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, UserCheck, LogOut, Info, HelpCircle } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { useRecentPagesStore } from '@/store/useRecentPagesStore'
import ProfileEditModal from './ProfileEditModal'

interface DocUserTopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const formatRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '방금 전'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

const DocUserTopBar: React.FC<DocUserTopBarProps> = ({
  sidebarOpen,
  setSidebarOpen
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminAssetsPage = location.pathname === '/admin/assets'
  const isAdminUsersPage = location.pathname === '/admin/users'
  const isAdminFoldersPage = location.pathname === '/admin/folders'
  const isAdminSettingsPage = location.pathname === '/admin/settings'
  const isAdminAboutPage = location.pathname === '/admin/about'
  const isDocEditPage = location.pathname === '/admin' || 
    (location.pathname.startsWith('/admin/') && 
     !location.pathname.startsWith('/admin/assets') && 
     !location.pathname.startsWith('/admin/users') && 
     !location.pathname.startsWith('/admin/folders') &&
     !location.pathname.startsWith('/admin/settings') &&
     !location.pathname.startsWith('/admin/about'))
  const [version, setVersion] = useState('0.0.1')

  // Recent Pages Modal States
  const [isRecentPagesOpen, setIsRecentPagesOpen] = useState(false)
  const { recentPages, fetchRecentPages, removePage, clearPages } = useRecentPagesStore()

  useEffect(() => {
    if (isRecentPagesOpen) {
      fetchRecentPages()
    }
  }, [isRecentPagesOpen, fetchRecentPages])

  // Profile Edit Modal States
  const [isProfileOpen, setIsProfileOpen] = useState(false)

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
            onClick={() => navigate('/admin')}
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
          <button
            onClick={() => navigate('/admin')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-bold border ${
              isDocEditPage 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
            }`}
            title="문서 편집 화면으로 이동"
          >
            문서 편집
          </button>
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
          <button
            onClick={() => setIsRecentPagesOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-md transition-all cursor-pointer text-[11px] font-bold"
            title="최근 작업 문서 이력 보기"
          >
            작업이력
          </button>
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
      {isRecentPagesOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[999] transition-all duration-300">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-2xl border border-slate-100 text-slate-800 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150 mb-4">
              <h3 className="text-base font-bold text-slate-950 flex items-center">
                <span className="mr-2">⏱️</span> 최근 작업 문서 이력 (최근 10개)
              </h3>
              <button 
                onClick={() => setIsRecentPagesOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            {recentPages.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm font-medium">
                최근 작업(저장)한 문서 이력이 없습니다.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scroll mb-4 border border-gray-250 rounded-md">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-2 text-center w-24">폴더 번호</th>
                        <th className="px-4 py-2">메뉴/폴더명</th>
                        <th className="px-4 py-2 w-28 text-center">작업 시간</th>
                        <th className="px-4 py-2 text-center w-28">동작</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPages.map((page) => (
                        <tr key={page.id} className="border-b border-gray-150 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-center text-slate-500 font-bold">
                            {page.nums || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-semibold">
                            {page.name}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-center font-medium">
                            {formatRelativeTime(page.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-center flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                navigate(`/admin/folder/${page.id}`);
                                setIsRecentPagesOpen(false);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-sm cursor-pointer transition-colors"
                            >
                              이동
                            </button>
                            <button
                              onClick={() => removePage(page.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-sm cursor-pointer transition-colors"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-gray-150 pt-3">
                  <button
                    onClick={() => {
                      if (confirm('모든 작업 이력을 삭제하시겠습니까?')) {
                        clearPages();
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-md transition-colors cursor-pointer"
                  >
                    이력 전체 비우기
                  </button>
                  <button
                    onClick={() => setIsRecentPagesOpen(false)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default DocUserTopBar
