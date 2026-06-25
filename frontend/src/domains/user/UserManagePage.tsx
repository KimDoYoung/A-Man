import React, { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Save, RotateCcw, User, Mail, Shield, ToggleLeft, ToggleRight, Info } from 'lucide-react'
import axios from 'axios'
import DocUserTopBar from '@/components/shared/DocUserTopBar'

interface UserData {
  id?: number
  username: string
  password?: string
  email: string
  name: string
  role: 'admin' | 'user'
  isActive: number
  createdAt?: string
  updatedAt?: string
}

const UserManagePage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  
  // Edit Form Fields
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user')
  const [formIsActive, setFormIsActive] = useState<number>(1)

  // Status Alerts
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get<UserData[]>('/aman/user')
      setUsers(response.data)
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error)
      showStatus('error', '사용자 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' })
    }, 4000)
  }

  // Edit action
  const handleSelectUser = (user: UserData) => {
    setSelectedUser(user)
    setFormUsername(user.username)
    setFormPassword('') // 비밀번호는 수정 입력 시에만 입력하게 공백 처리
    setFormEmail(user.email)
    setFormName(user.name)
    setFormRole(user.role)
    setFormIsActive(user.isActive)
  }

  // Create new state
  const handleNewUser = () => {
    setSelectedUser(null)
    setFormUsername('')
    setFormPassword('')
    setFormEmail('')
    setFormName('')
    setFormRole('user')
    setFormIsActive(1)
  }

  // Form Reset
  const handleResetForm = () => {
    if (selectedUser) {
      setFormUsername(selectedUser.username)
      setFormPassword('')
      setFormEmail(selectedUser.email)
      setFormName(selectedUser.name)
      setFormRole(selectedUser.role)
      setFormIsActive(selectedUser.isActive)
    } else {
      setFormUsername('')
      setFormPassword('')
      setFormEmail('')
      setFormName('')
      setFormRole('user')
      setFormIsActive(1)
    }
  }

  // Deactivate user (Soft Delete)
  const handleDeactivate = async () => {
    if (!selectedUser || !selectedUser.id) return
    if (!confirm(`정말로 사용자 '${selectedUser.name}(${selectedUser.username})' 계정을 비활성화(삭제) 처리하시겠습니까?`)) return

    setDeactivating(true)
    try {
      await axios.delete(`/aman/user/${selectedUser.id}`)
      showStatus('success', '계정이 정상적으로 비활성화 처리되었습니다.')
      fetchUsers()
      // 폼 상태 동기화
      setFormIsActive(0)
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, isActive: 0 })
      }
    } catch (error: any) {
      console.error('계정 비활성화 실패:', error)
      const msg = error.response?.data || '계정 비활성화 처리에 실패했습니다.'
      showStatus('error', msg)
    } finally {
      setDeactivating(false)
    }
  }

  // Submit Save
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formUsername.trim()) {
      showStatus('error', '아이디(ID)를 입력해 주세요.')
      return
    }
    if (!selectedUser && !formPassword.trim()) {
      showStatus('error', '신규 생성 시 비밀번호는 필수입니다.')
      return
    }
    if (!formName.trim()) {
      showStatus('error', '사용자 이름을 입력해 주세요.')
      return
    }
    if (!formEmail.trim()) {
      showStatus('error', '이메일 주소를 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      if (selectedUser && selectedUser.id) {
        // Update (PATCH)
        const fields: Record<string, any> = {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          isActive: String(formIsActive)
        }
        if (formPassword.trim()) {
          fields.password = formPassword.trim()
        }
        const response = await axios.patch<UserData>(`/aman/user/${selectedUser.id}`, fields)
        showStatus('success', '사용자 정보가 성공적으로 수정되었습니다.')
        setSelectedUser(response.data)
      } else {
        // Create (POST)
        const payload: UserData = {
          username: formUsername.trim(),
          password: formPassword.trim(),
          email: formEmail.trim(),
          name: formName.trim(),
          role: formRole,
          isActive: formIsActive
        }
        const response = await axios.post<UserData>('/aman/user', payload)
        showStatus('success', '신규 사용자가 추가되었습니다.')
        setSelectedUser(response.data)
      }
      fetchUsers()
    } catch (error: any) {
      console.error('사용자 저장 실패:', error)
      const msg = error.response?.data || '사용자 저장 중 오류가 발생했습니다.'
      showStatus('error', msg)
    } finally {
      setSaving(false)
    }
  }

  // Filtered lists
  const filteredUsers = users.filter(item => {
    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && item.isActive === 1) ||
      (statusFilter === 'INACTIVE' && item.isActive === 0)
    
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      item.username.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query)
      
    return matchesStatus && matchesSearch
  })

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-gray-800 font-sans">
      {/* Top Navbar */}
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section: User list */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          {/* Header Controls */}
          <div className="p-4 border-b border-gray-250/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                  <span>사용자 계정 관리</span>
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-55/10 text-emerald-600 border border-emerald-100 rounded-full font-semibold">
                    총 {users.length}명
                  </span>
                </h1>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  도움말 매뉴얼을 작성하고 편집할 수 있는 관리자 및 일반 사용자 계정을 발급 및 관리합니다.
                </p>
              </div>
              <button
                onClick={handleNewUser}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>계정 생성</span>
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
                placeholder="아이디, 이름, 또는 이메일로 계정을 찾으세요..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-emerald-500 text-gray-900 placeholder-gray-450 transition-colors"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 p-0.5 bg-gray-100 rounded-md border border-gray-200 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer font-medium ${
                  statusFilter === 'ALL' ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer font-medium ${
                  statusFilter === 'ACTIVE' ? 'bg-white text-emerald-600 font-bold shadow-xs border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                활성 계정 ({users.filter(x => x.isActive === 1).length})
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer font-medium ${
                  statusFilter === 'INACTIVE' ? 'bg-white text-red-500 font-bold shadow-xs border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                비활성 계정 ({users.filter(x => x.isActive === 0).length})
              </button>
            </div>
          </div>

          {/* User List Panel */}
          <div className="flex-1 overflow-y-auto p-4 custom-scroll space-y-2">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs">사용자 정보를 조회 중입니다...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-xs space-y-1">
                <Info className="w-5 h-5 text-gray-300" />
                <span>해당 조건에 일치하는 사용자가 없습니다.</span>
              </div>
            ) : (
              filteredUsers.map(item => {
                const isSelected = selectedUser?.id === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectUser(item)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-emerald-50/30 border-emerald-450 shadow-xs'
                        : 'bg-white border-gray-150 hover:bg-gray-50 hover:border-gray-250'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border select-none ${
                        item.role === 'admin' 
                          ? 'bg-rose-50 border-rose-100 text-rose-500' 
                          : 'bg-blue-50 border-blue-100 text-blue-500'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>

                      {/* Info details */}
                      <div className="overflow-hidden">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="font-bold text-xs text-gray-900">{item.name}</span>
                          <span className="text-[10px] text-gray-450">({item.username})</span>
                          
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full select-none ${
                            item.role === 'admin'
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-blue-50 text-blue-650 border border-blue-100'
                          }`}>
                            {item.role === 'admin' ? '관리자' : '일반사용자'}
                          </span>

                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full select-none ${
                            item.isActive === 1
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}>
                            {item.isActive === 1 ? '활성' : '비활성'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate mt-1 flex items-center space-x-1 select-none font-mono">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{item.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className={`text-gray-450 transition-transform ${isSelected ? 'translate-x-0.5 text-emerald-500' : 'group-hover:translate-x-0.5'}`}>
                      →
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Section: Form Editor */}
        <div className="w-1/2 flex flex-col bg-slate-50/50 overflow-y-auto custom-scroll p-6">
          <div className="max-w-xl w-full mx-auto space-y-6">
            
            {/* Status alerts */}
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

            {/* Editor Card */}
            <div className="bg-white border border-gray-200/90 rounded-lg p-5 shadow-xs">
              <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-gray-900">
                    {selectedUser ? '계정 정보 조회 및 편집' : '신규 사용자 계정 발급'}
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {selectedUser 
                      ? `고유 사원 ID (Primary Key: ${selectedUser.id}) 수정` 
                      : '새로운 도움말 시스템 계정을 등록합니다.'}
                  </p>
                </div>
                {selectedUser && selectedUser.isActive === 1 && (
                  <button
                    onClick={handleDeactivate}
                    disabled={deactivating}
                    className="px-2 py-1 text-[10px] bg-red-50 text-red-650 border border-red-100 hover:bg-red-100/50 rounded font-semibold cursor-pointer transition-colors flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{deactivating ? '처리 중...' : '계정 비활성화'}</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                {/* 1. Username */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">사용자 아이디 (ID) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="로그인 시 사용될 아이디를 입력하세요."
                    className={`w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-emerald-500 text-gray-950 transition-colors font-mono ${
                      selectedUser ? 'opacity-60 bg-gray-50 cursor-not-allowed' : ''
                    }`}
                    disabled={!!selectedUser}
                    maxLength={30}
                    required
                  />
                  {!selectedUser && (
                    <p className="text-[10px] text-gray-400">아이디는 중복될 수 없으며 가입 후 변경 불가합니다.</p>
                  )}
                </div>

                {/* 2. Password */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">
                    비밀번호 (Password) 
                    {!selectedUser && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    type="text" // 평문 비교 요구사항을 반영하여 입력 및 수정 확인을 위해 텍스트 타입 사용 가능 (개발 환경 가이드 준수)
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder={selectedUser ? "비밀번호 변경 시에만 입력해 주세요 (평문 저장)" : "로그인 비밀번호를 설정하세요 (평문)"}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-emerald-500 text-gray-950 transition-colors font-mono"
                    maxLength={50}
                    required={!selectedUser}
                  />
                  {selectedUser && (
                    <p className="text-[10px] text-amber-600 font-medium flex items-center space-x-1">
                      <span>※ 비밀번호를 변경하지 않으려면 공백으로 비워두세요.</span>
                    </p>
                  )}
                </div>

                {/* 3. Name */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">사용자 이름 (Name) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="실명을 입력하세요 (예: 홍길동)."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-emerald-500 text-gray-950 transition-colors"
                    maxLength={40}
                    required
                  />
                </div>

                {/* 4. Email */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">이메일 주소 (Email) <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="이메일을 입력하세요 (예: username@k-fs.co.kr)."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-emerald-500 text-gray-950 transition-colors font-mono"
                    maxLength={100}
                    required
                  />
                </div>

                {/* 5. Role */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium flex items-center space-x-1">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    <span>사용자 권한 등급 (Role)</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as 'admin' | 'user')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-emerald-500 text-gray-950 transition-colors"
                  >
                    <option value="user">일반 사용자 (user) — 문서 조회 및 작성</option>
                    <option value="admin">관리자 (admin) — 시스템 설정 및 모든 CRUD 통제</option>
                  </select>
                </div>

                {/* 6. Active state */}
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-medium">계정 활성화 상태 (isActive)</label>
                  <select
                    value={formIsActive}
                    onChange={e => setFormIsActive(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-hidden focus:border-emerald-500 text-gray-950 transition-colors"
                  >
                    <option value={1}>활성 상태 (Active) — 정상적인 로그인 가능</option>
                    <option value={0}>비활성 상태 (Inactive) — 시스템 접근 차단</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-gray-150 mt-2 select-none">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-250 rounded font-semibold cursor-pointer transition-colors flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>초기화</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer transition-all flex items-center space-x-1 shadow-xs"
                  >
                    <Save className="w-3 h-3" />
                    <span>{saving ? '저장 중...' : selectedUser ? '수정 내용 저장' : '신규 계정 추가'}</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default UserManagePage
