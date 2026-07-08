import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import FolderTree from '@/components/shared/FolderTree'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import FolderBreadcrumbs from '@/components/shared/FolderBreadcrumbs'
import { PageData } from '@/types'
import UnsavedChangesModal from './components/UnsavedChangesModal'
import EditorActionBar from './components/EditorActionBar'
import MarkdownSplitEditor from './components/MarkdownSplitEditor'
import { useRecentPagesStore } from '@/store/useRecentPagesStore'
import ActionImageEditor from '@/components/imageditor/ActionImageEditor'

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
  const addPage = useRecentPagesStore((state) => state.addPage)

  // 레이아웃 인터랙션 상태
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false)
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

  // 메뉴 변경 시 메인 콘텐츠 영역 및 윈도우 스크롤을 최상단으로 리셋
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    
    const mainEl = document.querySelector('main')
    if (mainEl && mainEl.parentElement) {
      mainEl.parentElement.scrollTop = 0
    }
  }, [page_id, folder_id])

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
      
      // 저장 성공 시 최근 작업 문서(work_stack) 데이터베이스 등록
      addPage(folderId)

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
      <DocUserTopBar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        onOpenImageEditor={() => setIsImageEditorOpen(true)}
        isImageEditorOpen={isImageEditorOpen}
        onCloseImageEditor={() => setIsImageEditorOpen(false)}
      />

      {/* 2. 메인 컨테이너 영역 */}
      <div className="flex flex-1 overflow-hidden items-stretch">
        {/* 이미지 편집기 (상태 유지를 위해 display hidden 처리로 DOM 상주) */}
        <div className={`flex-1 flex flex-col overflow-hidden ${isImageEditorOpen ? '' : 'hidden'}`}>
          <ActionImageEditor
            isOpen={isImageEditorOpen}
          />
        </div>

        {/* 도움말 폴더/에디터 영역 (이미지 편집기가 열리면 hidden 처리) */}
        <div className={`flex-1 flex overflow-hidden items-stretch ${isImageEditorOpen ? 'hidden' : ''}`}>
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
                <span>⚠️ 현재 이 메뉴에 도움말 페이지가 비어 있습니다. 아래에 내용을 작성하여 새 도움말을 저장하십시오.</span>
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
                <MarkdownSplitEditor
                  page={page}
                  pageContent={pageContent}
                  setPageContent={setPageContent}
                  pageAka={pageAka}
                  setPageAka={setPageAka}
                  previewOpen={previewOpen}
                  setPreviewOpen={setPreviewOpen}
                  previewWidthPercent={previewWidthPercent}
                  resizingPreview={resizingPreview}
                  setResizingPreview={setResizingPreview}
                  pageTitle={page?.title || page?.folder?.name || 'document'}
                  folderId={folder_id || page?.folder?.id?.toString()}
                  settings={settings}
                  insertMarkdown={insertMarkdown}
                  insertLink={insertLink}
                  insertBullet={insertBullet}
                  insertNumber={insertNumber}
                  selectAndUploadImage={selectAndUploadImage}
                  handleSave={handleSave}
                  textareaRef={textareaRef}
                  containerRef={containerRef}
                  previewContainerRef={previewContainerRef}
                  onImportSuccess={(importedPage) => {
                    isLeavingRef.current = true;
                    navigate(`/admin/page/${importedPage.id}`);
                    setTimeout(() => {
                      isLeavingRef.current = false;
                    }, 100);
                  }}
                />

                {/* 저장 액션바 */}
                <EditorActionBar
                  page={page}
                  isDirty={isDirty}
                  saving={saving}
                  deleting={deleting}
                  pageStatus={pageStatus}
                  saveStatus={saveStatus}
                  copied={copied}
                  setCopied={setCopied}
                  handleSave={handleSave}
                  handleDelete={handleDelete}
                  handleToggleStatus={handleToggleStatus}
                  copyTextToClipboard={copyTextToClipboard}
                />
              </>
            ) : (
              <div className="flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50">
                <p className="text-sm text-gray-400 font-medium">좌측 메뉴 트리 탐색기에서 편집할 도움말 메뉴 카테고리를 선택하세요.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 3. 변경사항 저장 확인 커스텀 모달 */}
      <UnsavedChangesModal
        blocker={blocker}
        handleSave={handleSave}
        isLeavingRef={isLeavingRef}
      />
    </div>
  )
}

export default DocUserMain
