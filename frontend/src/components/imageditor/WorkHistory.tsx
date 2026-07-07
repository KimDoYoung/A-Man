import React, { useState } from 'react'
import { Edit2, Trash2, Search, RotateCcw } from 'lucide-react'
import { ImageWork } from './image_editor_types'
import { formatRelativeTime } from '@/lib/utils'

interface WorkHistoryProps {
  historyList: ImageWork[]
  loadingHistory: boolean
  onLoadWork: (work: ImageWork) => void
  onUpdateTitle: (work: ImageWork, title: string) => Promise<void> | void
  onDeleteHistory: (id: number) => Promise<void> | void
  onDeleteSelected: (ids: number[]) => Promise<void> | void
}

const WorkHistory: React.FC<WorkHistoryProps> = ({
  historyList,
  loadingHistory,
  onLoadWork,
  onUpdateTitle,
  onDeleteHistory,
  onDeleteSelected
}) => {
  // 필터 조작 임시 상태
  const [filterText, setFilterText] = useState('')
  const [filterDays, setFilterDays] = useState('all')

  // 실제 조회(검색 클릭) 시 적용된 상태
  const [appliedText, setAppliedText] = useState('')
  const [appliedDays, setAppliedDays] = useState('all')

  // 체크박스 선택 목록
  const [selectedWorkIds, setSelectedWorkIds] = useState<number[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')

  // 1. 조건에 맞는 필터링 처리 (AND 조건)
  // appliedDays가 '1', '3', '7'이면 현재 시점 기준 각각 24, 72, 168시간 이전(과거)에 수정된 파일만 반환
  const now = Date.now()
  const filteredList = historyList.filter((work) => {
    // 키워드 필터링
    if (appliedText && !work.title.toLowerCase().includes(appliedText.toLowerCase())) {
      return false
    }
    // 날짜 필터링 (선택한 날짜보다 더 오래된 과거 기록만 반환)
    if (appliedDays !== 'all') {
      const days = parseInt(appliedDays, 10)
      const limitMs = days * 24 * 60 * 60 * 1000
      const limitTime = now - limitMs
      const workTime = new Date(work.updatedAt).getTime()
      if (workTime >= limitTime) {
        // 지정 기간 이내(새로 생성된 것)는 제외하고 더 오래된 과거 것만 남김
        return false
      }
    }
    return true
  })

  // 검색 조건 버튼 클릭
  const handleSearch = () => {
    setAppliedText(filterText)
    setAppliedDays(filterDays)
    setSelectedWorkIds([]) // 검색 결과가 달라지므로 선택 내역 초기화
  }

  // 검색 조건 초기화 버튼 클릭
  const handleReset = () => {
    setFilterText('')
    setFilterDays('all')
    setAppliedText('')
    setAppliedDays('all')
    setSelectedWorkIds([])
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
    e.stopPropagation()
    if (e.target.checked) {
      setSelectedWorkIds((prev) => [...prev, id])
    } else {
      setSelectedWorkIds((prev) => prev.filter((item) => item !== id))
    }
  }

  // 전체 선택 체크박스는 필터링된 결과물(filteredList)만 대상을 한정함
  const handleAllCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedWorkIds(filteredList.map((h) => h.id))
    } else {
      setSelectedWorkIds([])
    }
  }

  const triggerUpdateTitle = (work: ImageWork, newTitle: string) => {
    onUpdateTitle(work, newTitle)
    setEditingId(null)
  }

  const triggerDeleteHistory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('임시 보관된 이 작업을 정말 삭제하시겠습니까?')) return
    onDeleteHistory(id)
    setSelectedWorkIds((prev) => prev.filter((item) => item !== id))
  }

  const triggerDeleteSelected = () => {
    if (selectedWorkIds.length === 0) return
    if (!confirm(`선택된 ${selectedWorkIds.length}개의 항목을 정말 모두 삭제하시겠습니까?`)) return
    onDeleteSelected(selectedWorkIds)
    setSelectedWorkIds([])
  }

  // 필터링 결과와 선택된 ID들이 전부 매칭되는지 판단
  const isAllChecked = filteredList.length > 0 && filteredList.every((h) => selectedWorkIds.includes(h.id))

  return (
    <aside className="w-64 border-l border-gray-200 dark:border-slate-800 flex flex-col shrink-0 overflow-hidden bg-white dark:bg-slate-900">
      
      {/* A. 타이틀 영역 */}
      <div className="p-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shrink-0 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">임시 보관 작업 목록</span>
        {filteredList.length > 0 && (
          <div className="flex items-center space-x-1" title="조회 결과 전체 선택 / 해제">
            <input
              type="checkbox"
              checked={isAllChecked}
              onChange={handleAllCheckboxChange}
              className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 font-medium select-none">전체</span>
          </div>
        )}
      </div>

      {/* B. 조건 검색 필터부 (키워드 입력 및 기간 드롭다운) */}
      <div className="p-3 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/30 space-y-2 shrink-0">
        <div className="flex space-x-1.5">
          <input
            type="text"
            placeholder="키워드 검색..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md text-[11px] font-semibold text-gray-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
          />
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(e.target.value)}
            className="px-1.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md text-[11px] font-semibold text-gray-800 dark:text-slate-100 cursor-pointer focus:outline-hidden"
          >
            <option value="all">전체 기간</option>
            <option value="1">1일 이전</option>
            <option value="3">3일 이전</option>
            <option value="7">7일 이전</option>
          </select>
        </div>
        <div className="flex space-x-1.5">
          <button
            onClick={handleSearch}
            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1"
          >
            <Search className="w-3 h-3" />
            <span>조회</span>
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1"
            title="검색 조건 초기화"
          >
            <RotateCcw className="w-3 h-3" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* C. 목록 리스트 영역 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
        {loadingHistory ? (
          <div className="text-center text-xs text-gray-400 py-6">로딩 중...</div>
        ) : filteredList.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-10 leading-relaxed select-none">
            {appliedText || appliedDays !== 'all' ? (
              <span>일치하는 검색 조건 결과가 없습니다.</span>
            ) : (
              <span>
                임시 보관함이 비어 있습니다.<br />
                (이전 진행 상태를 여기에 임시 저장하고 불러올 수 있습니다.)
              </span>
            )}
          </div>
        ) : (
          filteredList.map((work) => (
            <div
              key={work.id}
              onClick={() => onLoadWork(work)}
              className="p-2 border border-gray-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg cursor-pointer transition-all flex flex-col space-y-1.5 select-none relative group"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedWorkIds.includes(work.id)}
                  onChange={(e) => handleCheckboxChange(e, work.id)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer mr-2 shrink-0"
                />
                <div className="flex-1 flex justify-between items-center min-w-0">
                  {editingId === work.id ? (
                    <input
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => triggerUpdateTitle(work, editingTitleValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          triggerUpdateTitle(work, editingTitleValue)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      autoFocus
                      className="px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-indigo-500 rounded font-semibold text-gray-800 dark:text-slate-100 w-full focus:outline-hidden"
                    />
                  ) : (
                    <div
                      className="flex items-center space-x-1 flex-1 min-w-0"
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        setEditingId(work.id)
                        setEditingTitleValue(work.title)
                      }}
                    >
                      <span className="font-semibold text-gray-800 dark:text-slate-200 text-xs truncate max-w-[150px]" title={work.title}>
                        {work.title}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(work.id)
                        setEditingTitleValue(work.title)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-indigo-650 rounded transition-all cursor-pointer"
                      title="제목 수정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => triggerDeleteHistory(work.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                      title="기록 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 font-medium pl-5.5">
                수정: {new Date(work.updatedAt).toLocaleDateString()} {new Date(work.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatRelativeTime(work.updatedAt)})
              </span>
            </div>
          ))
        )}
      </div>

      {/* D. 선택 삭제 제어부 */}
      {selectedWorkIds.length > 0 && (
        <div className="p-3 border-t border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shrink-0">
          <button
            onClick={triggerDeleteSelected}
            className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 rounded-md text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>선택 항목 모두 삭제 ({selectedWorkIds.length})</span>
          </button>
        </div>
      )}
    </aside>
  )
}

export default WorkHistory
