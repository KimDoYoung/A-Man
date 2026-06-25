import React, { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, HelpCircle } from 'lucide-react'
import axios from 'axios'
import DocUserTopBar from '@/components/shared/DocUserTopBar'

interface SettingItem {
  id: number
  settingKey: string
  settingValue: string
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/aman/admin/settings')
      setSettings(response.data || [])
    } catch (err: any) {
      console.error('설정 로딩 실패:', err)
      showStatus('error', '설정 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' })
    }, 4000)
  }

  const handleValueChange = (key: string, value: string) => {
    setSettings(prev =>
      prev.map(item => (item.settingKey === key ? { ...item, settingValue: value } : item))
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      for (const item of settings) {
        await axios.patch(`/aman/admin/settings/${item.id}`, {
          settingValue: item.settingValue
        })
      }
      showStatus('success', '설정이 성공적으로 저장되었습니다.')
    } catch (err: any) {
      console.error('설정 저장 실패:', err)
      showStatus('error', err.response?.data || '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const getSettingValue = (key: string) => {
    const item = settings.find(s => s.settingKey === key)
    return item ? item.settingValue : ''
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between shrink-0 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              시스템 환경 설정 (SettingsPage)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              A-Man 매뉴얼 시스템의 전역 명칭, 설명 및 사용자 유형별 메뉴 트리/제목/브레드크럼의 표시 포맷을 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-2 md:mt-0">
            {statusMsg.text && (
              <div className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                {statusMsg.text}
              </div>
            )}
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {loading && settings.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">설정 정보를 로딩하고 있습니다...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
            {/* Card 1: Basic Site Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">기본 정보 설정</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">시스템 전역에서 사용하는 명칭과 간략한 설명입니다.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">사이트 이름 (SITE_NAME)</label>
                    <input
                      type="text"
                      value={getSettingValue('SITE_NAME')}
                      onChange={e => handleValueChange('SITE_NAME', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                      placeholder="예: A-Man API"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">사이트 설명 (SITE_DESCRIPTION)</label>
                    <input
                      type="text"
                      value={getSettingValue('SITE_DESCRIPTION')}
                      onChange={e => handleValueChange('SITE_DESCRIPTION', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                      placeholder="예: 도움말 시스템 설명"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Alert: Formatting Tokens */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-slate-700 text-xs flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-800">※ 포맷팅 토큰 안내</span>
                <p className="mt-1 text-indigo-950/80 leading-relaxed font-medium">
                  메뉴 관련 포맷에는 다음 변수 토큰들을 조합하여 사용할 수 있습니다:
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-[11px] font-semibold text-indigo-900/90 font-mono">
                  <li><span className="bg-white/80 px-1 py-0.5 rounded border border-indigo-150">{`{nums}`}</span> : 메뉴 번호 (예: 1.1.1)</li>
                  <li><span className="bg-white/80 px-1 py-0.5 rounded border border-indigo-150">{`{name}`}</span> : 메뉴 명칭 (예: 거래 처리)</li>
                  <li><span className="bg-white/80 px-1 py-0.5 rounded border border-indigo-150">{`{sort_order}`}</span> : 정렬 순서값 (예: 10)</li>
                </ul>
              </div>
            </div>

            {/* Card 2: Normal User Display Formats */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">일반 사용자용 화면 포맷 설정</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">로그인하지 않았거나 일반 사용자용 도움말 화면(/docs)에서 노출되는 포맷입니다.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">메뉴 트리 포맷 (NORMAL_USER_TREE_FORMAT)</label>
                    <input
                      type="text"
                      value={getSettingValue('NORMAL_USER_TREE_FORMAT')}
                      onChange={e => handleValueChange('NORMAL_USER_TREE_FORMAT', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">제목 타이틀 포맷 (NORMAL_USER_TITLE_FORMAT)</label>
                    <input
                      type="text"
                      value={getSettingValue('NORMAL_USER_TITLE_FORMAT')}
                      onChange={e => handleValueChange('NORMAL_USER_TITLE_FORMAT', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">브레드크럼 포맷 (NORMAL_USER_BREADCRUMB_FORMAT)</label>
                    <input
                      type="text"
                      value={getSettingValue('NORMAL_USER_BREADCRUMB_FORMAT')}
                      onChange={e => handleValueChange('NORMAL_USER_BREADCRUMB_FORMAT', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Doc User Display Formats */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">문서편집 사용자용 화면 포맷 설정</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">문서 관리용 어드민 화면(/admin)에서 편집 중 노출되는 포맷입니다.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">메뉴 트리 포맷 (DOC_USER_TREE_FORMAT)</label>
                    <input
                      type="text"
                      value={getSettingValue('DOC_USER_TREE_FORMAT')}
                      onChange={e => handleValueChange('DOC_USER_TREE_FORMAT', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">제목 타이틀 포맷 (DOC_USER_TITLE_FORMAT)</label>
                    <input
                      type="text"
                      value={getSettingValue('DOC_USER_TITLE_FORMAT')}
                      onChange={e => handleValueChange('DOC_USER_TITLE_FORMAT', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">브레드크럼 포맷 (DOC_USER_BREADCRUMB_FORMAT)</label>
                    <input
                      type="text"
                      value={getSettingValue('DOC_USER_BREADCRUMB_FORMAT')}
                      onChange={e => handleValueChange('DOC_USER_BREADCRUMB_FORMAT', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={fetchSettings}
                disabled={saving}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>설정 저장</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default SettingsPage
