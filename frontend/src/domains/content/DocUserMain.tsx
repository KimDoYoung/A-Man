import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Save, ChevronRight, Bold, Code } from 'lucide-react'
import axios from 'axios'
import FolderTree from '@/components/shared/FolderTree'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import { PageData } from '@/types'

const DocUserMain: React.FC = () => {
  const { page_id } = useParams<{ page_id: string }>()
  const navigate = useNavigate()

  // 레이아웃 인터랙션 상태
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [previewWidthPercent, setPreviewWidthPercent] = useState(50)
  const [resizingSidebar, setResizingSidebar] = useState(false)
  const [resizingPreview, setResizingPreview] = useState(false)

  // 문서 데이터 상태
  const [page, setPage] = useState<PageData & { folder?: { id: number; name: string } } | null>(null)
  const [pageTitle, setPageTitle] = useState('')
  const [pageContent, setPageContent] = useState('')
  
  // 피드백 상태
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. 문서 상세 데이터 로드
  useEffect(() => {
    const fetchPageDetail = async () => {
      if (!page_id) {
        setPage(null)
        setPageTitle('')
        setPageContent('')
        return
      }

      setLoading(true)
      setErrorMsg('')
      try {
        const response = await axios.get(`/aman/docs/${page_id}`)
        const data = response.data
        setPage(data)
        setPageTitle(data.title)
        setPageContent(data.content)
      } catch (error) {
        console.error('문서 로드 오류:', error)
        setErrorMsg('문서 데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchPageDetail()
  }, [page_id])

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
    if (!pageTitle.trim()) {
      alert('문서 제목을 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      const folderId = page.folder?.id
      if (!folderId) {
        throw new Error('폴더 정보가 존재하지 않습니다.')
      }

      await axios.post('/aman/content', {
        id: page.id,
        folderId: folderId,
        title: pageTitle,
        content: pageContent
      })
      alert('변경사항 저장이 완료되었습니다.')
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
        {sidebarOpen && (
          <aside
            className="bg-white p-4 flex flex-col shrink-0 overflow-hidden border-r border-gray-200"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* 관리자 모드이므로 contextMenuEnable={true} 전달 */}
            <FolderTree contextMenuEnable={true} />
          </aside>
        )}

        {/* 2.2 1번 스플리터 (사이드바 - 본문용) */}
        {sidebarOpen && (
          <div
            className={`w-1.5 cursor-col-resize hover:bg-indigo-500 border-r border-gray-200 transition-colors shrink-0 flex items-center justify-center z-20 ${
              resizingSidebar ? 'bg-indigo-500' : 'bg-transparent'
            }`}
            onMouseDown={() => setResizingSidebar(true)}
          >
            <div className="w-0.5 h-4 bg-gray-300 rounded-sm"></div>
          </div>
        )}

        {/* 2.3 중앙 본문 및 에디터 영역 */}
        <main className="flex-1 bg-white p-6 flex flex-col overflow-hidden">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-[11px] text-gray-400 font-medium mb-2.5 shrink-0">
            <span className="hover:text-gray-600 cursor-pointer">시스템 설정</span>
            {page?.folder && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className="hover:text-gray-600 cursor-pointer">{page.folder.name}</span>
              </>
            )}
            {pageTitle && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className="text-indigo-600 font-semibold">{pageTitle}</span>
              </>
            )}
          </nav>

          {/* 문서 제목 편집 */}
          <div className="mb-4 shrink-0 flex items-center justify-between border-b border-gray-100 pb-2">
            {page ? (
              <input
                type="text"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="문서 제목을 입력하세요"
                className="text-xl font-bold text-gray-900 bg-transparent focus:outline-hidden w-full"
                disabled={loading}
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-400">편집할 도움말 문서를 선택하십시오.</h1>
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
