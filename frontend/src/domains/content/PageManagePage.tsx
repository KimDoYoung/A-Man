import React, { useState, useEffect, useRef } from 'react'
import { Search, RotateCcw, FileText } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface PageRow {
  id: number
  title: string
  aka: string
  content: string
  status: 'DRAFT' | 'PUBLISHED'
  lockUser: string | null
  lockTime: string | null
  lockRole: string | null
  sortOrder: number
  folder?: {
    id: number
    name: string
    nums?: string
  }
}

const PageManagePage: React.FC = () => {
  const [rowData, setRowData] = useState<PageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL')
  const [lockFilter, setLockFilter] = useState<'ALL' | 'LOCKED' | 'UNLOCKED'>('ALL')
  const gridRef = useRef<AgGridReact>(null)

  const fetchPages = async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter === 'ALL' ? '' : statusFilter
      const lockParam = lockFilter === 'ALL' ? '' : lockFilter
      const pages = await apiClient.get<PageRow[]>(`/admin/pages?keyword=${encodeURIComponent(keyword)}&status=${statusParam}&lockFilter=${lockParam}`)
      if (Array.isArray(pages)) {
        setRowData(pages)
      } else {
        console.error('Invalid pages data received:', pages)
        setRowData([])
      }
    } catch (error) {
      console.error('페이지 목록 조회 실패:', error)
      setRowData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPages()
  }, [statusFilter, lockFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPages()
  }

  const handleReset = () => {
    setKeyword('')
    setStatusFilter('ALL')
    setLockFilter('ALL')
    setLoading(true)
    apiClient.get<PageRow[]>('/admin/pages?keyword=&status=&lockFilter=')
      .then(data => {
        if (Array.isArray(data)) {
          setRowData(data)
        } else {
          setRowData([])
        }
      })
      .catch(err => {
        console.error(err)
        setRowData([])
      })
      .finally(() => setLoading(false))
  }

  const handleToggleStatus = async (pageId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      const updated = await apiClient.post<PageRow>(`/admin/pages/${pageId}/status`, { status: nextStatus })
      setRowData(prev => prev.map(row => row.id === pageId ? { ...row, status: updated.status } : row))
    } catch (error: any) {
      console.error('상태 변경 실패:', error)
      alert(error.response?.data?.toString() || '상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleToggleLock = async (pageId: number) => {
    try {
      const updated = await apiClient.post<PageRow>(`/admin/pages/${pageId}/lock-toggle`)
      setRowData(prev => prev.map(row => row.id === pageId ? { 
        ...row, 
        lockUser: updated.lockUser, 
        lockTime: updated.lockTime, 
        lockRole: updated.lockRole 
      } : row))
    } catch (error: any) {
      console.error('잠금 상태 변경 실패:', error)
      alert(error.response?.data?.toString() || '잠금 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const columnDefs = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
      cellClass: 'text-gray-400 font-mono text-[11px] text-center' 
    },
    {
      field: 'folder',
      headerName: '메뉴 분류 (폴더)',
      width: 200,
      valueGetter: (params: any) => {
        const f = params.data.folder
        if (!f) return '-'
        return f.nums ? `[${f.nums}] ${f.name}` : f.name
      },
      cellClass: 'text-slate-500 font-medium text-xs'
    },
    { 
      field: 'title', 
      headerName: '도움말 제목', 
      flex: 1, 
      minWidth: 200,
      cellClass: 'font-semibold text-slate-700'
    },
    { 
      field: 'aka', 
      headerName: '별칭 (AKA)', 
      width: 150, 
      cellClass: 'font-mono text-gray-500 text-xs' 
    },
    {
      field: 'status',
      headerName: '배포 상태',
      width: 160,
      cellRenderer: (params: any) => {
        const status = params.value
        const isPublished = status === 'PUBLISHED'
        return (
          <div className="flex items-center h-full select-none">
            <button
              onClick={() => handleToggleStatus(params.data.id, status)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublished ? 'bg-indigo-600' : 'bg-slate-400'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isPublished ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`ml-2 text-xs font-bold ${isPublished ? 'text-indigo-600' : 'text-slate-550'}`}>
              {isPublished ? '완료 및 배포' : '작성 중'}
            </span>
          </div>
        )
      }
    },
    {
      field: 'lockUser',
      headerName: '페이지 잠금',
      width: 220,
      cellRenderer: (params: any) => {
        const lockUser = params.value
        const isLocked = !!lockUser
        return (
          <div className="flex items-center h-full select-none">
            <button
              onClick={() => handleToggleLock(params.data.id)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isLocked ? 'bg-rose-600' : 'bg-slate-400'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isLocked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`ml-2 text-xs font-bold ${isLocked ? 'text-rose-600' : 'text-slate-550'}`}>
              {isLocked ? `잠김 (${lockUser})` : '잠금 안 함'}
            </span>
          </div>
        )
      }
    },
    {
      field: 'lockTime',
      headerName: '잠금 일시',
      width: 160,
      cellClass: 'text-gray-400 font-mono text-[11px] text-center',
      valueFormatter: (params: any) => {
        if (!params.value) return '-'
        return params.value.replace('T', ' ').substring(0, 19)
      }
    }
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      <main className="flex-1 flex flex-col overflow-hidden p-6">
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {/* Header Title */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800">페이지 관리</h1>
                <p className="text-xs text-slate-400">시스템 도움말 페이지 목록을 확인하고 배포 상태 및 잠금을 설정합니다.</p>
              </div>
            </div>

            {/* Search and Filters */}
            <form onSubmit={handleSearch} className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="제목, aka, 본문 검색..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-64 focus:outline-none focus:border-indigo-500 placeholder-slate-350"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 focus:outline-none"
              >
                <option value="ALL">전체 상태</option>
                <option value="DRAFT">작성 중</option>
                <option value="PUBLISHED">완료 및 배포</option>
              </select>

              <select
                value={lockFilter}
                onChange={(e: any) => setLockFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 focus:outline-none"
              >
                <option value="ALL">전체 잠금상태</option>
                <option value="LOCKED">잠김</option>
                <option value="UNLOCKED">잠금 없음</option>
              </select>

              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                조회
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-500 cursor-pointer"
                title="필터 초기화"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Grid Area */}
          <div className="flex-1 p-5 overflow-hidden flex flex-col relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="ag-theme-alpine w-full flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                theme="legacy"
                animateRows={true}
                defaultColDef={{
                  resizable: true,
                  sortable: true
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PageManagePage
