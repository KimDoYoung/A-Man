import React, { useState, useEffect, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { Video, Trash2, Play, Download, UploadCloud, X } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import { CONTEXT_PATH } from '@/lib/instance'

interface VideoItem {
  name: string
  size: number
  lastModified: number
  url: string
}

const VideoManagePage: React.FC = () => {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // 비디오 미리보기 모달용 상태
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<AgGridReact>(null)

  const fetchVideos = async () => {
    try {
      const data = await apiClient.get<VideoItem[]>('/admin/video')
      const videoList = Array.isArray(data) ? data : []
      setVideos(videoList)
      setFilteredVideos(videoList)
    } catch (err) {
      console.error('비디오 목록 조회 실패:', err)
      showStatus('error', '동영상 목록을 불러오는 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  // 검색 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVideos(videos)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredVideos(
        videos.filter((v) => v.name.toLowerCase().includes(term))
      )
    }
  }, [searchTerm, videos])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      showStatus('error', '업로드할 동영상 파일을 선택해 주세요.')
      return
    }

    // 파일 확장자 검사
    const isVideo = /\.(mp4|webm|ogg)$/i.test(selectedFile.name)
    if (!isVideo) {
      showStatus('error', 'mp4, webm, ogg 동영상 파일만 업로드 가능합니다.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)

    setUploading(true)
    try {
      await apiClient.post('/admin/video/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      showStatus('success', `${selectedFile.name} 동영상이 성공적으로 업로드되었습니다.`)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchVideos()
    } catch (err: any) {
      console.error('동영상 업로드 실패:', err)
      const errorMsg = err.response?.data || '동영상 업로드 중 오류가 발생했습니다.'
      showStatus('error', errorMsg)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm(`[${fileName}] 동영상을 정말로 삭제하시겠습니까?\n이 동영상을 링크한 모든 매뉴얼에서 재생이 되지 않습니다.`)) return
    
    try {
      await apiClient.delete(`/admin/video/${fileName}`)
      showStatus('success', '동영상이 성공적으로 삭제되었습니다.')
      fetchVideos()
      if (previewVideo && previewVideo.name === fileName) {
        setPreviewVideo(null)
      }
    } catch (err) {
      console.error('동영상 삭제 실패:', err)
      showStatus('error', '동영상 삭제에 실패했습니다.')
    }
  }

  // 복사 기능 (마크다운 태그 복사)
  const handleCopyMarkdown = (item: VideoItem) => {
    const safeUrl = item.url.replace(/ /g, '%20')
    const mdTag = `![${item.name.split('.')[0]}](${safeUrl})`
    
    navigator.clipboard.writeText(mdTag)
      .then(() => showStatus('success', '마크다운 삽입 태그가 복사되었습니다.'))
      .catch(() => showStatus('error', '태그 복사에 실패했습니다.'))
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const contextPath = CONTEXT_PATH
      const proxyUrl = `${contextPath}/videos/${fileName}`
      
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error('Network response was not ok')
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('다운로드 오류:', err)
      window.open(url, '_blank')
    }
  }

  const handleRename = async (oldName: string) => {
    const dotIdx = oldName.lastIndexOf('.')
    const baseName = dotIdx > 0 ? oldName.substring(0, dotIdx) : oldName
    const ext = dotIdx > 0 ? oldName.substring(dotIdx) : ''

    const newBaseName = prompt('변경할 동영상 파일 이름을 입력해 주세요 (확장자 제외):', baseName)
    if (newBaseName === null) return
    
    const trimmedBase = newBaseName.trim()
    if (!trimmedBase) {
      showStatus('error', '파일명은 비어 둘 수 없습니다.')
      return
    }
    
    // 사용자가 확장자를 명시적으로 써 넣은 경우 보정
    let processedBase = trimmedBase
    const newDotIdx = trimmedBase.lastIndexOf('.')
    if (newDotIdx > 0) {
      const lower = trimmedBase.toLowerCase()
      if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg')) {
        processedBase = trimmedBase.substring(0, newDotIdx)
      }
    }

    if (processedBase === baseName) return
    
    const finalNewName = processedBase + ext
    
    try {
      await apiClient.post('/admin/video/rename', {
        oldName,
        newName: finalNewName
      })
      showStatus('success', `동영상 파일 이름이 [${finalNewName}]으로 변경되었습니다.`)
      fetchVideos()
    } catch (err: any) {
      console.error('동영상 이름 변경 실패:', err)
      const errorMsg = err.response?.data || '이름 변경에 실패했습니다.'
      showStatus('error', errorMsg)
    }
  }

  // AG Grid Columns Definition
  const columnDefs = [
    {
      headerName: '미리보기',
      width: 100,
      cellClass: 'flex items-center justify-center h-full',
      cellRenderer: (params: any) => {
        const item = params.data
        return (
          <button
            onClick={() => setPreviewVideo(item)}
            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-600 rounded-md cursor-pointer transition-colors"
            title="동영상 즉시 재생"
          >
            <Play className="w-4 h-4" />
          </button>
        )
      }
    },
    {
      field: 'name',
      headerName: '파일명',
      flex: 2,
      minWidth: 260,
      cellClass: 'font-mono text-slate-700 dark:text-slate-200 text-[13px] flex items-center h-full select-all',
      sortable: true,
      filter: true
    },
    {
      field: 'size',
      headerName: '파일 크기',
      width: 130,
      cellClass: 'text-slate-500 text-[13px] flex items-center h-full',
      valueFormatter: (params: any) => formatBytes(params.value),
      sortable: true
    },
    {
      field: 'lastModified',
      headerName: '업로드 일시',
      width: 180,
      cellClass: 'text-slate-500 text-[13px] flex items-center h-full',
      valueFormatter: (params: any) => new Date(params.value).toLocaleString(),
      sortable: true
    },
    {
      headerName: '액션',
      width: 300,
      cellClass: 'flex items-center justify-center gap-2 h-full',
      cellRenderer: (params: any) => {
        const item = params.data
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCopyMarkdown(item)}
              className="px-2 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
              title="마크다운 에디터용 태그 복사"
            >
              태그복사
            </button>
            <button
              onClick={() => handleRename(item.name)}
              className="px-2 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-amber-600 rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
              title="동영상 파일명 변경"
            >
              이름변경
            </button>
            <button
              onClick={() => handleDownload(item.url, item.name)}
              className="px-2 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-indigo-600 rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              다운로드
            </button>
            <button
              onClick={() => handleDelete(item.name)}
              className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              삭제
            </button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      {/* 상태 표시 메시지 */}
      {statusMsg.text && (
        <div className={`fixed top-16 right-6 z-50 px-4 py-3 rounded-lg border shadow-lg text-sm font-semibold transition-all duration-300 ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400'
        }`}>
          {statusMsg.text}
        </div>
      )}

      <main className="flex-1 p-6 flex flex-col min-h-0 space-y-6 overflow-hidden">
        {/* 상단 타이틀 및 업로드 영역 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-500" />
              동영상 관리
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              도움말 매뉴얼에 첨부할 비디오(.mp4, .webm, .ogg) 파일을 업로드하고 관리합니다.
            </p>
          </div>

          {/* 업로드 폼 */}
          <form onSubmit={handleUpload} className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".mp4,.webm,.ogg"
                disabled={uploading}
                className="hidden"
                id="video-upload-input"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0])
                  }
                }}
              />
              <label
                htmlFor="video-upload-input"
                className="px-4 py-2 border border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer flex items-center gap-1.5 transition-all select-none"
              >
                <UploadCloud className="w-4 h-4 text-slate-400" />
                {selectedFile ? '다른 파일 선택' : '동영상 파일 선택'}
              </label>

              {selectedFile && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span className="font-mono truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-[10px] text-slate-400">({formatBytes(selectedFile.size)})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5 ${
                uploading || !selectedFile ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  업로드 중...
                </>
              ) : (
                <>업로드</>
              )}
            </button>
          </form>
        </div>

        {/* 메인 리스트 그리드 영역 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                전체 동영상: {filteredVideos.length}개
              </span>
            </div>
            <input
              type="text"
              placeholder="파일명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all"
            />
          </div>

          <div className="ag-theme-alpine w-full flex-1 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner font-sans">
            <AgGridReact
              ref={gridRef}
              rowData={filteredVideos}
              columnDefs={columnDefs}
              theme="legacy"
              animateRows={true}
              rowHeight={48}
              defaultColDef={{
                resizable: true,
                sortable: true
              }}
              overlayLoadingTemplate={
                '<span class="ag-overlay-loading-center">데이터를 불러오는 중입니다...</span>'
              }
              overlayNoRowsTemplate={
                '<span class="ag-overlay-no-rows-center">등록된 동영상 파일이 없습니다.</span>'
              }
            />
          </div>
        </div>
      </main>

      {/* 비디오 미리보기 모달 */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between text-slate-100 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold truncate max-w-lg">{previewVideo.name}</span>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-black flex items-center justify-center max-h-[500px]">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="max-w-full max-h-[440px] rounded-lg display-block outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoManagePage
