import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Save, ChevronRight, Bold, Code } from 'lucide-react'
import axios from 'axios'
import FolderTree from '@/components/shared/FolderTree'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import MdTextarea from '@/components/shared/MdTextarea'
import { PageData } from '@/types'

const DocUserMain: React.FC = () => {
  const { page_id, folder_id } = useParams<{ page_id?: string; folder_id?: string }>()
  const navigate = useNavigate()

  // 레이아웃 인터랙션 상태
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [previewWidthPercent, setPreviewWidthPercent] = useState(50)
  const [resizingSidebar, setResizingSidebar] = useState(false)
  const [resizingPreview, setResizingPreview] = useState(false)



  // 문서 데이터 상태
  const [page, setPage] = useState<PageData & { folder?: { id: number; name: string; nums?: string } } | null>(null)
  const [pageTitle, setPageTitle] = useState('')
  const [pageContent, setPageContent] = useState('')

  // 폴더 계층 구조 정보 상태 (빵부스러기용)
  const [folderHierarchy, setFolderHierarchy] = useState<any[]>([])
  
  // 피드백 상태
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. 문서 상세 데이터 또는 폴더 기준 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!page_id && !folder_id) {
        setPage(null)
        setPageTitle('')
        setPageContent('')
        setFolderHierarchy([])
        return
      }

      setLoading(true)
      setErrorMsg('')
      try {
        let targetFolderId: number | null = null

        if (page_id) {
          const response = await axios.get(`/aman/docs/${page_id}`)
          const data = response.data
          setPage(data)
          setPageTitle(data.title)
          setPageContent(data.content)
          targetFolderId = data.folder?.id || null
        } else if (folder_id) {
          const pagesRes = await axios.get(`/aman/docs/folders/${folder_id}/pages`)
          const pages = pagesRes.data

          const folderRes = await axios.get(`/aman/docs/folders/${folder_id}`)
          const folder = folderRes.data
          targetFolderId = Number(folder_id)

          if (pages && pages.length > 0) {
            // 리다이렉트하지 않고 바로 첫 번째 페이지를 에디터에 로드하여 URL과 사이드바 활성 상태 유지
            setPage(pages[0])
            setPageTitle(pages[0].title)
            setPageContent(pages[0].content)
          } else {
            // 페이지가 없는 빈 폴더인 경우 신규 작성을 유도
            setPage({
              id: undefined as any,
              title: '',
              content: '',
              folder: folder,
              sortOrder: 0
            })
            setPageTitle('')
            setPageContent('')
          }
        }

        // 폴더 계층 구조 로드 (빵부스러기용)
        if (targetFolderId) {
          const hierarchyRes = await axios.get(`/aman/docs/folders/${targetFolderId}/hierarchy`)
          setFolderHierarchy(hierarchyRes.data)
        } else {
          setFolderHierarchy([])
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error)
        setErrorMsg('데이터를 불러오는 중 오류가 발생했습니다.')
        setFolderHierarchy([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [page_id, folder_id, navigate])

  // 2. 더블 스플리터 드래그 핸들링
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingSidebar) {
        const newWidth = Math.max(180, Math.min(e.clientX, 400))
        setSidebarWidth(newWidth)
      }
      if (resizingPreview && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const relativeX = e.clientX - rect.left
        const percent = (relativeX / rect.width) * 100
        setPreviewWidthPercent(Math.max(20, Math.min(percent, 80)))
      }
    }

    const handleMouseUp = () => {
      setResizingSidebar(false)
      setResizingPreview(false)
    }

    if (resizingSidebar || resizingPreview) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingSidebar, resizingPreview])

  // 3. 마크다운 태그 추가 헬퍼
  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const before = text.substring(0, start)
    const selection = text.substring(start, end)
    const after = text.substring(end)

    const replacement = prefix + (selection || '') + suffix
    setPageContent(before + replacement + after)

    // 커서 포커스 및 범위 재설정
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selection.length)
    }, 0)
  }

  // 4. 저장 처리 (Upsert)
  const handleSave = async () => {
    if (!page) return

    setSaving(true)
    try {
      const folderId = page.folder?.id
      if (!folderId) {
        throw new Error('폴더 정보가 존재하지 않습니다.')
      }

      // 제목은 폴더 이름(nums와 name의 조합 혹은 name)으로 자동 결정
      const folderNums = page.folder?.nums
      const folderName = page.folder?.name || '새 도움말 페이지'
      const titleToSave = folderNums ? `${folderNums} ${folderName}` : folderName

      const response = await axios.post('/aman/content', {
        id: page.id,
        folderId: folderId,
        title: titleToSave,
        content: pageContent
      })
      const savedPage = response.data
      alert('변경사항 저장이 완료되었습니다.')



      // 저장 완료 후, 페이지 ID를 업데이트하여 신규 상태를 방지하고 폴더 경로 유지
      setPage(savedPage)
      setPageTitle(savedPage.title)
      setPageContent(savedPage.content)
      navigate(`/admin/folder/${folderId}`, { replace: true })
    } catch (error) {
      console.error('저장 실패:', error)
      alert('변경사항 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 5. 초경량 마크다운 렌더러
  const renderMarkdownToHtml = (md: string) => {
    if (!md.trim()) return <p className="text-gray-400 italic">내용이 비어있습니다.</p>
    const lines = md.split('\n')
    let inList = false
    const elements: React.ReactNode[] = []

    lines.forEach((line, idx) => {
      const trimmed = line.trim()

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        inList = true
        const text = trimmed.substring(2)
        elements.push(
          <li key={`li-${idx}`} className="list-disc ml-5 text-slate-600 text-sm mb-1">
            {parseInlineStyles(text)}
          </li>
        )
        return
      } else if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ') && trimmed !== '') {
        inList = false
      }

      if (trimmed.startsWith('# ')) {
        const text = trimmed.substring(2)
        elements.push(
          <h1 key={`h1-${idx}`} className="text-xl font-bold text-slate-900 mt-6 mb-3 pb-1 border-b border-slate-200">
            {parseInlineStyles(text)}
          </h1>
        )
      } else if (trimmed.startsWith('## ')) {
        const text = trimmed.substring(3)
        elements.push(
          <h2 key={`h2-${idx}`} className="text-lg font-bold text-slate-900 mt-5 mb-2">
            {parseInlineStyles(text)}
          </h2>
        )
      } else if (trimmed.startsWith('### ')) {
        const text = trimmed.substring(4)
        elements.push(
          <h3 key={`h3-${idx}`} className="text-base font-semibold text-slate-800 mt-4 mb-2">
            {parseInlineStyles(text)}
          </h3>
        )
      } else if (trimmed.startsWith('> ')) {
        const text = trimmed.substring(2)
        elements.push(
          <blockquote key={`quote-${idx}`} className="border-l-4 border-indigo-500 pl-4 py-1.5 bg-slate-50 text-slate-600 italic my-3 text-sm rounded-r">
            {parseInlineStyles(text)}
          </blockquote>
        )
      } else if (trimmed === '---') {
        elements.push(<hr key={`hr-${idx}`} className="my-4 border-t border-slate-200" />)
      } else if (trimmed !== '') {
        elements.push(
          <p key={`p-${idx}`} className="text-slate-600 text-sm leading-relaxed mb-3">
            {parseInlineStyles(trimmed)}
          </p>
        )
      }
    })

    return elements
  }

  const parseInlineStyles = (text: string): React.ReactNode => {
    const boldRegex = /\*\*(.*?)\*\*/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(text)) !== null) {
      const matchIndex = match.index
      const matchText = match[1]

      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex))
      }
      parts.push(<strong key={`b-${matchIndex}`} className="font-bold text-slate-900">{matchText}</strong>)
      lastIndex = boldRegex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? <>{parts}</> : text
  }

  return (
    <div className="bg-gray-100 text-gray-900 font-sans antialiased select-none h-screen flex flex-col">
      {/* 1. Header 영역 */}
      <DocUserTopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* 2. 메인 컨테이너 영역 */}
      <div className="flex flex-1 overflow-hidden items-stretch">
        {/* 2.1 왼쪽 트리 내비게이션 */}
        <aside
          className={`bg-white p-4 flex flex-col shrink-0 overflow-hidden border-r border-gray-200 ${
            sidebarOpen ? '' : 'hidden'
          }`}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* 관리자 모드이므로 contextMenuEnable={true} 전달 */}
          <FolderTree contextMenuEnable={true} />
        </aside>

        {/* 2.2 1번 스플리터 (사이드바 - 본문용) */}
        <div
          className={`w-1.5 cursor-col-resize hover:bg-indigo-500 border-r border-gray-200 transition-colors shrink-0 flex items-center justify-center z-20 ${
            sidebarOpen ? '' : 'hidden'
          } ${resizingSidebar ? 'bg-indigo-500' : 'bg-transparent'}`}
          onMouseDown={() => setResizingSidebar(true)}
        >
          <div className="w-0.5 h-4 bg-gray-300 rounded-sm"></div>
        </div>

        {/* 2.3 중앙 본문 및 에디터 영역 */}
        <main className="flex-1 bg-white p-6 flex flex-col overflow-hidden">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-[11px] text-gray-400 font-medium mb-2.5 shrink-0">
            {folderHierarchy.length > 0 ? (
              folderHierarchy.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                  <span className={idx === folderHierarchy.length - 1 ? "text-indigo-600 font-semibold" : "text-gray-400 font-medium"}>
                    {item.nums ? `${item.nums} ` : ''}{item.name}
                  </span>
                </React.Fragment>
              ))
            ) : (
              <>
                <span className="hover:text-gray-600 cursor-pointer">시스템 설정</span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className="text-gray-400 font-medium">도움말</span>
              </>
            )}
          </nav>

          {/* 비어있는 상태 알림 */}
          {page && !page.id && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-md text-xs flex items-center justify-between shrink-0">
              <span>⚠️ 현재 이 카테고리에 도움말 페이지가 비어 있습니다. 아래에 내용을 작성하여 새 도움말을 저장하십시오.</span>
            </div>
          )}

          {/* 에러 메시지 표시 */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-800 rounded-md text-xs shrink-0">
              {errorMsg}
            </div>
          )}

          {/* 문서 제목 표시 */}
          <div className="mb-4 shrink-0 flex items-center justify-between border-b border-gray-100 pb-2">
            {page ? (
              <h1 className="text-xl font-bold text-gray-900">
                {page.folder ? `${page.folder.nums ? page.folder.nums + ' ' : ''}${page.folder.name}` : '새 도움말 페이지'}
              </h1>
            ) : (
              <h1 className="text-xl font-bold text-gray-400">편집할 도움말 카테고리를 선택하십시오.</h1>
            )}
          </div>

          {page ? (
            <>
              {/* 스플릿 편집 및 미리보기 컨테이너 */}
              <div
                ref={containerRef}
                className="flex-1 flex border border-gray-200 rounded-lg overflow-hidden bg-gray-100 items-stretch relative"
              >
                {/* 왼쪽: 에디터 */}
                <div
                  className="bg-white flex flex-col border-r border-gray-200"
                  style={{ width: previewOpen ? `${previewWidthPercent}%` : '100%' }}
                >
                  {/* 에디터 툴바 */}
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-gray-500 shrink-0 select-none">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => insertMarkdown('# ')}
                        className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-2 cursor-pointer"
                        title="H1 헤더 추가"
                      >
                        H1
                      </button>
                      <button
                        onClick={() => insertMarkdown('## ')}
                        className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-2 cursor-pointer"
                        title="H2 헤더 추가"
                      >
                        H2
                      </button>
                      <span className="w-px h-3.5 bg-gray-300"></span>
                      <button
                        onClick={() => insertMarkdown('**', '**')}
                        className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
                        title="굵게"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertMarkdown('`', '`')}
                        className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
                        title="코드"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 미리보기 토글 */}
                    <button
                      onClick={() => setPreviewOpen(!previewOpen)}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-600 flex items-center space-x-1 cursor-pointer"
                    >
                      {previewOpen ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>미리보기 숨기기</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>미리보기 보이기</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 텍스트 편집창 */}
                  <textarea
                    ref={textareaRef}
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    placeholder="이곳에 도움말 문서를 마크다운 형식으로 편집하세요..."
                    className="flex-1 p-4 font-mono text-xs resize-none focus:outline-hidden leading-relaxed bg-white custom-scroll"
                    disabled={loading}
                  />
                </div>

                {/* 2번 스플리터 (에디터 - 프리뷰용) */}
                {previewOpen && (
                  <div
                    className={`w-1.5 cursor-col-resize hover:bg-indigo-500 border-r border-gray-200 transition-colors shrink-0 flex items-center justify-center z-20 ${
                      resizingPreview ? 'bg-indigo-500' : 'bg-transparent'
                    }`}
                    onMouseDown={() => setResizingPreview(true)}
                  >
                    <div className="w-0.5 h-4 bg-gray-300 rounded-sm"></div>
                  </div>
                )}

                {/* 오른쪽: 라이브 프리뷰 */}
                {previewOpen && (
                  <div className="bg-slate-50 flex flex-col flex-1">
                    <div className="bg-slate-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-gray-500 shrink-0 select-none">
                      <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-bold tracking-wider">
                        LIVE PREVIEW
                      </span>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto custom-scroll bg-slate-50/50">
                      <div className="prose max-w-none bg-white p-5 border border-gray-100 rounded-md shadow-xs font-mono text-xs whitespace-pre-wrap leading-relaxed min-h-full">
                        {renderMarkdownToHtml(pageContent)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 저장 액션바 */}
              <div className="mt-3 flex justify-end shrink-0 select-none">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  disabled={saving}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? '저장 중...' : '변경사항 저장하기 (Upsert)'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50">
              <p className="text-sm text-gray-400 font-medium">좌측 탐색기 트리에서 편집할 도움말 카테고리를 선택하세요.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default DocUserMain
