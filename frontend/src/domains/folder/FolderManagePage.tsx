import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Save, Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, ListOrdered, RefreshCw, Layers, FileText } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import DepthBadge from './components/DepthBadge'

interface FolderNode {
  id: number
  nums: string
  name: string
  level: number
  parentId: number | null
  sortOrder: number
  children: FolderNode[]
}

const FolderManagePage: React.FC = () => {
  const [treeData, setTreeData] = useState<FolderNode[]>([])
  const [flatFolders, setFlatFolders] = useState<any[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({})
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null)
  
  // AG Grid States
  const [rowData, setRowData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [settings, setSettings] = useState<Record<string, string>>({})
  
  const gridRef = useRef<AgGridReact>(null)

  // Splitter Resizing
  const [treeWidth, setTreeWidth] = useState(() => {
    const saved = localStorage.getItem('folder-tree-width')
    return saved ? parseInt(saved, 10) : 320
  })
  const isResizingRef = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return
    const container = document.getElementById('folder-manage-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      if (newWidth >= 240 && newWidth <= 600) {
        setTreeWidth(newWidth)
        localStorage.setItem('folder-tree-width', newWidth.toString())
      }
    }
  }

  const handleMouseUp = () => {
    isResizingRef.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // 사이트 포맷 및 제어 설정 로드
  useEffect(() => {
    apiClient.get<any>('/health')
      .then(data => {
        if (data && data.settings) {
          setSettings(data.settings)
        }
      })
      .catch(err => {
        console.error('Failed to load settings in FolderManagePage:', err)
      })
  }, [])

  const isAutoNums = settings.AUTO_NUMS !== 'false'

  // Fetch folders and build tree
  const fetchTreeData = async () => {
    setLoading(true)
    try {
      const rawData = await apiClient.get<any>('/docs/folders')
      setFlatFolders(rawData)
      const tree = buildFolderTree(rawData)
      setTreeData(tree)
    } catch (error) {
      console.error('메뉴 트리 로딩 실패:', error)
      showStatus('error', '메뉴 트리 구조를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Load subfolders for the selected folder to display in AG Grid
  const loadSubFolders = async (folderId: number) => {
    try {
      const data = await apiClient.get<any>(`/docs/folders/${folderId}/sub`)
      setRowData(data || [])
    } catch (error) {
      console.error('하위 메뉴 조회 실패:', error)
      showStatus('error', '하위 메뉴를 불러오지 못했습니다.')
    }
  }

  // Load root level folders (parentId is null)
  const loadRootFolders = async () => {
    try {
      const data = await apiClient.get<any[]>('/docs/folders')
      // Note: `/docs/folders` returns root folders with child list serialized
      // Map to flat root list
      const roots = data.map((f: any) => ({
        id: f.id,
        nums: f.nums,
        name: f.name,
        level: f.level,
        parentId: null,
        sortOrder: f.sortOrder
      }))
      setRowData(roots)
    } catch (error) {
      console.error('최상위 메뉴 조회 실패:', error)
      showStatus('error', '최상위 메뉴를 불러오지 못했습니다.')
    }
  }

  useEffect(() => {
    fetchTreeData()
    loadRootFolders() // Default to showing root level folders
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' })
    }, 3000)
  }

  // Helper to build a clean 3-level tree from flat data
  const buildFolderTree = (list: any[]): FolderNode[] => {
    const flatList: any[] = []
    const flatten = (items: any[]) => {
      if (!items) return
      items.forEach(item => {
        flatList.push(item)
        if (item.children && item.children.length > 0) {
          flatten(item.children)
        }
      })
    }
    flatten(list)

    const map: Record<number, FolderNode> = {}
    const roots: FolderNode[] = []

    flatList.forEach((item) => {
      const pId = item.parentId !== undefined ? item.parentId : (item.parent ? item.parent.id : null)
      map[item.id] = {
        id: item.id,
        nums: item.nums,
        name: item.name,
        level: item.level,
        parentId: pId,
        sortOrder: item.sortOrder || 0,
        children: []
      }
    })

    flatList.forEach((item) => {
      const node = map[item.id]
      if (node.parentId === null) {
        if (!roots.some(r => r.id === node.id)) {
          roots.push(node)
        }
      } else {
        const parent = map[node.parentId]
        if (parent) {
          if (!parent.children.some(c => c.id === node.id)) {
            parent.children.push(node)
          }
          parent.children.sort((a, b) => a.sortOrder - b.sortOrder)
        }
      }
    })

    return roots.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const toggleFolder = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSelectFolderNode = (folder: FolderNode | null) => {
    setSelectedFolder(folder)
    if (folder) {
      loadSubFolders(folder.id)
      // Expand the folder when name/row is clicked (without collapsing if already open)
      setExpandedFolders(prev => ({ ...prev, [folder.id]: true }))
    } else {
      loadRootFolders()
      // Collapse all folders when returning to root view
      setExpandedFolders({})
    }
  }

  const handleExpandAll = () => {
    const expanded: Record<number, boolean> = {}
    const traverse = (nodes: any[]) => {
      nodes.forEach(node => {
        expanded[node.id] = true
        if (node.children && node.children.length > 0) {
          traverse(node.children)
        }
      })
    }
    traverse(flatFolders)
    setExpandedFolders(expanded)
  }

  const handleCollapseAll = () => {
    setExpandedFolders({})
  }

  // AG Grid Columns Definition
  const columnDefs = [
    {
      rowDrag: true,
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      suppressHeaderMenuButton: true,
      sortable: false,
      cellClass: 'cursor-move'
    },
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70, 
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellClass: 'text-gray-400 font-mono text-[11px] text-center' 
    },
    { 
      field: 'nums', 
      headerName: '메뉴 번호 (nums)', 
      width: 140, 
      editable: true,
      cellClass: 'font-semibold text-slate-700'
    },
    { 
      field: 'name', 
      headerName: '메뉴 명', 
      flex: 1, 
      minWidth: 200, 
      editable: true,
      cellClass: 'font-medium'
    },
    { 
      field: 'sortOrder', 
      headerName: '정렬 순서', 
      width: 110, 
      editable: true,
      valueParser: (params: any) => Number(params.newValue),
      cellClass: 'text-center'
    },
    { 
      field: 'level', 
      headerName: '레벨 (Depth)', 
      width: 100, 
      cellClass: 'text-center font-mono text-gray-500' 
    }
  ]

  // Handle grid sorting via row dragging
  const onRowDragEnd = (event: any) => {
    const updatedRows: any[] = []
    event.api.forEachNode((node: any) => {
      updatedRows.push(node.data)
    })

    // Auto-update sortOrder in increments of 10 based on drag positions
    const reordered = updatedRows.map((row, index) => ({
      ...row,
      sortOrder: (index + 1) * 10
    }))
    setRowData(reordered)
  }

  // Add new child menu row
  const handleAddChildRow = () => {
    const nextSortOrder = rowData.length > 0 
      ? Math.max(...rowData.map(r => r.sortOrder || 0)) + 10 
      : 10

    const nextLevel = selectedFolder ? selectedFolder.level + 1 : 1
    
    if (nextLevel > 3) {
      alert('A-Man 도움말 시스템은 최대 3단계(depth) 메뉴까지만 지원합니다.')
      return
    }

    let tentativeNums = ''
    if (selectedFolder) {
      tentativeNums = `${selectedFolder.nums || ''}.${rowData.length + 1}`
    } else {
      tentativeNums = `${rowData.length + 1}`
    }

    const newRow = {
      id: undefined,
      nums: tentativeNums,
      name: '새 메뉴',
      sortOrder: nextSortOrder,
      level: nextLevel,
      parentId: selectedFolder ? selectedFolder.id : null,
      isNew: true
    }

    setRowData([...rowData, newRow])
  }

  // Delete selected rows
  const handleDeleteSelectedRows = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes()
    if (!selectedNodes || selectedNodes.length === 0) {
      alert('삭제할 메뉴 행을 체크박스로 먼저 선택해 주세요.')
      return
    }

    if (!confirm('⚠️ 선택한 메뉴를 삭제하면 그 하위 모든 메뉴와 연결된 마크다운 도움말 페이지가 전부 영구 삭제됩니다.\n정말로 삭제하시겠습니까?')) {
      return
    }

    const deleteIds = selectedNodes.map((node: any) => node.data.id).filter((id: any) => id !== undefined)
    const newRows = rowData.filter((row: any) => !selectedNodes.some((node: any) => node.data === row))

    try {
      setSaving(true)
      for (const id of deleteIds) {
        await apiClient.delete(`/folder/${id}`)
      }
      setRowData(newRows)
      showStatus('success', '선택한 메뉴가 삭제되었습니다.')
      fetchTreeData()
    } catch (err: any) {
      console.error(err)
      showStatus('error', err.response?.data || '메뉴 삭제 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Save changes
  const handleSaveChanges = async () => {
    // Validate rows
    for (const row of rowData) {
      if (!row.name || !row.name.trim()) {
        alert('메뉴 명은 필수 입력 항목입니다.')
        return
      }
    }

    setSaving(true)
    try {
      for (const row of rowData) {
        if (row.isNew) {
          await apiClient.post('/folder', {
            name: row.name,
            nums: row.nums,
            level: row.level,
            sortOrder: row.sortOrder,
            parentId: row.parentId
          })
        } else {
          await apiClient.patch(`/folder/${row.id}`, {
            name: row.name,
            nums: row.nums,
            level: row.level,
            sortOrder: row.sortOrder
          })
        }
      }
      showStatus('success', '변경 사항이 성공적으로 저장되었습니다.')
      fetchTreeData()
      if (selectedFolder) {
        loadSubFolders(selectedFolder.id)
      } else {
        loadRootFolders()
      }
    } catch (err: any) {
      console.error(err)
      showStatus('error', err.response?.data || '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Auto numbering helper based on order
  const handleAutoCalcNums = () => {
    const baseNums = selectedFolder ? selectedFolder.nums : ''
    const updated = rowData.map((row, idx) => {
      const seq = idx + 1
      const newNums = baseNums ? `${baseNums}.${seq}` : `${seq}`
      return { ...row, nums: newNums }
    })
    setRowData(updated)
    showStatus('success', '정렬 순서에 기초하여 메뉴 번호가 자동 부여되었습니다. [저장]을 눌러 반영하세요.')
  }

  // Regenerate all folder numbers recursively on the backend
  const handleRegenerateAllNumbers = async () => {
    if (!confirm('⚠️ 전체 메뉴의 번호(nums) 및 정렬 순서(sortOrder)를 현재 정렬 기준에 맞추어 일괄 재생성하시겠습니까?\n이 작업은 데이터베이스에 즉시 반영되며 되돌릴 수 없습니다.')) {
      return
    }

    setSaving(true)
    try {
      const data = await apiClient.post<any>('/folder/regenerate-all')
      showStatus('success', data || '전체 번호가 성공적으로 재생성되었습니다.')
      
      // Reload left tree and current grid view
      await fetchTreeData()
      if (selectedFolder) {
        // Load latest version of selected folder to update grid context
        const latestData = await apiClient.get<any>(`/docs/folders/${selectedFolder.id}`)
        setSelectedFolder(latestData)
        loadSubFolders(selectedFolder.id)
      } else {
        loadRootFolders()
      }
    } catch (err: any) {
      console.error(err)
      showStatus('error', err.response?.data || '전체 번호 재생성 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Clear all folder numbers recursively on the backend
  const handleClearAllNumbers = async () => {
    if (!confirm('⚠️ 전체 메뉴의 번호(nums)를 일괄 비우시겠습니까?\n이 작업은 데이터베이스에 즉시 반영되며 되돌릴 수 없습니다.')) {
      return
    }

    setSaving(true)
    try {
      const data = await apiClient.post<any>('/folder/clear-all-nums')
      showStatus('success', data || '전체 번호가 성공적으로 비워졌습니다.')
      
      // Reload left tree and current grid view
      await fetchTreeData()
      if (selectedFolder) {
        // Load latest version of selected folder to update grid context
        const latestData = await apiClient.get<any>(`/docs/folders/${selectedFolder.id}`)
        setSelectedFolder(latestData)
        loadSubFolders(selectedFolder.id)
      } else {
        loadRootFolders()
      }
    } catch (err: any) {
      console.error(err)
      showStatus('error', err.response?.data || '전체 번호 비우기 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Render tree node recursively
  const renderTreeNode = (node: FolderNode) => {
    const isExpanded = !!expandedFolders[node.id]
    const isSelected = selectedFolder?.id === node.id
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="select-none">
        <div 
          onClick={() => handleSelectFolderNode(node)}
          className={`flex items-center justify-between py-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
            isSelected 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-semibold' 
              : 'hover:bg-gray-50 border-transparent text-gray-700'
          }`}
          style={{ paddingLeft: `${Math.max(12, node.level * 14)}px` }}
        >
          <div className="flex items-center space-x-2 truncate">
            {hasChildren ? (
              <button 
                onClick={(e) => toggleFolder(node.id, e)}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4.5" />
            )}
            {node.level === 3 ? (
              <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
            ) : isExpanded ? (
              <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-amber-500'}`} />
            ) : (
              <FolderIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-amber-400'}`} />
            )}
            <span className="font-mono text-gray-400 font-medium text-[10px] shrink-0">{node.nums}</span>
            <span className="truncate">{node.name}</span>
          </div>
          
          <DepthBadge level={node.level} />
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 border-l border-gray-100 ml-5.5 pl-0.5">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      <main className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between shrink-0 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              도움말 메뉴 관리 (FolderManagePage)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              왼쪽에서 메뉴 위치를 선택한 뒤, 오른쪽 그리드에서 드래그 앤 드롭으로 순서를 편집하고 하위 메뉴를 구성합니다.
            </p>
          </div>

          <div className="flex flex-col items-end justify-between gap-2 mt-2 md:mt-0">
            {statusMsg.text && (
              <div className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                {statusMsg.text}
              </div>
            )}
            {isAutoNums && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAllNumbers}
                  className="px-3.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow"
                  title="데이터베이스 내의 전체 메뉴 번호(nums)를 삭제합니다."
                >
                  <span>전체번호 비우기</span>
                </button>
                <button
                  onClick={handleRegenerateAllNumbers}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow"
                  title="데이터베이스 내의 전체 메뉴 번호(nums) 및 정렬 순서를 재정리합니다."
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>전체번호 재생성</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dual Pane Layout Container */}
        <div id="folder-manage-container" className="flex-1 flex overflow-hidden">
          
          {/* Left Pane: Tree View */}
          <div 
            style={{ width: `${treeWidth}px` }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0"
          >
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 gap-1">
              <span className="text-xs font-bold text-slate-700 shrink-0">메뉴 트리</span>
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => handleSelectFolderNode(null)}
                  className={`text-[10px] px-1.5 py-1 rounded border font-semibold cursor-pointer transition-colors ${
                    selectedFolder === null 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  최상위보기
                </button>
                <button
                  onClick={handleExpandAll}
                  className="text-[10px] px-1.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-semibold cursor-pointer transition-colors"
                >
                  모두펼치기
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="text-[10px] px-1.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-semibold cursor-pointer transition-colors"
                >
                  모두접기
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loading && treeData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400">트리 불러오는 중...</span>
                </div>
              ) : treeData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                  등록된 메뉴 폴더가 없습니다.
                </div>
              ) : (
                treeData.map(node => renderTreeNode(node))
              )}
            </div>
          </div>

          {/* Resizer/Splitter */}
          <div
            onMouseDown={handleMouseDown}
            className="w-4 cursor-col-resize flex items-center justify-center group shrink-0 select-none"
            title="드래그하여 트리 너비 조절"
          >
            <div className="w-1 h-16 bg-slate-200 rounded-full group-hover:bg-indigo-400 group-active:bg-indigo-600 transition-all group-hover:w-1.5" />
          </div>

          {/* Right Pane: Grid Editor */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {/* Grid Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-extrabold font-mono">
                  {selectedFolder ? `D${selectedFolder.level} 하위 레벨 메뉴 편집` : 'ROOT LEVEL EDIT'}
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedFolder 
                    ? `[${selectedFolder.nums}] ${selectedFolder.name} 의 하위 메뉴 목록` 
                    : '최상위 대분류 메뉴 목록'}
                </h3>
              </div>

              {/* Grid Actions */}
              <div className="flex items-center gap-1.5 text-xs">
                {isAutoNums && (
                  <button
                    onClick={handleAutoCalcNums}
                    className="px-2.5 py-1.5 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="현재 그리드 내 하위 메뉴들의 번호를 일괄 계산합니다."
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>선택 레벨 번호계산</span>
                  </button>
                )}

                <button
                  onClick={handleAddChildRow}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>메뉴 추가</span>
                </button>
                <button
                  onClick={handleDeleteSelectedRows}
                  disabled={saving}
                  className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>저장</span>
                </button>
              </div>
            </div>

            {/* AG Grid Container */}
            <div className="flex-1 p-5 overflow-hidden flex flex-col">
              <div className="ag-theme-alpine w-full flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
                  columnDefs={columnDefs}
                  theme="legacy"
                  rowSelection={{ mode: 'multiRow' }}
                  rowDragManaged={true}
                  suppressMoveWhenRowDragging={true}
                  animateRows={true}
                  onRowDragEnd={onRowDragEnd}
                  defaultColDef={{
                    resizable: true,
                    sortable: true
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>행의 맨 앞 드래그 핸들을 눌러서 순서를 바꿀 수 있습니다. 순서를 바꾼 뒤 번호 자동계산 버튼을 눌러보세요!</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default FolderManagePage
