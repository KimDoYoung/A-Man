import React, { useState, useEffect } from 'react'
import { Download, Play, Database, FileArchive, FolderOpen, RefreshCw, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface BackupFile {
  name: string
  size: number
  lastModified: string
  type: 'WAR' | 'DATABASE' | 'IMAGES' | 'OTHER'
}

const BackupPages: React.FC = () => {
  const [files, setFiles] = useState<BackupFile[]>([])
  const [backupDir, setBackupDir] = useState<string>('')
  const [backupCron, setBackupCron] = useState<string>('')
  const [filterType, setFilterType] = useState<'ALL' | 'WAR' | 'DATABASE' | 'IMAGES'>('ALL')
  const [loading, setLoading] = useState(false)
  const [runningBackup, setRunningBackup] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  // 크론 표현식을 사람이 읽기 쉬운 문구로 치환하는 헬퍼 함수
  const formatCron = (cronStr: string) => {
    if (!cronStr) return '매일 12:30, 23:30' // 기본값 폴백
    const parts = cronStr.trim().split(/\s+/)
    if (parts.length < 5) return `설정 주기(${cronStr})`

    const min = parts[1]
    const hour = parts[2]

    // 만약 매일 특정 시간에 실행되는 패턴인 경우 (예: "0 30 12,23 * * ?")
    if (parts[3] === '*' && parts[4] === '*') {
      const hours = hour.split(',')
      const timeFormatted = hours
        .map((h) => {
          const hh = h.padStart(2, '0')
          const mm = min.padStart(2, '0')
          return `${hh}:${mm}`
        })
        .join(', ')
      return `매일 ${timeFormatted}`
    }

    return `설정 주기(${cronStr})`
  }

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<any>('/admin/backup/files')
      if (res && typeof res === 'object') {
        setBackupDir(res.backupDir || '')
        setBackupCron(res.backupCron || '')
        if (Array.isArray(res.files)) {
          setFiles(res.files)
        } else {
          setFiles([])
        }
      } else {
        setBackupDir('')
        setBackupCron('')
        setFiles([])
        console.warn('Expected object containing files from API, but received:', res)
      }
    } catch (err) {
      console.error('백업 파일 로딩 실패:', err)
      showStatus('error', '백업 파일 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000)
  }

  const handleDownload = (fileName: string) => {
    window.open(`/aman/admin/backup/download/${fileName}`, '_blank')
    showStatus('success', `${fileName} 다운로드가 요청되었습니다.`)
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm(`${fileName} 백업 파일을 정말로 삭제하시겠습니까?`)) return
    try {
      await apiClient.delete(`/admin/backup/delete/${fileName}`)
      showStatus('success', `${fileName} 파일이 삭제되었습니다.`)
      fetchFiles()
    } catch (err) {
      console.error('백업 파일 삭제 실패:', err)
      showStatus('error', '백업 파일 삭제에 실패했습니다.')
    }
  }

  const handleTriggerBackup = async () => {
    if (!confirm('백업 작업을 지금 즉시 수동 실행하시겠습니까? (변동사항 검사 포함)')) return
    setRunningBackup(true)
    try {
      const msg = await apiClient.post<string>('/admin/backup/trigger')
      showStatus('success', msg || '백업 프로세스가 가동되었습니다.')
      fetchFiles()
    } catch (err: any) {
      console.error('수동 백업 실패:', err)
      showStatus('error', err.response?.data || '백업 가동 중 오류가 발생했습니다.')
    } finally {
      setRunningBackup(false)
    }
  }

  // 바이트 단위를 가독성 높게 환산
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 필터링 및 최신일시순(내림차순) 정렬 처리
  const filteredFiles = files
    .filter((file) => {
      if (filterType === 'ALL') return true
      return file.type === filterType
    })
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))

  // AG Grid Columns Definition
  const columnDefs = [
    {
      field: 'type',
      headerName: '종류',
      width: 180,
      cellClass: 'font-semibold text-slate-700 text-[13px] flex items-center h-full',
      cellRenderer: (params: any) => {
        const type = params.value
        return (
          <div className="flex items-center gap-1.5 h-full">
            {type === 'WAR' && <span className="flex items-center gap-1.5 text-amber-600"><FileArchive className="w-4 h-4" /> 패키지 (WAR)</span>}
            {type === 'DATABASE' && <span className="flex items-center gap-1.5 text-indigo-600"><Database className="w-4 h-4" /> 데이터베이스 (DB)</span>}
            {type === 'IMAGES' && <span className="flex items-center gap-1.5 text-emerald-600"><FolderOpen className="w-4 h-4" /> 이미지 압축본 (GZ)</span>}
            {type === 'OTHER' && <span className="text-gray-400">기타</span>}
          </div>
        )
      }
    },
    {
      field: 'name',
      headerName: '파일명',
      flex: 2,
      minWidth: 280,
      cellClass: 'font-mono font-medium text-slate-700 text-[13px] flex items-center h-full select-all',
      sortable: true
    },
    {
      field: 'size',
      headerName: '파일 크기',
      width: 140,
      cellClass: 'text-slate-500 text-[13px] flex items-center h-full',
      valueFormatter: (params: any) => formatBytes(params.value),
      sortable: true
    },
    {
      field: 'lastModified',
      headerName: '백업/생성 시간',
      width: 180,
      cellClass: 'text-slate-500 text-[13px] flex items-center h-full',
      sortable: true
    },
    {
      headerName: '액션',
      width: 180,
      cellClass: 'flex items-center justify-center gap-1.5 h-full',
      cellRenderer: (params: any) => {
        const file = params.data
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleDownload(file.name)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-indigo-655 rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
            </button>
            <button
              onClick={() => handleDelete(file.name)}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-655 rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      <main className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between shrink-0 bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              시스템 백업 관리 (Backup Management)
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              정기 백업 스케줄러({formatCron(backupCron)})에 의해 백업된 파일과 외부 업로드된 패키지(*.war) 파일 목록입니다.
              {backupDir && (
                <span className="block md:inline md:ml-2 font-semibold text-slate-650">
                  backup folder : <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-650 select-all">{backupDir}</code>
                </span>
              )}
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
            <div className="flex items-center gap-2">
              <button
                onClick={fetchFiles}
                disabled={loading}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
              <button
                onClick={handleTriggerBackup}
                disabled={runningBackup || loading}
                className={`px-3.5 py-1.5 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:shadow-sm ${
                  runningBackup || loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                }`}
              >
                {runningBackup ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{runningBackup ? '백업중...' : '즉시 백업 실행'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 백업 파일 테이블 영역 */}
        <div className="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col p-5 overflow-hidden">
          {/* 필터 탭 바 */}
          <div className="flex items-center space-x-1 border-b border-slate-200 shrink-0 mb-4">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                filterType === 'ALL'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              전체 ({files.length})
            </button>
            <button
              onClick={() => setFilterType('WAR')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                filterType === 'WAR'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              패키지 (WAR) ({files.filter(f => f.type === 'WAR').length})
            </button>
            <button
              onClick={() => setFilterType('DATABASE')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                filterType === 'DATABASE'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              데이터베이스 (DB) ({files.filter(f => f.type === 'DATABASE').length})
            </button>
            <button
              onClick={() => setFilterType('IMAGES')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                filterType === 'IMAGES'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              이미지 압축본 (GZ) ({files.filter(f => f.type === 'IMAGES').length})
            </button>
          </div>

          <div className="ag-theme-alpine w-full flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-inner font-sans">
            <AgGridReact
              rowData={filteredFiles}
              columnDefs={columnDefs}
              theme="legacy"
              animateRows={true}
              rowHeight={48}
              defaultColDef={{
                resizable: true
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default BackupPages
