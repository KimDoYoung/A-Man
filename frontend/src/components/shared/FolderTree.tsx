import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { Menu, BookOpen, Pin, Folder, FolderOpen, ChevronDown, Filter, ArrowUp, FileText, Plus, Edit2, Trash2 } from 'lucide-react'
import axios from 'axios'
import { FolderNode, OutletContextType, TocItem } from '../../types'

const FolderTree: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // 레이아웃 인터랙션 상태
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tocOpen, setTocOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const [showTopBtn, setShowTopBtn] = useState(false)
  
  // 아코디언 메뉴 상태 (폴더 ID 기준 펼침 상태)
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({})
  
  // 데이터 피드백 상태
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [filterText, setFilterText] = useState('')
  const [tocData, setTocData] = useState<TocItem[]>([])

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    targetId: number | string | null;
    targetName: string;
  }>({
    open: false,
    x: 0,
    y: 0,
    targetId: null,
    targetName: ''
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

  const handleContextMenu = (e: React.MouseEvent, id: number | string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      targetName: name
    })
  }

  // 리사이징 드래그 핸들링
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      // 사이드바 너비를 180px ~ 500px 사이로 제어
      const newWidth = Math.max(180, Math.min(e.clientX, 500))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // 탑 버튼 스크롤 핸들링
  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.pageYOffset > 200)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // 특정 소분류 폴더(3단계) 아래의 페이지들을 가져와 바인딩하는 토글
  const toggleFolder = async (folder: FolderNode, depth: number) => {
    const isOpen = !!expandedFolders[folder.id]
    setExpandedFolders(prev => ({ ...prev, [folder.id]: !isOpen }))

    // 폴더를 여는 경우에만 API 호출하여 페이지 리스트를 가져와 채움
    if (!isOpen && depth === 3 && folder.pages.length === 0) {
      try {
        const response = await axios.get(`/aman/docs/folders/${folder.id}/pages`)
        setFolders(prev => updatePagesInTree(prev, folder.id, response.data))
      } catch (error) {
        console.error('Pages 로드 오류:', error)
      }
    }
  }

  // 트리 재귀 순회를 돌며 특정 폴더에 페이지 목록을 주입하는 함수
  const updatePagesInTree = (nodes: FolderNode[], folderId: number, pages: any[]): FolderNode[] => {
    return nodes.map(node => {
      if (node.id === folderId) {
        return { ...node, pages }
      }
      if (node.children.length > 0) {
        return { ...node, children: updatePagesInTree(node.children, folderId, pages) }
      }
      return node
    })
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
    // 3단계에서는 하위 페이지 펼침 chevron SVG(화살표)가 안보이도록 hasChildren을 children.length > 0으로 설정
    const hasChildren = node.children.length > 0

    return (
      <li key={node.id} className="space-y-1">
        <div 
          onClick={() => toggleFolder(node, depth)}
          onContextMenu={(e) => handleContextMenu(e, node.id, node.name)}
          className={`flex items-center justify-between p-1.5 rounded-md hover:bg-gray-100 cursor-pointer text-gray-800 transition-colors ${
            depth === 1 ? 'font-semibold text-gray-900' : 'text-gray-600'
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
              {node.nums ? `${node.nums} ` : ''}{node.name}
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
            
            {/* 3단계 폴더일 경우, 하위에 속한 도움말 페이지 렌더링 */}
            {depth === 3 && node.pages.map(page => {
              const pageUrl = `/docs/page/${page.id}`
              const isActive = location.pathname === pageUrl
              return (
                <li key={page.id}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(pageUrl)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, `page_${page.id}`, page.title)}
                    className={`block py-1 px-3 ml-14 rounded-md text-xs transition-all border ${
                      isActive 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' 
                        : 'border-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {page.title}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 flex flex-col font-sans select-none antialiased">
      {/* 1. Header 영역 */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-xs shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/docs')}>
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span className="text-base font-bold tracking-tight">
              AssetERP <span className="text-indigo-600">Docs</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-sm">
            Public Manual API
          </span>
          {!tocOpen && (
            <button 
              onClick={() => setTocOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-all cursor-pointer"
              title="목차 열기"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>목차 보기</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. 바디 콘텐츠 컨테이너 */}
      <div className="flex-1 flex items-stretch overflow-hidden">
        
        {/* 2.1 왼쪽 사이드바 (3depth 아코디언 트리) */}
        {sidebarOpen && (
          <aside 
            className="bg-white p-4 shrink-0 flex flex-col overflow-hidden border-r border-gray-200 transition-all duration-75"
            style={{ width: `${sidebarWidth}px` }}
          >
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
          </aside>
        )}

        {/* 2.2 사이드바 폭 드래그 리사이저 */}
        {sidebarOpen && (
          <div 
            className={`w-1 cursor-col-resize hover:bg-indigo-500 active:bg-indigo-600 border-r border-gray-200 transition-colors shrink-0 flex items-center justify-center ${
              isResizing ? 'bg-indigo-500' : 'bg-transparent'
            }`}
            onMouseDown={startResize}
          >
            <div className="w-0.5 h-4 bg-gray-300 rounded-sm"></div>
          </div>
        )}

        {/* 2.3 메인 본문 콘텐츠 및 우측 목차 감싸기 */}
        <div className="flex-1 flex items-start overflow-y-auto relative bg-white">
          <main className="flex-1 p-8 lg:p-12 min-h-full">
            {/* 서브 라우트(Outlet) 렌더링. 목차 상태 및 Setter 제공 */}
            <Outlet context={{ setTocData, tocOpen, setTocOpen } as OutletContextType} />
          </main>

          {/* 2.4 우측 목차 사이드바 (TOC) */}
          {tocOpen && tocData.length > 0 && (
            <aside className="w-64 bg-white border-l border-gray-200 p-4 shrink-0 flex flex-col h-full sticky top-0 z-40">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3 shrink-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">이 페이지의 목차</p>
                <button 
                  onClick={() => setTocOpen(false)}
                  className="p-1 rounded-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                  title="목차 감추기"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 목차 리스트 */}
              <ul className="space-y-1.5 overflow-y-auto flex-1 text-xs text-gray-500 custom-scroll pr-1 select-none">
                {tocData.map((item, idx) => (
                  <li 
                    key={idx}
                    className={`hover:text-gray-900 py-0.5 cursor-pointer transition-colors ${
                      item.level === 1 ? 'font-semibold text-gray-800' : 'pl-3'
                    }`}
                    onClick={() => {
                      const element = document.getElementById(item.id)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

      </div>

      {/* 3. 탑 플로팅 버튼 */}
      {showTopBtn && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all border border-indigo-500 cursor-pointer animate-bounce"
          title="맨 위로 스크롤"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* 4. 우클릭 컨텍스트 메뉴 */}
      {contextMenu.open && (
        <div 
          className="fixed z-[100] w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1 text-xs text-gray-700 font-medium select-none"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              alert(`'${contextMenu.targetName}' 항목 아래에 메뉴를 추가합니다.`);
              setContextMenu(prev => ({ ...prev, open: false }));
            }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-gray-400" />
            <span>아래에 메뉴 추가</span>
          </button>
          <button 
            onClick={() => {
              alert(`'${contextMenu.targetName}' 항목 위에 메뉴를 추가합니다.`);
              setContextMenu(prev => ({ ...prev, open: false }));
            }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-gray-400" />
            <span>위에 메뉴 추가</span>
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button 
            onClick={() => {
              alert(`'${contextMenu.targetName}' 이름 바꾸기 팝업 활성화`);
              setContextMenu(prev => ({ ...prev, open: false }));
            }} 
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
            <span>이름 바꾸기</span>
          </button>
          <button 
            onClick={() => {
              if (confirm(`정말 '${contextMenu.targetName}' 항목을 삭제하시겠습니까?`)) {
                alert(`'${contextMenu.targetName}' 항목이 삭제되었습니다.`);
              }
              setContextMenu(prev => ({ ...prev, open: false }));
            }} 
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 hover:text-red-600 flex items-center space-x-2 text-red-500 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>삭제</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default FolderTree
