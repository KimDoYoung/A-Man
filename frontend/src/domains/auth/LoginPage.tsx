import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, AlertCircle } from 'lucide-react'
import axios from 'axios'
import favicon from '@/assets/aman-favicon.png'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해 주세요.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const response = await axios.post('/aman/auth/login', {
        username,
        password
      })

      // 로그인 성공 시 사용자 정보 저장
      localStorage.setItem('aman_user', JSON.stringify(response.data))
      
      // 관리자 메인 화면으로 이동
      navigate('/admin', { replace: true })
    } catch (error: any) {
      console.error('로그인 오류:', error)
      if (error.response && error.response.status === 401) {
        setErrorMsg(error.response.data || '아이디 또는 비밀번호가 일치하지 않습니다.')
      } else {
        setErrorMsg('로그인 처리 중 서버 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased font-sans select-none">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
        
        {/* 로고 & 상단 헤더 */}
        <div className="flex flex-col items-center space-y-3 mb-8">
          <img src={favicon} alt="A-Man Logo" className="w-14 h-14 object-contain rounded-xl shadow-xs" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            AssetERP <span className="text-indigo-600">Manual</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            도움말 및 매뉴얼 통합 관리 시스템
          </p>
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 flex items-center space-x-2 text-red-650 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* 아이디 필드 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition-all font-medium placeholder-slate-400"
                disabled={loading}
              />
            </div>
          </div>

          {/* 비밀번호 필드 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition-all font-medium placeholder-slate-400"
                disabled={loading}
              />
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-semibold tracking-wide shadow-md shadow-indigo-500/10 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-b-2 border-b-white"></div>
                <span>로그인 중...</span>
              </>
            ) : (
              <span>로그인</span>
            )}
          </button>
        </form>

        {/* 푸터 */}
        <div className="mt-8 text-center border-t border-slate-100 pt-4">
          <p className="text-[10px] text-slate-400 font-medium">
            © 2026 KFS Co., Ltd. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  )
}

export default LoginPage
