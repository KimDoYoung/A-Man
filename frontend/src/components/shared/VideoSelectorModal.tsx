import React, { useState, useEffect } from 'react'
import { X, Search, Video, Play, Check } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

interface VideoItem {
  name: string
  size: number
  lastModified: number
  url: string
}

interface VideoSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (video: VideoItem) => void
}

const VideoSelectorModal: React.FC<VideoSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchVideos()
      setSelectedVideo(null)
      setPreviewVideoUrl(null)
      setSearchTerm('')
    }
  }, [isOpen])

  // ESC 키 누르면 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<VideoItem[]>('/admin/video')
      setVideos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('비디오 목록 로딩 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredVideos = videos.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleInsert = () => {
    if (selectedVideo) {
      onSelect(selectedVideo)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              도움말 동영상 삽입
            </h3>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-semibold">
              Ctrl+Shift+V
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 바디 (2분할 레이아웃: 좌측 리스트, 우측 재생/상세) */}
        <div className="flex-1 flex min-h-0 min-w-0">
          
          {/* 좌측: 검색 및 리스트 */}
          <div className="w-7/12 border-r border-slate-250 dark:border-slate-850 flex flex-col p-4 space-y-3 min-w-0">
            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="파일명으로 동영상 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 transition-all font-sans"
              />
            </div>

            {/* 비디오 리스트 */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scroll">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-650"></div>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  검색 결과가 없거나 업로드된 동영상이 없습니다.
                </div>
              ) : (
                filteredVideos.map((video) => {
                  const isSelected = selectedVideo?.name === video.name
                  return (
                    <div
                      key={video.name}
                      onDoubleClick={() => {
                        onSelect(video)
                        onClose()
                      }}
                      onClick={() => {
                        setSelectedVideo(video)
                        setPreviewVideoUrl(video.url)
                      }}
                      className={`p-3 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate font-mono">
                            {video.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatBytes(video.size)} · {new Date(video.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="p-1 bg-indigo-600 rounded-full text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 우측: 상세 정보 및 플레이어 미리보기 */}
          <div className="w-5/12 flex flex-col p-4 bg-slate-50/50 dark:bg-slate-900/30 min-w-0">
            {selectedVideo ? (
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate font-mono">
                    {selectedVideo.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    크기: {formatBytes(selectedVideo.size)} | 업로드: {new Date(selectedVideo.lastModified).toLocaleString()}
                  </p>
                </div>

                {/* 플레이어 미리보기 */}
                <div className="flex-1 bg-black rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative flex items-center justify-center min-h-[180px]">
                  {previewVideoUrl ? (
                    <video
                      key={previewVideoUrl}
                      src={previewVideoUrl}
                      controls
                      autoPlay
                      muted
                      className="w-full h-full max-h-[300px] object-contain display-block"
                    />
                  ) : (
                    <div className="text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                      <Play className="w-6 h-6 text-slate-400" />
                      재생할 수 없습니다.
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                  <p className="font-semibold text-slate-500 dark:text-slate-400">💡 태그 렌더링 규칙</p>
                  <p className="mt-1 font-mono text-[9px] text-indigo-650 bg-white dark:bg-slate-950 p-1.5 rounded border border-indigo-100/50 dark:border-slate-850 truncate select-all">
                    {`![${selectedVideo.name.split('.')[0]}](${selectedVideo.url.replace(/ /g, '%20')})`}
                  </p>
                  <p className="mt-1">에디터 본문에 위 형태의 이미지 코드로 삽입되며, 뷰어에서 자동으로 토글 비디오 플레이어로 변환됩니다.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                <Video className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                <p>좌측 목록에서 동영상을 선택하시면</p>
                <p className="mt-0.5 text-[11px] text-slate-400">상세 정보 및 미리보기 재생이 가능합니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-850 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-950/40 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            취소
          </button>
          <button
            onClick={handleInsert}
            disabled={!selectedVideo}
            className={`px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all ${
              !selectedVideo ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            비디오 삽입
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoSelectorModal
