import React, { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Save, RotateCcw, Smile, Type, FileText, Layout, Info, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import { renderMarkdownToHtml } from '@/utils/markdownRenderer'

interface Asset {
  id?: number
  atype: 'EMOJI' | 'PHRASE' | 'TEMPLATE' | 'SYMBOL'
  name: string
  value: string
  createdAt?: string
  updatedAt?: string
}

const typeBadges = {
  EMOJI: { label: '이모지', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
  SYMBOL: { label: '특수기호', color: 'bg-blue-50 text-blue-600 border border-blue-100' },
  PHRASE: { label: '상용구', color: 'bg-purple-50 text-purple-600 border border-purple-100' },
  TEMPLATE: { label: '템플릿', color: 'bg-indigo-50 text-indigo-600 border border-indigo-100' }
}

const AssetAdminPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypeTab, setSelectedTypeTab] = useState<'ALL' | 'EMOJI' | 'SYMBOL' | 'PHRASE' | 'TEMPLATE'>('ALL')
  
  // Selected Asset for Editing
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  
  // Edit Form Fields
  const [formAtype, setFormAtype] = useState<'EMOJI' | 'PHRASE' | 'TEMPLATE' | 'SYMBOL'>('EMOJI')
  const [formName, setFormName] = useState('')
  const [formValue, setFormValue] = useState('')
  
  // States
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const response = await axios.get<Asset[]>('/aman/assets')
      setAssets(response.data)
    } catch (error) {
      console.error('자산 목록을 불러오지 못했습니다:', error)
      showStatus('error', '자산 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' })
    }, 4000)
  }

  // Handle Asset Select
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    setFormAtype(asset.atype)
    setFormName(asset.name)
    setFormValue(asset.value)
  }

  // Handle New Asset Setup
  const handleNewAsset = () => {
    setSelectedAsset(null)
    setFormAtype('EMOJI')
    setFormName('')
    setFormValue('')
  }

  // Handle Reset Form
  const handleResetForm = () => {
    if (selectedAsset) {
      setFormAtype(selectedAsset.atype)
      setFormName(selectedAsset.name)
      setFormValue(selectedAsset.value)
    } else {
      setFormName('')
      setFormValue('')
    }
  }

  // Handle Delete Asset
  const handleDeleteAsset = async () => {
    if (!selectedAsset || !selectedAsset.id) return
    if (!confirm(`정말로 이 자산(이름: ${selectedAsset.name})을 삭제하시겠습니까?`)) return

    setDeleting(true)
    try {
      await axios.delete(`/aman/assets/${selectedAsset.id}`)
      showStatus('success', '자산이 성공적으로 삭제되었습니다.')
      setSelectedAsset(null)
      setFormName('')
      setFormValue('')
      fetchAssets()
    } catch (error: any) {
      console.error('자산 삭제 실패:', error)
      const msg = error.response?.data || '자산 삭제에 실패했습니다.'
      showStatus('error', msg)
    } finally {
      setDeleting(false)
    }
  }

  // Handle Save Asset (Insert or Update)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      showStatus('error', '자산 이름을 입력해 주세요.')
      return
    }
    if (!formValue.trim()) {
      showStatus('error', '자산 본문(값)을 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      const payload: Asset = {
        atype: formAtype,
        name: formName.trim(),
        value: formValue.trim()
      }
      if (selectedAsset && selectedAsset.id) {
        payload.id = selectedAsset.id
      }

      const response = await axios.post<Asset>('/aman/assets', payload)
      showStatus('success', selectedAsset ? '자산이 수정되었습니다.' : '새로운 자산이 추가되었습니다.')
      setSelectedAsset(response.data)
      fetchAssets()
    } catch (error: any) {
      console.error('자산 저장 실패:', error)
      const msg = error.response?.data || '자산 저장에 실패했습니다.'
      showStatus('error', msg)
    } finally {
      setSaving(false)
    }
  }

  // Filtered Assets list
  const filteredAssets = assets.filter(item => {
    const matchesTab = selectedTypeTab === 'ALL' || item.atype === selectedTypeTab
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.value.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  // Grouped Counts
  const countByType = (type: string) => assets.filter(x => x.atype === type).length

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-gray-800 font-sans">
      {/* Top Navbar */}
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section: List and Filters */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          
          {/* Header Panel */}
          <div className="p-4 border-b border-gray-250/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                  <span>자산 관리 대시보드</span>
                  <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-650 border border-indigo-100 rounded-full font-semibold">
                    총 {assets.length}개
                  </span>
                </h1>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  에디터 툴바에서 바로 삽입 가능한 이모지, 특수기호, 상용구 및 템플릿을 추가/편집할 수 있습니다.
                </p>
              </div>
              <button
                onClick={handleNewAsset}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>자산 추가</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="자산 이름 또는 값을 검색하세요..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-indigo-500 text-gray-900 placeholder-gray-450 transition-colors"
              />
            </div>

            {/* Type Tab Filters */}
            <div className="flex space-x-1 p-0.5 bg-gray-100 rounded-md border border-gray-200 text-xs">
              <button
                onClick={() => setSelectedTypeTab('ALL')}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer font-medium ${
                  selectedTypeTab === 'ALL' ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                전체
              </button>
              {(['EMOJI', 'SYMBOL', 'PHRASE', 'TEMPLATE'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedTypeTab(tab)}
                  className={`flex-1 py-1 rounded text-center transition-all cursor-pointer font-medium flex items-center justify-center space-x-1 ${
                    selectedTypeTab === tab ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span>{tab === 'EMOJI' ? '이모지' : tab === 'SYMBOL' ? '기호' : tab === 'PHRASE' ? '상용구' : '템플릿'}</span>
                  <span className="text-[9px] px-1 bg-gray-250 text-gray-600 rounded-full font-mono">{countByType(tab)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scroll space-y-2">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs">
                데이터 로딩 중...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-xs space-y-1">
                <Info className="w-5 h-5 text-gray-300" />
                <span>검색 조건에 맞는 자산이 없습니다.</span>
              </div>
            ) : (
              filteredAssets.map(item => {
                const isSelected = selectedAsset?.id === item.id
                const badge = typeBadges[item.atype]
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectAsset(item)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-50/45 border-indigo-400 shadow-xs shadow-indigo-100'
                        : 'bg-white border-gray-150 hover:bg-gray-50 hover:border-gray-250'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {/* Left visual representation */}
                      <div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-lg text-gray-800 shrink-0 select-none">
                        {item.atype === 'EMOJI' || item.atype === 'SYMBOL' ? (
                          item.value.split(',')[0].trim()
                        ) : item.atype === 'PHRASE' ? (
                          <FileText className="w-4 h-4 text-purple-500" />
                        ) : (
                          <Layout className="w-4 h-4 text-indigo-500" />
                        )}
                      </div>

                      {/* Info details */}
                      <div className="overflow-hidden">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="font-semibold text-xs text-gray-800 truncate">{item.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-450 truncate mt-0.5 font-mono select-none">
                          {item.value}
                        </p>
                      </div>
                    </div>

                    {/* Arrow sign */}
                    <div className={`text-gray-450 transition-transform ${isSelected ? 'translate-x-0.5 text-indigo-500' : 'group-hover:translate-x-0.5'}`}>
                      →
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Section: Add / Edit Form */}
        <div className="w-1/2 flex flex-col bg-slate-50/50 overflow-y-auto custom-scroll p-6">
          <div className="max-w-xl w-full mx-auto space-y-6">
            
            {/* Status alert messages */}
            {statusMsg.type && (
              <div
                className={`p-3 rounded text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 border ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}
              >
                {statusMsg.type === 'success' ? '✓' : '⚠️'}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white border border-gray-200/90 rounded-lg p-5 shadow-xs">
              <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-gray-900">
                    {selectedAsset ? `자산 상세 정보 및 편집` : '신규 자산 등록'}
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {selectedAsset 
                      ? `고유 아이디(ID: ${selectedAsset.id}) 정보 수정` 
                      : '공통 마크다운 에디터용 지원 데이터를 추가합니다.'}
                  </p>
                </div>
                {selectedAsset && (
                  <button
                    onClick={handleDeleteAsset}
                    disabled={deleting}
                    className="px-2 py-1 text-[10px] bg-red-50 text-red-650 border border-red-100 hover:bg-red-100/50 rounded font-semibold cursor-pointer transition-colors flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{deleting ? '삭제 중...' : '자산 삭제'}</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveAsset} className="space-y-4 text-xs">
                
                {/* 1. Asset Type */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">자산 분류타입 (atype) <span className="text-red-500">*</span></label>
                  <select
                    value={formAtype}
                    onChange={e => setFormAtype(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-indigo-500 text-gray-950 transition-colors"
                  >
                    <option value="EMOJI">이모지 (EMOJI)</option>
                    <option value="SYMBOL">특수기호 (SYMBOL)</option>
                    <option value="PHRASE">상용구 (PHRASE)</option>
                    <option value="TEMPLATE">템플릿 (TEMPLATE)</option>
                  </select>
                </div>

                {/* 2. Asset Name */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">자산 이름/라벨 (name) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="예: 체크마크, 표준 테이블 템플릿"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-indigo-500 text-gray-950 placeholder-gray-450 transition-colors"
                    maxLength={100}
                    required
                  />
                  <p className="text-[10px] text-gray-400">도움말 에디터의 마우스 오버 툴팁이나 식별 이름으로 표현됩니다.</p>
                </div>

                {/* 3. Asset Value */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">자산 내용본문 (value) <span className="text-red-500">*</span></label>
                  
                  {formAtype === 'EMOJI' || formAtype === 'SYMBOL' ? (
                    <div>
                      <input
                        type="text"
                        value={formValue}
                        onChange={e => setFormValue(e.target.value)}
                        placeholder="이모지/기호들을 쉼표(,)로 구분하여 입력하세요. (예: ‼️, ❗, ✔️)"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-indigo-500 text-gray-950 placeholder-gray-450 transition-colors font-mono"
                        maxLength={1000}
                        required
                      />
                      <p className="text-[10px] text-indigo-650 mt-1 select-none font-semibold">※ 각 개별 요소는 최대 10자 이하여야 하며 저장 시 중복이 자동으로 제거됩니다.</p>
                    </div>
                  ) : (
                    <textarea
                      value={formValue}
                      onChange={e => setFormValue(e.target.value)}
                      placeholder="마크다운 또는 일반 텍스트 문장을 입력하세요..."
                      rows={8}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-indigo-500 text-gray-950 placeholder-gray-450 font-mono transition-colors resize-y leading-relaxed"
                      required
                    />
                  )}
                  <p className="text-[10px] text-gray-400">실제 문서에 삽입될 텍스트입니다. (상용구/템플릿은 마크다운 지원)</p>
                </div>

                {/* Action Form Buttons */}
                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-gray-150 mt-2 select-none">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-3 py-2 bg-white hover:bg-gray-550/10 text-gray-700 border border-gray-250 rounded font-semibold cursor-pointer transition-colors flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>초기화</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer transition-all flex items-center space-x-1 shadow-xs"
                  >
                    <Save className="w-3 h-3" />
                    <span>{saving ? '저장 중...' : selectedAsset ? '수정 내용 저장' : '신규 자산 추가'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 4. Live Markdown Preview for PHRASE & TEMPLATE */}
            {(formAtype === 'PHRASE' || formAtype === 'TEMPLATE') && formValue.trim() && (
              <div className="bg-white border border-gray-250/95 rounded-lg p-5 space-y-2 shadow-xs animate-in fade-in duration-200">
                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded tracking-wider uppercase font-mono">
                  Markdown Live Preview
                </span>
                <div className="prose max-w-none text-gray-800 border border-gray-150 bg-slate-50 p-4 rounded-md text-xs leading-relaxed markdown-content">
                  {renderMarkdownToHtml(formValue)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default AssetAdminPage
