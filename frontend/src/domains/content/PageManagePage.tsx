import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  const [level1Filter, setLevel1Filter] = useState<number | 'ALL'>('ALL')
  const [level2Filter, setLevel2Filter] = useState<number | 'ALL'>('ALL')
  const [folderMap, setFolderMap] = useState<Map<number, any>>(new Map())
  // 폴더 트리 DFS 순회 순서 인덱스 (메뉴 관리 화면과 동일한 순서로 페이지 목록을 정렬하기 위함)
  const [folderOrderIndex, setFolderOrderIndex] = useState<Map<number, number>>(new Map())
  const gridRef = useRef<AgGridReact>(null)

  // 폴더 목록 조회 및 Map 캐싱
  useEffect(() => {
    apiClient.get<any[]>('/docs/folders')
      .then(folders => {
        if (Array.isArray(folders)) {
          const map = new Map()
          const orderIndex = new Map<number, number>()
          let order = 0

          const flattenAndCache = (items: any[], parentId: number | null = null) => {
            if (!items) return
            items.forEach(item => {
              const pid = parentId !== null ? parentId : (item.parentId !== undefined ? item.parentId : (item.parent ? item.parent.id : null))
              map.set(item.id, {
                id: item.id,
                name: item.name,
                parentId: pid,
                nums: item.nums,
                level: item.level
              })
              orderIndex.set(item.id, order++)
              if (item.children && item.children.length > 0) {
                flattenAndCache(item.children, item.id)
              }
            })
          }

          flattenAndCache(folders)
          setFolderMap(map)
          setFolderOrderIndex(orderIndex)
        }
      })
      .catch(err => console.error('폴더 목록 조회 실패:', err))
  }, [])

  const fetchPages = async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter === 'ALL' ? '' : statusFilter
      const lockParam = lockFilter === 'ALL' ? '' : lockFilter
      const pages = await apiClient.get<PageRow[]>(`/admin/page-list?keyword=${encodeURIComponent(keyword)}&status=${statusParam}&lockFilter=${lockParam}`)
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

  // 1단계 드롭다운: 값 변경 시 2단계가 새 1단계의 자식이 아니면(또는 '전체' 선택 시) 2단계도 '전체'로 리셋
  const handleLevel1Change = (value: string) => {
    const next = value === 'ALL' ? 'ALL' : Number(value)
    setLevel1Filter(next)
    if (next === 'ALL') {
      setLevel2Filter('ALL')
      return
    }
    if (level2Filter !== 'ALL') {
      const level2Folder = folderMap.get(level2Filter)
      if (!level2Folder || level2Folder.parentId !== next) {
        setLevel2Filter('ALL')
      }
    }
  }

  // 2단계 드롭다운: 값 변경 시 그 부모를 1단계에 자동 반영 ('전체' 선택 시 1단계는 유지)
  const handleLevel2Change = (value: string) => {
    if (value === 'ALL') {
      setLevel2Filter('ALL')
      return
    }
    const next = Number(value)
    setLevel2Filter(next)
    const folder = folderMap.get(next)
    if (folder && folder.parentId !== null && folder.parentId !== undefined) {
      setLevel1Filter(folder.parentId)
    }
  }

  const handleReset = () => {
    setKeyword('')
    setStatusFilter('ALL')
    setLockFilter('ALL')
    setLevel1Filter('ALL')
    setLevel2Filter('ALL')
    setLoading(true)
    apiClient.get<PageRow[]>('/admin/page-list?keyword=&status=&lockFilter=')
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
      const updated = await apiClient.post<PageRow>(`/admin/page-list/${pageId}/status`, { status: nextStatus })
      setRowData(prev => prev.map(row => row.id === pageId ? { ...row, status: updated.status } : row))
    } catch (error: any) {
      console.error('상태 변경 실패:', error)
      alert(error.response?.data?.toString() || '상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleToggleLock = async (pageId: number) => {
    try {
      const updated = await apiClient.post<PageRow>(`/admin/page-list/${pageId}/lock-toggle`)
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

  // 1단계 드롭다운 옵션: 전체 1단계 폴더, 메뉴 트리 순서로 정렬
  const level1Options = useMemo(() => {
    const items: any[] = []
    folderMap.forEach((folder) => {
      if (folder.level === 1) items.push(folder)
    })
    return items.sort((a, b) => (folderOrderIndex.get(a.id) ?? 0) - (folderOrderIndex.get(b.id) ?? 0))
  }, [folderMap, folderOrderIndex])

  // 2단계 드롭다운 옵션: 1단계가 선택돼 있으면 그 하위만, 아니면 전체 2단계
  const level2Options = useMemo(() => {
    const items: any[] = []
    folderMap.forEach((folder) => {
      if (folder.level !== 2) return
      if (level1Filter !== 'ALL' && folder.parentId !== level1Filter) return
      items.push(folder)
    })
    return items.sort((a, b) => (folderOrderIndex.get(a.id) ?? 0) - (folderOrderIndex.get(b.id) ?? 0))
  }, [folderMap, folderOrderIndex, level1Filter])

  // 1단계/2단계 필터 적용: 페이지의 폴더가 선택된 폴더를 조상 체인에 포함하는지로 판정 (AND 결합)
  const folderFilteredRowData = useMemo(() => {
    if (level1Filter === 'ALL' && level2Filter === 'ALL') return rowData

    const matchesAncestor = (folderId: number | undefined, targetId: number) => {
      let curr = folderId !== undefined ? folderMap.get(folderId) : undefined
      while (curr) {
        if (curr.id === targetId) return true
        curr = curr.parentId !== null && curr.parentId !== undefined ? folderMap.get(curr.parentId) : undefined
      }
      return false
    }

    return rowData.filter((row) => {
      const folderId = row.folder?.id
      if (folderId === undefined) return false
      if (level1Filter !== 'ALL' && !matchesAncestor(folderId, level1Filter)) return false
      if (level2Filter !== 'ALL' && !matchesAncestor(folderId, level2Filter)) return false
      return true
    })
  }, [rowData, folderMap, level1Filter, level2Filter])

  // 폴더 트리 순서(메뉴 관리 화면과 동일) → 같은 폴더 내에서는 page.sortOrder 순으로 정렬
  const sortedRowData = useMemo(() => {
    const getFolderRank = (folderId?: number) =>
      folderId !== undefined ? folderOrderIndex.get(folderId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER

    return [...folderFilteredRowData].sort((a, b) => {
      const rankA = getFolderRank(a.folder?.id)
      const rankB = getFolderRank(b.folder?.id)
      if (rankA !== rankB) return rankA - rankB
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })
  }, [folderFilteredRowData, folderOrderIndex])

  const columnDefs = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
      cellClass: 'text-gray-400 font-mono text-[11px] text-center' 
    },
    {
      field: 'folder',
      headerName: '메뉴 분류 (폴더 경로)',
      width: 320,
      valueGetter: (params: any) => {
        const f = params.data.folder
        if (!f || !f.id) return '-'
        
        const path: string[] = []
        let curr = folderMap.get(f.id)
        while (curr) {
          path.unshift(curr.name)
          curr = curr.parentId ? folderMap.get(curr.parentId) : null
        }
        
        const pathStr = path.length > 0 ? path.join(' > ') : f.name
        return pathStr
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
      width: 200, 
      cellClass: 'font-mono text-gray-500 text-xs' 
    },
    {
      field: 'status',
      headerName: '배포 상태',
      width: 180,
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
      width: 180,
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
      width: 200,
      cellClass: 'text-gray-400 font-mono text-[12px] text-center',
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
                <p className="text-xs text-slate-400">진행된 도움말 페이지 목록을 확인하고 배포 상태 및 잠금을 설정합니다.</p>
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
                value={level1Filter}
                onChange={(e) => handleLevel1Change(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 focus:outline-none"
              >
                <option value="ALL">1단계 전체</option>
                {level1Options.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>

              <select
                value={level2Filter}
                onChange={(e) => handleLevel2Change(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 focus:outline-none"
              >
                <option value="ALL">2단계 전체</option>
                {level2Options.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>

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
                <option value="UNLOCKED">잠금 안 함</option>
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center space-x-1"
                title="필터 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>초기화</span>
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
                rowData={sortedRowData}
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
