import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { Save, ExternalLink, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import FolderTree from '@/components/shared/FolderTree'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import MdTextarea from '@/components/shared/MdTextarea'
import EditorToolbar from '@/components/shared/EditorToolbar'
import FolderBreadcrumbs from '@/components/shared/FolderBreadcrumbs'
import { renderMarkdownToHtml } from '@/utils/markdownRenderer'
import { PageData } from '@/types'

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, using fallback:', err)
    }
  }
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    console.error('Fallback copy failed:', err)
    return false
  }
}

const DocUserMain: React.FC = () => {
  const { page_id, folder_id } = useParams<{ page_id?: string; folder_id?: string }>()
  const navigate = useNavigate()

  // 레이아웃 인터랙션 상태
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [previewWidthPercent, setPreviewWidthPercent] = useState(50)
  const [resizingSidebar, setResizingSidebar] = useState(false)
  const [resizingPreview, setResizingPreview] = useState(false)



  // 문서 데이터 상태
  const [page, setPage] = useState<PageData & { folder?: { id: number; name: string; nums?: string } } | null>(null)
  const [, setPageTitle] = useState('')
  const [pageContent, setPageContent] = useState('')
  const [pageAka, setPageAka] = useState('')
  const [pageStatus, setPageStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')

  // 폴더 계층 구조 정보 상태 (빵부스러기용)
  const [folderHierarchy, setFolderHierarchy] = useState<any[]>([])
  
  // 피드백 상태
  const [, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})

  const isDirty = page ? (
    pageContent !== (page.content || '') || 
    pageAka !== (page.aka || '') ||
    pageStatus !== (page.status || 'DRAFT')
  ) : false

  // 1. 브라우저 새로고침, 탭 닫기, 외부 페이지 이동 차단 (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = '' // 현대 브라우저 표준
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  // 2. React Router 내부 클라이언트 사이드 페이지 전환 차단 (사이드바 폴더/파일 클릭 등)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isLeavingRef.current && currentLocation.pathname !== nextLocation.pathname
  )

  // blocker state가 blocked일 때 렌더링 영역(아래 JSX)에서 커스텀 모달로 처리합니다.

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const isLeavingRef = useRef(false)

  // 1. 문서 상세 데이터 또는 폴더 기준 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!page_id && !folder_id) {
        setPage(null)
        setPageTitle('')
        setPageContent('')
        setPageAka('')
        setPageStatus('DRAFT')
        setFolderHierarchy([])
        return
      }

      setLoading(true)
      setErrorMsg('')
      try {
        let targetFolderId: number | null = null

        if (page_id) {
          const data = await apiClient.get<any>(`/content/${page_id}`)
          setPage(data)
          setPageTitle(data.title)
          setPageContent(data.content)
          setPageAka(data.aka || '')
          setPageStatus(data.status || 'DRAFT')
          targetFolderId = data.folder?.id || null
        } else if (folder_id) {
          const pages = await apiClient.get<any[]>(`/content/folders/${folder_id}/pages`)

          const folder = await apiClient.get<any>(`/docs/folders/${folder_id}`)
          targetFolderId = Number(folder_id)

          if (pages && pages.length > 0) {
            // 리다이렉트하지 않고 바로 첫 번째 페이지를 에디터에 로드하여 URL과 사이드바 활성 상태 유지
            setPage(pages[0])
            setPageTitle(pages[0].title)
            setPageContent(pages[0].content)
            setPageAka(pages[0].aka || '')
            setPageStatus(pages[0].status || 'DRAFT')
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
            setPageStatus('DRAFT')
          }
        }

        // 폴더 계층 구조 로드 (빵부스러기용)
        if (targetFolderId) {
          const hierarchy = await apiClient.get<any[]>(`/docs/folders/${targetFolderId}/hierarchy`)
          setFolderHierarchy(hierarchy)
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
        setPreviewWidthPercent(Math.max(10, Math.min(percent, 90)))
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

  // 사이트 포맷 및 제어 설정 로드
  useEffect(() => {
    apiClient.get<any>('/health')
      .then(data => {
        if (data && data.settings) {
          setSettings(data.settings)
        }
      })
      .catch(err => {
        console.error('Failed to load settings in DocUserMain:', err)
      })
  }, [])

  // F4 -> 메뉴 영역 토글, F9 -> 미리보기 영역 토글 단축키 바인딩
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault()
        setSidebarOpen((prev) => !prev)
      } else if (e.key === 'F9') {
        e.preventDefault()
        setPreviewOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // 스크롤 동기화 (Scroll Sync) 효과
  useEffect(() => {
    const textarea = textareaRef.current
    const preview = previewContainerRef.current
    if (!textarea || !preview) return

    let activeElement: 'editor' | 'preview' | null = null

    const handleEditorScroll = () => {
      if (activeElement === 'preview') return
      const percentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight)
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight)
    }

    const handlePreviewScroll = () => {
      if (activeElement === 'editor') return
      const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight)
      textarea.scrollTop = percentage * (textarea.scrollHeight - textarea.clientHeight)
    }

    const setEditorActive = () => { activeElement = 'editor' }
    const setPreviewActive = () => { activeElement = 'preview' }

    textarea.addEventListener('mouseenter', setEditorActive)
    textarea.addEventListener('focus', setEditorActive)
    textarea.addEventListener('scroll', handleEditorScroll)

    preview.addEventListener('mouseenter', setPreviewActive)
    preview.addEventListener('scroll', handlePreviewScroll)

    return () => {
      textarea.removeEventListener('mouseenter', setEditorActive)
      textarea.removeEventListener('focus', setEditorActive)
      textarea.removeEventListener('scroll', handleEditorScroll)

      preview.removeEventListener('mouseenter', setPreviewActive)
      preview.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [pageContent, previewOpen])

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
        const res = await apiClient.post<{ url: string }>('/content/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const actualUrl = res?.url ?? 'undefined_url_returned'
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
  const handleToggleStatus = () => {
    if (pageStatus === 'DRAFT') {
      if (!pageContent.trim()) {
        alert('내용을 작성한 후에 완료 및 배포 상태로 변경할 수 있습니다.')
        return
      }
      setPageStatus('PUBLISHED')
    } else {
      setPageStatus('DRAFT')
    }
  }

  const handleSave = async (skipNavigate = false): Promise<boolean> => {
    if (!page) return false

    if (pageStatus === 'PUBLISHED' && !pageContent.trim()) {
      alert('내용이 없는 상태에서는 완료 및 배포(PUBLISHED) 상태로 저장할 수 없습니다.')
      return false
    }

    let trimmedAka = pageAka.trim()
    const isCurrentAkaEmpty = !trimmedAka

    if (isCurrentAkaEmpty) {
      setSaving(true)
      try {
        const folderId = page.folder?.id
        const data = await apiClient.get<any>(`/manual/new-aka?folderId=${folderId || ''}`)
        trimmedAka = data.toString().trim()
        setPageAka(trimmedAka)
      } catch (error) {
        console.error('새로운 AKA 발급 실패:', error)
        alert('새 AKA를 발급받지 못했습니다. 수동으로 입력해 주세요.')
        setSaving(false)
        return false
      }
    } else {
      setSaving(true)
    }

    try {
      const folderId = page.folder?.id
      if (!folderId) {
        throw new Error('폴더 정보가 존재하지 않습니다.')
      }

      // 제목은 폴더 이름(nums와 name의 조합 혹은 name)으로 자동 결정
      const folderNums = page.folder?.nums
      const folderName = page.folder?.name || '새 도움말 페이지'
      const titleToSave = folderNums ? `${folderNums} ${folderName}` : folderName

      const trimmedContent = pageContent.trim()

      const savedPage = await apiClient.post<any>('/content', {
        id: page.id,
        folderId: folderId,
        title: titleToSave,
        content: trimmedContent,
        aka: trimmedAka,
        status: pageStatus
      })
      
      setSaveStatus({ type: 'success', text: '변경사항 저장이 완료되었습니다.' })
      setTimeout(() => {
        setSaveStatus((prev) => prev.text === '변경사항 저장이 완료되었습니다.' ? { type: '', text: '' } : prev)
      }, 1000)

      // 저장 완료 후, 페이지 ID를 업데이트하여 신규 상태를 방지하고 폴더 경로 유지
      isLeavingRef.current = true
      setPage(savedPage)
      setPageTitle(savedPage.title)
      setPageContent(savedPage.content)
      setPageAka(savedPage.aka || '')
      setPageStatus(savedPage.status || 'DRAFT')
      if (!skipNavigate) {
        navigate(`/admin/folder/${folderId}`, { replace: true })
      }
      setTimeout(() => {
        isLeavingRef.current = false
      }, 100)
      return true
    } catch (error: any) {
      console.error('저장 실패:', error)
      const errorMsg = error.response?.data?.toString() || '변경사항 저장 중 오류가 발생했습니다.'
      setSaveStatus({ type: 'error', text: errorMsg })
      setTimeout(() => {
        setSaveStatus((prev) => prev.text === errorMsg ? { type: '', text: '' } : prev)
      }, 5000)
      return false
    } finally {
      setSaving(false)
    }
  }

  // 5. 삭제 처리 (Delete)
  const handleDelete = async () => {
    if (!page || !page.id) return

    const confirmDelete = window.confirm('도움말 페이지를 정말로 삭제하시겠습니까?')
    if (!confirmDelete) return

    setDeleting(true)
    setErrorMsg('')
    try {
      const folderId = page.folder?.id || page.folderId
      await apiClient.delete(`/content/${page.id}`)
      
      // 삭제 후 UI 초기 상태 복원 및 해당 폴더 URL로 navigate
      isLeavingRef.current = true
      
      const folder = page.folder
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
      setPageStatus('DRAFT')
      
      if (folderId) {
        navigate(`/admin/folder/${folderId}`)
      } else {
        navigate('/admin')
      }
      
      setTimeout(() => {
        isLeavingRef.current = false
      }, 100)
    } catch (error: any) {
      console.error('삭제 실패:', error)
      setErrorMsg(error.response?.data?.toString() || '도움말 페이지 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
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
          <FolderTree contextMenuEnable={true} isDocUser={true} />
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
                  className="bg-white flex flex-col border-r border-gray-200 shrink-0"
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
                    pageTitle={page?.title || page?.folder?.name || 'document'}
                    pageContent={pageContent}
                    folderId={folder_id || page?.folder?.id?.toString()}
                    onImportSuccess={(importedPage) => {
                      isLeavingRef.current = true;
                      navigate(`/admin/page/${importedPage.id}`);
                      setTimeout(() => {
                        isLeavingRef.current = false;
                      }, 100);
                    }}
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
                    <div ref={previewContainerRef} className="flex-1 p-1 overflow-y-auto custom-scroll bg-slate-50/50">
                      <div className="prose max-w-none bg-white p-2 pb-[50vh] border border-gray-100 rounded-md shadow-xs leading-relaxed min-h-full markdown-content">
                        {renderMarkdownToHtml(pageContent, settings)}
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
                        onClick={async () => {
                          const fullUrl = `${window.location.origin}/aman/manual/${page.aka}`
                          const ok = await copyTextToClipboard(fullUrl)
                          if (ok) {
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          } else {
                            alert('클립보드 복사에 실패했습니다. URL을 직접 선택하여 복사해주세요.')
                          }
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer hover:text-slate-800 transition-colors flex items-center justify-center"
                        title="URL 복사"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (pageStatus === 'PUBLISHED') {
                            const fullUrl = `${window.location.origin}/aman/manual/${page.aka}`
                            window.open(fullUrl, '_blank')
                          }
                        }}
                        disabled={pageStatus !== 'PUBLISHED'}
                        className={`p-1 rounded transition-colors flex items-center justify-center ${
                          pageStatus === 'PUBLISHED'
                            ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer'
                            : 'text-slate-300 cursor-not-allowed opacity-50'
                        }`}
                        title={pageStatus === 'PUBLISHED' ? "새 창에서 열기" : "배포 상태일 때만 새 창에서 열 수 있습니다."}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {copied && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-sm transition-all duration-200 select-none">
                          복사 완료!
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {/* 배포 상태 스위치 (작성 중 / 완료 및 배포) */}
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md select-none">
                    <span className="text-xs font-bold text-slate-500">배포 상태:</span>
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        pageStatus === 'PUBLISHED' ? 'bg-indigo-600' : 'bg-slate-400'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          pageStatus === 'PUBLISHED' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-bold ${pageStatus === 'PUBLISHED' ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {pageStatus === 'PUBLISHED' ? '완료 및 배포' : '작성 중'}
                    </span>
                  </div>

                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={saving || !isDirty}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? '저장 중...' : '변경사항 저장하기'}</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={deleting || !page || !page.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleting ? '삭제 중...' : '삭제하기'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50">
              <p className="text-sm text-gray-400 font-medium">좌측 탐색기 트리에서 편집할 도움말 카테고리를 선택하세요.</p>
            </div>
          )}
        </main>
      </div>

      {/* 3. 변경사항 저장 확인 커스텀 모달 */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] transition-all duration-300">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl border border-slate-100 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-950 mb-2">변경사항 저장</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              작성 중인 도움말 변경 사항이 있습니다. 이동하기 전에 저장하시겠습니까?
            </p>
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  blocker.reset()
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                취소 (편집 계속)
              </button>
              <button
                onClick={() => {
                  blocker.proceed()
                }}
                className="px-3 py-2 text-xs font-semibold text-red-650 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              >
                저장 안 함
              </button>
              <button
                onClick={async () => {
                  const destination = blocker.location
                    ? blocker.location.pathname + (blocker.location.search || '') + (blocker.location.hash || '')
                    : null
                  
                  isLeavingRef.current = true
                  const success = await handleSave(true)
                  if (success && destination) {
                    blocker.reset()
                    navigate(destination)
                  } else {
                    isLeavingRef.current = false
                    blocker.reset()
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                저장 후 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocUserMain
