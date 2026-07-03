import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Folder, FolderOpen, ChevronDown, FileText } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { FolderNode } from '@/types'
import FolderTreeContextMenu from '@/components/shared/FolderTreeContextMenu'
import FilterInput from '@/components/shared/FilterInput'

interface FolderTreeProps {
  contextMenuEnable?: boolean;
  isDocUser?: boolean;
}

const FolderTree: React.FC<FolderTreeProps> = ({ contextMenuEnable = true, isDocUser = false }) => {
  const filterInputRef = useRef<HTMLInputElement>(null)
  const isContextMenuDisabled = true; // [요구사항 반영] 컨텍스트 메뉴 비활성화 플래그
  const navigate = useNavigate()
  const location = useLocation()
  
  // 아코디언 메뉴 상태 (폴더 ID 기준 펼침 상태)
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({})
  
  // 데이터 피드백 상태
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [filterText, setFilterText] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [settings, setSettings] = useState<Record<string, string>>({})

  // 사이트 포맷 설정 로드
  useEffect(() => {
    apiClient.get<any>('/health')
      .then(data => {
        if (data && data.settings) {
          setSettings(data.settings)
        }
      })
      .catch(err => {
        console.error('Failed to load settings in FolderTree:', err)
      })
  }, [])

  // Listen for global '+' key to clear search and focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+') {
        const activeEl = document.activeElement
        const isEditing = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          activeEl.getAttribute('contenteditable') === 'true'
        )

        // If the active element is our search input, or if the user is not focusing any editable element:
        if (activeEl === filterInputRef.current || !isEditing) {
          e.preventDefault()
          setSearchInput('')
          setFilterText('')
          filterInputRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  const formatNodeName = (node: FolderNode) => {
    const defaultFormat = isDocUser 
      ? '{nums} {name} ({sort_order})' 
      : '{nums} {name}'
    const fmt = isDocUser 
      ? (settings.DOC_USER_TREE_FORMAT || defaultFormat)
      : (settings.NORMAL_USER_TREE_FORMAT || defaultFormat)

    const numsVal = node.nums || ''
    const nameVal = node.name || ''
    const sortOrderVal = String(node.sortOrder || 0)

    let result = fmt
      .replace('{nums}', numsVal)
      .replace('{name}', nameVal)
      .replace('{sort_order}', sortOrderVal)

    if (!numsVal) {
      result = result.replace(/^\s+/, '').replace(/\s+/g, ' ')
    }
    return result.trim()
  }

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    targetId: number | string | null;
    targetName: string;
    targetDepth: number;
  }>({
    open: false,
    x: 0,
    y: 0,
    targetId: null,
    targetName: '',
    targetDepth: 1
  })

  // 우클릭 컨텍스트 메뉴 닫기 핸들러
  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(prev => prev.open ? { ...prev, open: false } : prev)
    }
    window.addEventListener('click', closeMenu)
    window.addEventListener('contextmenu', closeMenu)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('contextmenu', closeMenu)
    }
  }, [])

  const handleContextMenu = (e: React.MouseEvent, id: number | string, name: string, depth: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      targetName: name,
      targetDepth: depth
    })
  }

  // 1. 폴더 목록 데이터 로드 (필터 변경 시 재로드)
  useEffect(() => {
    let active = true

    const fetchFolders = async () => {
      try {
        let url = '/docs/folders'
        if (filterText.trim()) {
          url += `?filter=${encodeURIComponent(filterText)}`
        }
        const rawData = await apiClient.get<any>(url)
        if (!active) return

        // 2. 계층형 트리(대-중-소) 구조 생성 조립
        const tree = buildFolderTree(rawData)
        setFolders(tree)

        // 필터링이 입력된 경우, 모든 폴더 노드를 자동으로 열림 처리
        if (filterText.trim()) {
          const autoExpanded: Record<number, boolean> = {}
          rawData.forEach((f: any) => {
            autoExpanded[f.id] = true
          })
          setExpandedFolders(autoExpanded)
        }
      } catch (error) {
        if (active) {
          console.error('Folders 로딩 실패:', error)
        }
      }
    }

    fetchFolders()

    return () => {
      active = false
    }
  }, [filterText])

  // Flat 리스트 또는 이미 트리인 데이터를 안전하게 3 depth 계층형 트리로 변환하는 함수
  const buildFolderTree = (inputList: any[]): FolderNode[] => {
    const flatList: any[] = [];
    
    // 1. 트리 구조일 수 있는 입력 데이터를 재귀적으로 평탄화(Flatten)
    const flatten = (items: any[]) => {
      if (!items) return;
      items.forEach(item => {
        flatList.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      });
    };
    flatten(inputList);

    const map: Record<number, FolderNode> = {}
    const roots: FolderNode[] = []

    // 2. 평탄화된 모든 아이템을 map에 등록
    flatList.forEach((item) => {
      const parentId = item.parentId !== undefined ? item.parentId : (item.parent ? item.parent.id : null);
      map[item.id] = {
        id: item.id,
        nums: item.nums,
        name: item.name,
        level: item.level,
        parentId: parentId,
        sortOrder: item.sortOrder || 0,
        children: [],
        pages: item.pages || []
      }
    })

    // 3. 부모-자식 관계 재조립 (중복 추가 방지)
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
        } else {
          // 필터링 등으로 인해 부모 노드가 목록에 없는 경우,
          // 노드가 유실되지 않도록 최상위(roots)로 노출시킵니다.
          if (!roots.some(r => r.id === node.id)) {
            roots.push(node)
          }
        }
      }
    })

    return roots.sort((a, b) => a.sortOrder - b.sortOrder)
  };

  // 특정 폴더 토글 및 경로 이동
  const toggleFolder = (folder: FolderNode) => {
    const isOpen = !!expandedFolders[folder.id]
    setExpandedFolders(prev => ({ ...prev, [folder.id]: !isOpen }))

    const isAdmin = location.pathname.startsWith('/admin')
    if (isAdmin) {
      navigate(`/admin/folder/${folder.id}`)
    } else {
      navigate(`/docs/folder/${folder.id}`)
    }
  }

  // 폴더 전체 열기 / 전체 닫기 헬퍼
  const expandAll = () => {
    const expanded: Record<number, boolean> = {}
    const traverse = (nodes: FolderNode[]) => {
      nodes.forEach(n => {
        expanded[n.id] = true
        traverse(n.children)
      })
    }
    traverse(folders)
    setExpandedFolders(expanded)
  }

  const collapseAll = () => {
    setExpandedFolders({})
  }

  // 3 depth 트리 노드 아코디언 재귀 렌더러
  const renderFolderNode = (node: FolderNode, depth: number = 1) => {
    const isExpanded = !!expandedFolders[node.id]
    const hasChildren = node.children.length > 0
    const isAdmin = location.pathname.startsWith('/admin')
    const isFolderActive = 
      (isAdmin && location.pathname === `/admin/folder/${node.id}`) ||
      (!isAdmin && location.pathname === `/docs/folder/${node.id}`)

    return (
      <li key={node.id} className="space-y-1">
        <div 
          onClick={() => toggleFolder(node)}
          onContextMenu={(contextMenuEnable && !isContextMenuDisabled) ? (e) => handleContextMenu(e, node.id, node.name, depth) : undefined}
          className={`flex items-center justify-between p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
            isFolderActive
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-semibold'
              : depth === 1 ? 'font-semibold text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'
          }`}
          style={{ 
            paddingLeft: depth === 3 
              ? '42px' 
              : `${(depth - 1) * 16 + 6}px` 
          }}
        >
          <div className="flex items-center">
            {depth === 3 ? (
              <FileText className="w-3.5 h-3.5 mr-2 text-slate-400 dark:text-slate-500" />
            ) : isExpanded ? (
              <FolderOpen className={`w-3.5 h-3.5 mr-2 ${depth === 1 ? 'text-indigo-500 dark:text-indigo-400' : 'text-amber-500 dark:text-amber-600'}`} />
            ) : (
              <Folder className="w-3.5 h-3.5 mr-2 text-gray-400 dark:text-slate-500" />
            )}
            <span>
              {formatNodeName(node)}
            </span>
          </div>
          {hasChildren && (
            <ChevronDown 
              className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} 
            />
          )}
        </div>

        {isExpanded && (
          <ul className="space-y-1">
            {/* 자식 폴더 렌더링 */}
            {node.children.map(child => renderFolderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <>
      <div className="mb-3 pb-2 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">메뉴 내비게이션</p>
        <div className="flex items-center space-x-1.5">
            <FilterInput 
              value={searchInput} 
              onChange={setSearchInput} 
              onSearch={(val) => setFilterText(val)} 
              inputRef={filterInputRef}
            />
          
          <button 
            onClick={expandAll} 
            className="p-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 cursor-pointer"
            title="전체 펼치기"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={collapseAll} 
            className="p-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 cursor-pointer"
            title="전체 접기"
          >
            <Folder className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 계층 트리 리스트 */}
      <ul className="space-y-1 overflow-y-auto flex-1 text-xs whitespace-nowrap custom-scroll pr-1">
        {folders.map(root => renderFolderNode(root, 1))}
      </ul>

      {/* 우클릭 컨텍스트 메뉴 */}
      {(contextMenuEnable && !isContextMenuDisabled) && (
        <FolderTreeContextMenu
          open={contextMenu.open}
          x={contextMenu.x}
          y={contextMenu.y}
          targetName={contextMenu.targetName}
          targetDepth={contextMenu.targetDepth}
          onClose={() => setContextMenu(prev => ({ ...prev, open: false }))}
        />
      )}
    </>
  )
}

export default FolderTree
