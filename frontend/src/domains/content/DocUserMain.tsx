import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import axios from 'axios'
import FolderTree from '@/components/shared/FolderTree'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import MdTextarea from '@/components/shared/MdTextarea'
import EditorToolbar from '@/components/shared/EditorToolbar'
import FolderBreadcrumbs from '@/components/shared/FolderBreadcrumbs'
import { renderMarkdownToHtml } from '@/utils/markdownRenderer'
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
  const [pageAka, setPageAka] = useState('')

  // 폴더 계층 구조 정보 상태 (빵부스러기용)
  const [folderHierarchy, setFolderHierarchy] = useState<any[]>([])
  
  // 피드백 상태
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [copied, setCopied] = useState(false)

  const isDirty = page ? (pageContent !== (page.content || '') || pageAka !== (page.aka || '')) : false

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. 문서 상세 데이터 또는 폴더 기준 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!page_id && !folder_id) {
        setPage(null)
        setPageTitle('')
        setPageContent('')
        setPageAka('')
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
          setPageAka(data.aka || '')
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
            setPageAka(pages[0].aka || '')
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
            setPageAka('')
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

  const insertLink = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const url = prompt('URL을 입력하세요:')
    if (!url) return
    insertMarkdown('[', `](${url})`)
  }

  const insertBullet = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const before = text.substring(0, start)
    const selection = text.substring(start, end)
    const after = text.substring(end)

    const bulletList = (selection || '').split('\n').map((l) => `- ${l}`).join('\n')
    setPageContent(before + bulletList + after)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + 2, start + bulletList.length)
    }, 0)
  }

  const insertNumber = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const before = text.substring(0, start)
    const selection = text.substring(start, end)
    const after = text.substring(end)

    const numList = (selection || '').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n')
    setPageContent(before + numList + after)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + 3, start + numList.length)
    }, 0)
  }

  const selectAndUploadImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const placeholderId = Date.now()
      const loadingText = `![Uploading image ${placeholderId}...]()\n`
      
      setPageContent((prev) => {
        return prev.substring(0, start) + loadingText + prev.substring(end)
      })

      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await axios.post<{ url: string }>('/aman/content/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const actualUrl = res.data?.url ?? 'undefined_url_returned'
        const markdownImage = `![image](${actualUrl})\n`
        setPageContent((prev) => prev.replace(loadingText, markdownImage))
      } catch (error) {
        console.error('이미지 업로드 실패:', error)
        alert('이미지 업로드 중 오류가 발생했습니다.')
        setPageContent((prev) => prev.replace(loadingText, ''))
      }
    }
    input.click()
  }

  // 4. 저장 처리 (Upsert)
  const handleSave = async () => {
    if (!page) return

    const hasExistingAka = page.aka && page.aka.trim() !== ''
    const isCurrentAkaEmpty = !pageAka || pageAka.trim() === ''

    if (hasExistingAka && isCurrentAkaEmpty) {
      alert('별칭(AKA)은 빈 값으로 저장할 수 없습니다. 기존 별칭을 유지하거나 새로운 별칭을 입력해주세요.')
      return
    }

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
        content: pageContent,
        aka: pageAka
      })
      const savedPage = response.data
      
      setSaveStatus({ type: 'success', text: '변경사항 저장이 완료되었습니다.' })
      setTimeout(() => {
        setSaveStatus((prev) => prev.text === '변경사항 저장이 완료되었습니다.' ? { type: '', text: '' } : prev)
      }, 3000)

      // 저장 완료 후, 페이지 ID를 업데이트하여 신규 상태를 방지하고 폴더 경로 유지
      setPage(savedPage)
      setPageTitle(savedPage.title)
      setPageContent(savedPage.content)
      setPageAka(savedPage.aka || '')
      navigate(`/admin/folder/${folderId}`, { replace: true })
    } catch (error) {
      console.error('저장 실패:', error)
      setSaveStatus({ type: 'error', text: '변경사항 저장 중 오류가 발생했습니다.' })
      setTimeout(() => {
        setSaveStatus((prev) => prev.text === '변경사항 저장 중 오류가 발생했습니다.' ? { type: '', text: '' } : prev)
      }, 3000)
    } finally {
      setSaving(false)
    }
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
          <FolderBreadcrumbs folderHierarchy={folderHierarchy} />

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
                {page.folder 
                  ? `${page.folder.name}${page.folder.nums ? `(${page.folder.nums})` : ''}` 
                  : '새 도움말 페이지'}
              </h1>
            ) : (
              <h1 className="text-xl font-bold text-gray-400">편집할 메뉴를 선택하십시오.</h1>
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
                  <EditorToolbar
                    insertMarkdown={insertMarkdown}
                    insertLink={insertLink}
                    insertBullet={insertBullet}
                    insertNumber={insertNumber}
                    selectAndUploadImage={selectAndUploadImage}
                    aka={pageAka}
                    onAkaChange={setPageAka}
                    previewOpen={previewOpen}
                    setPreviewOpen={setPreviewOpen}
                  />

                  {/* 텍스트 편집창 */}
                  <MdTextarea
                    value={pageContent}
                    onChange={setPageContent}
                    onSave={handleSave}
                    textareaRef={textareaRef}
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
                      <div className="prose max-w-none bg-white p-6 border border-gray-100 rounded-md shadow-xs leading-relaxed min-h-full markdown-content">
                        {renderMarkdownToHtml(pageContent)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 저장 액션바 */}
              <div className="mt-3 flex items-center justify-between shrink-0 select-none">
                {/* 상태 알림 또는 AKA URL 복사 영역 */}
                <div className="flex items-center space-x-3">
                  {saveStatus.type === 'success' && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-md flex items-center space-x-1">
                      ✅ {saveStatus.text}
                    </span>
                  )}
                  {saveStatus.type === 'error' && (
                    <span className="text-xs font-medium text-red-650 bg-red-50 border border-red-100 px-3 py-1.5 rounded-md flex items-center space-x-1">
                      ❌ {saveStatus.text}
                    </span>
                  )}
                  
                  {!saveStatus.type && page && page.aka && (
                    <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] bg-slate-200 px-1 py-0.5 rounded mr-1">URL</span>
                      <span className="font-mono text-slate-700 select-all">{`${window.location.origin}/aman/manual/${page.aka}`}</span>
                      <button
                        onClick={() => {
                          const fullUrl = `${window.location.origin}/aman/manual/${page.aka}`;
                          navigator.clipboard.writeText(fullUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer hover:text-slate-800 transition-colors flex items-center justify-center"
                        title="URL 복사"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </button>
                      {copied && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-sm transition-all duration-200 select-none">
                          복사 완료!
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving || !isDirty}
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
