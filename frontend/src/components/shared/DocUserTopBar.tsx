import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, UserCheck, LogOut, Info, HelpCircle } from 'lucide-react'
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

  // Profile Edit Modal States
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileData, setProfileData] = useState<{ id: number; username: string; name: string; email: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

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

  // Load profile dynamically when the modal opens
  useEffect(() => {
    if (isProfileOpen) {
      setModalLoading(true)
      setErrorMsg('')
      setSuccessMsg('')
      setPassword('')
      setConfirmPassword('')
      axios.get('/aman/user/me')
        .then(res => {
          setProfileData(res.data)
          setEmail(res.data.email || '')
        })
        .catch(err => {
          console.error('내 프로필 정보 조회 실패:', err)
          setErrorMsg('프로필 정보를 가져오지 못했습니다.')
        })
        .finally(() => {
          setModalLoading(false)
        })
    }
  }, [isProfileOpen])

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileData) return

    setErrorMsg('')
    setSuccessMsg('')

    const emailTrimmed = email.trim()
    if (!emailTrimmed) {
      setErrorMsg('이메일을 입력해 주세요.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(emailTrimmed)) {
      setErrorMsg('올바른 이메일 형식이 아닙니다.')
      return
    }

    const payload: any = {}
    if (emailTrimmed !== profileData.email) {
      payload.email = emailTrimmed
    }

    if (password) {
      if (password.length < 4) {
        setErrorMsg('비밀번호는 최소 4자 이상이어야 합니다.')
        return
      }
      if (password !== confirmPassword) {
        setErrorMsg('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.')
        return
      }
      payload.password = password
    }

    if (Object.keys(payload).length === 0) {
      setErrorMsg('수정된 정보가 없습니다.')
      return
    }

    try {
      setModalLoading(true)
      const res = await axios.patch(`/aman/user/${profileData.id}`, payload)
      
      // Update localStorage to reflect email change
      if (user) {
        const updatedUser = { ...user, email: res.data.email }
        localStorage.setItem('aman_user', JSON.stringify(updatedUser))
      }

      setSuccessMsg('개인정보가 성공적으로 변경되었습니다.')
      setTimeout(() => {
        setIsProfileOpen(false)
      }, 1500)
    } catch (err: any) {
      console.error('프로필 변경 실패:', err)
      setErrorMsg(err.response?.data || '개인정보 변경 중 오류가 발생했습니다.')
    } finally {
      setModalLoading(false)
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
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center space-x-1.5 text-gray-300 hover:text-white transition-colors cursor-pointer group"
          title="개인정보 변경"
        >
          <UserCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
          <span className="font-medium border-b border-dashed border-gray-400 group-hover:border-white">{displayName}</span>
        </button>
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
          onClick={handleLogout}
          className="flex items-center space-x-1 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-all cursor-pointer"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>

      {/* Profile Edit Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsProfileOpen(false)}
          />
          
          {/* Content */}
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform transition-all text-slate-800">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-500" />
                개인정보 변경
              </h3>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-semibold">
                  {successMsg}
                </div>
              )}
              
              {modalLoading && !profileData ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500 font-medium">사용자 정보를 불러오는 중...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">아이디</label>
                      <input 
                        type="text" 
                        value={profileData?.username || ''} 
                        disabled 
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">이름</label>
                      <input 
                        type="text" 
                        value={profileData?.name || ''} 
                        disabled 
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-slate-600 mb-1 text-xs font-semibold">이메일</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                      placeholder="example@kfs.co.kr"
                    />
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <span className="block text-[11px] text-slate-400 font-semibold mb-2">
                      ※ 비밀번호를 변경하지 않으려면 공란으로 두세요 (이메일만 변경됩니다).
                    </span>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-600 mb-1 text-xs font-semibold">새 비밀번호</label>
                        <input 
                          type="password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                          placeholder="새 비밀번호 입력 (4자 이상)"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 text-xs font-semibold">새 비밀번호 확인</label>
                        <input 
                          type="password" 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                          placeholder="새 비밀번호 확인"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end space-x-2">
                    <button 
                      type="button" 
                      onClick={() => setIsProfileOpen(false)}
                      disabled={modalLoading}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                    <button 
                      type="submit" 
                      disabled={modalLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {modalLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      저장
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </header>
  )
}

export default DocUserTopBar
