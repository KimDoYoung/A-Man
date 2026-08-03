import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import favicon from '@/assets/aman-favicon.png'

const SessionExpireWarning: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased font-sans select-none">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center">
        
        {/* 상단 헤더 & 히든 백도어 로고 */}
        <div className="flex flex-col items-center space-y-4 mb-6">
          {/* 클릭 시 조용히 로그인으로 가는 히든 링크 (커서가 포인터가 아니게 설정) */}
          <img 
            src={favicon} 
            alt="A-Man Logo" 
            className="w-14 h-14 object-contain rounded-xl shadow-xs select-none pointer-events-auto active:scale-95 transition-transform" 
            style={{ cursor: 'default' }}
            onClick={() => navigate('/login')} 
          />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            도움말 세션 만료 및 권한 오류
          </h2>
        </div>

        {/* 안내 카드 바디 */}
        <div className="py-6 px-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center space-y-4 mb-6">
          <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              도움말 접속 정보가 유효하지 않습니다.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              도움말 세션이 만료되었거나 접근 권한이 없습니다.<br />
              보안을 위해 <strong>AssetERP 화면 우측 상단의 도움말(Help) 버튼</strong>을 통해 다시 접속해 주시기 바랍니다.
            </p>
          </div>
        </div>

        {/* 하단 카피라이트 */}
        <div className="text-center border-t border-slate-100 pt-4">
          <p className="text-[10px] text-slate-400 font-medium">
            © 2026 <a href="http://www.k-fs.co.kr/user1/index1" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              Korea Fund Service Co., Ltd.
            </a> All rights reserved.
          </p>
        </div>

      </div>
    </div>
  )
}

export default SessionExpireWarning
