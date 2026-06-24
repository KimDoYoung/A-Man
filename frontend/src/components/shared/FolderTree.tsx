import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Folder, FolderOpen, ChevronDown, Filter } from 'lucide-react'
import axios from 'axios'
import { FolderNode, TocItem } from '@/types'
import FolderTreeContextMenu from '@/components/shared/FolderTreeContextMenu'

interface FolderTreeProps {
  contextMenuEnable?: boolean;
}

const FolderTree: React.FC<FolderTreeProps> = ({ contextMenuEnable = true }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // 아코디언 메뉴 상태 (폴더 ID 기준 펼침 상태)
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({})
  
  // 데이터 피드백 상태
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [filterText, setFilterText] = useState('')

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
    const fetchFolders = async () => {
      try {
        let url = '/aman/docs/folders'
        if (filterText.trim()) {
          url += `?filter=${encodeURIComponent(filterText)}`
        }
        const response = await axios.get(url)
        const rawData = response.data

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
        console.error('Folders 로딩 실패:', error)
      }
    }

    fetchFolders()
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
        }
      }
    })

    return roots.sort((a, b) => a.sortOrder - b.sortOrder)
  };

  // 특정 폴더 토글 및 경로 이동
  const toggleFolder = (folder: FolderNode, depth: number) => {
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
          onClick={() => toggleFolder(node, depth)}
          onContextMenu={contextMenuEnable ? (e) => handleContextMenu(e, node.id, node.name, depth) : undefined}
          className={`flex items-center justify-between p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors ${
            isFolderActive
              ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold'
              : depth === 1 ? 'font-semibold text-gray-900' : 'text-gray-600'
          }`}
          style={{ 
            paddingLeft: depth === 3 
              ? '42px' 
              : `${(depth - 1) * 16 + 6}px` 
          }}
        >
          <div className="flex items-center">
            {depth === 3 ? null : isExpanded ? (
              <FolderOpen className={`w-3.5 h-3.5 mr-2 ${depth === 1 ? 'text-indigo-500' : 'text-amber-500'}`} />
            ) : (
              <Folder className="w-3.5 h-3.5 mr-2 text-gray-400" />
            )}
            <span>
              {node.name}{node.nums ? `(${node.nums})` : ''}
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
      <div className="mb-3 pb-2 border-b border-gray-100 shrink-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">메뉴 내비게이션</p>
        <div className="flex items-center space-x-1.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400">
              <Filter className="w-3.5 h-3.5" />
            </span>
            <input 
              type="text" 
              placeholder="필터링..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-hidden focus:bg-white focus:border-indigo-500 transition-all"
            />
          </div>
          
          <button 
            onClick={expandAll} 
            className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-500 border border-gray-200 cursor-pointer"
            title="전체 펼치기"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={collapseAll} 
            className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-500 border border-gray-200 cursor-pointer"
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
      {contextMenuEnable && (
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
