import React, { useState, useEffect, useRef } from 'react'
import { Download, RefreshCw, Search, Terminal, FileText } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import DocUserTopBar from '@/components/shared/DocUserTopBar'

interface LogFile {
  name: string
  size: number
  lastModified: string
}

const LogPages: React.FC = () => {
  const [files, setFiles] = useState<LogFile[]>([])
  const [logText, setLogText] = useState<string>('')
  const [lines, setLines] = useState<number>(500)
  const [filterText, setFilterText] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [showFileList, setShowFileList] = useState<boolean>(true)
  const [loadingList, setLoadingList] = useState<boolean>(false)
  const [loadingText, setLoadingText] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  const terminalRef = useRef<HTMLDivElement>(null)

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000)
  }

  // 로그 파일 리스트 조회
  const fetchLogFiles = async () => {
    setLoadingList(true)
    try {
      const res = await apiClient.get<any>('/admin/logs/files')
      if (Array.isArray(res)) {
        setFiles(res)
      } else {
        setFiles([])
      }
    } catch (err) {
      console.error('로그 파일 목록 조회 실패:', err)
      showStatus('error', '로그 파일 목록을 불러오지 못했습니다.')
    } finally {
      setLoadingList(false)
    }
  }

  // 실시간 로그 Tail 조회
  const fetchLogTail = async () => {
    setLoadingText(true)
    try {
      const text = await apiClient.get<string>(`/admin/logs/tail?lines=${lines}`)
      setLogText(text || '')
      // 성공 피드백
      if (statusMsg.type !== 'error') {
        showStatus('success', '실시간 로그가 갱신되었습니다.')
      }
    } catch (err) {
      console.error('실시간 로그 조회 실패:', err)
      showStatus('error', '실시간 로그 조회를 실패했습니다.')
    } finally {
      setLoadingText(false)
    }
  }

  useEffect(() => {
    fetchLogFiles()
    fetchLogTail()
  }, [lines])

  // 자동 스크롤 처리
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logText, autoScroll])

  const handleDownload = (fileName: string) => {
    window.open(`/aman/admin/logs/download/${fileName}`, '_blank')
    showStatus('success', `${fileName} 다운로드가 요청되었습니다.`)
  }

  // 바이트 단위를 가독성 높게 환산
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 로그 라인 분석 및 컬러링 클래스 부여 (아이보리 배경 맞춤형 고대비/소프트 컬러)
  const getLineColorClass = (line: string) => {
    if (line.includes('ERROR') || line.includes('Exception') || line.includes('Fail')) return 'text-red-700 font-bold'
    if (line.includes('WARN')) return 'text-amber-800 font-semibold'
    if (line.includes('INFO')) return 'text-emerald-700'
    if (line.includes('DEBUG')) return 'text-slate-500'
    if (line.includes('TRACE')) return 'text-slate-400'
    return 'text-[#4e342e]' // 에스프레소 브라운 기본 텍스트
  }

  // 검색 필터 적용된 라인들 가공
  const logLines = logText.split('\n')
  const filteredLines = logLines.filter(line => 
    !filterText || line.toLowerCase().includes(filterText.toLowerCase())
  )

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      <main className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
        {/* Title & Control Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between shrink-0 bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-500" />
              시스템 로그 조회 (Log Viewer)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Tomcat 및 Spring Boot WAS의 실시간 콘솔 출력 로그 파일 리스트 및 최신 실행 기록을 조회합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-2 md:mt-0">
            {statusMsg.text && (
              <div className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                {statusMsg.text}
              </div>
            )}
            <button
              onClick={() => {
                fetchLogFiles()
                fetchLogTail()
              }}
              disabled={loadingText || loadingList}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingText || loadingList ? 'animate-spin' : ''}`} />
              <span>로그 새로고침</span>
            </button>
          </div>
        </div>

        {/* 2-Column Content Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          
          {/* Left Column: Log Files List */}
          {/* Left Column: Log Files List */}
          {showFileList && (
            <div className="w-full lg:w-80 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col p-4 overflow-hidden">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2.5 shrink-0">
                <FileText className="w-4 h-4 text-indigo-500" />
                보관 로그 파일 ({files.length})
              </h2>
              <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
                {files.map((file) => (
                  <div 
                    key={file.name} 
                    className={`p-3 rounded-lg border transition-all flex flex-col justify-between items-start gap-1.5 ${
                      file.name === 'aman.log' 
                        ? 'bg-indigo-50/40 border-indigo-100' 
                        : 'bg-slate-50/50 border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-full">
                      <div className="text-xs font-mono font-bold text-slate-750 break-all select-all">{file.name}</div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>{formatBytes(file.size)}</span>
                        <span>{file.lastModified}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(file.name)}
                      className="w-full py-1 bg-white hover:bg-slate-100 border border-slate-200 text-indigo-650 rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      다운로드
                    </button>
                  </div>
                ))}
                {files.length === 0 && !loadingList && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    저장된 로그 파일이 존재하지 않습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column: Console Log Viewer */}
          <div className="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col p-4 overflow-hidden">
            
            {/* Console Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFileList(!showFileList)}
                  className="px-2.5 py-1 text-xs border border-slate-200 bg-white hover:bg-slate-50 rounded-lg focus:outline-hidden font-semibold cursor-pointer text-slate-700 transition-colors"
                >
                  {showFileList ? '보관로그 숨기기' : '보관로그 보이기'}
                </button>
                <span className="text-xs font-bold text-slate-600 shrink-0 ml-1">줄수 선택:</span>
                <select
                  value={lines}
                  onChange={(e) => setLines(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold cursor-pointer text-slate-700"
                >
                  <option value={100}>최근 100줄</option>
                  <option value={200}>최근 200줄</option>
                  <option value={500}>최근 500줄</option>
                  <option value={1000}>최근 1000줄</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 ml-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded-xs border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>자동 스크롤</span>
                </label>
              </div>

              {/* Local Search Input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="로그 키워드 검색..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-700"
                />
              </div>
            </div>

            {/* Console Screen */}
            <div className="flex-1 bg-[#fdfaf2] rounded-xl mt-4 p-4 overflow-hidden border border-amber-200/60 flex flex-col shadow-inner">
              <div 
                ref={terminalRef}
                className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed select-text space-y-0.5 pr-2"
              >
                {filteredLines.map((line, idx) => (
                  <div key={idx} className={getLineColorClass(line)}>
                    {line}
                  </div>
                ))}
                {filteredLines.length === 0 && !loadingText && (
                  <div className="text-amber-900/40 italic text-center py-12">
                    {filterText ? '검색 필터에 일치하는 로그 라인이 없습니다.' : '출력된 로그 라인이 없습니다.'}
                  </div>
                )}
                {loadingText && (
                  <div className="text-indigo-650 italic text-center py-4 animate-pulse flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>실시간 로그 조회 중...</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

export default LogPages
