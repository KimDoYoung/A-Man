import React from 'react'
import { BringToFront, SendToBack, ArrowUp, ArrowDown } from 'lucide-react'
import { CanvasItem } from './image_editor_types'

interface ReorderControllerProps {
  items: CanvasItem[]
  selectedItemId: string
  pushToUndo: (newItems: CanvasItem[]) => void
}

export default function ReorderController({
  items,
  selectedItemId,
  pushToUndo
}: ReorderControllerProps) {
  const index = items.findIndex(item => item.id === selectedItemId)
  const isFirst = index === 0
  const isLast = index === items.length - 1

  if (index === -1) return null

  // 맨 앞으로 보내기
  const handleBringToFront = () => {
    if (isLast) return
    const item = items[index]
    const newItems = [...items]
    newItems.splice(index, 1)
    newItems.push(item)
    pushToUndo(newItems)
  }

  // 앞으로 한 단계
  const handleBringForward = () => {
    if (isLast) return
    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = temp
    pushToUndo(newItems)
  }

  // 뒤로 한 단계
  const handleSendBackward = () => {
    if (isFirst) return
    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = temp
    pushToUndo(newItems)
  }

  // 맨 뒤로 보내기
  const handleSendToBack = () => {
    if (isFirst) return
    const item = items[index]
    const newItems = [...items]
    newItems.splice(index, 1)
    newItems.unshift(item)
    pushToUndo(newItems)
  }

  return (
    <div className="pt-4 border-t border-gray-200 dark:border-slate-850 space-y-2 animate-in fade-in duration-200">
      <span className="font-bold text-[11px] text-gray-700 dark:text-slate-350 block">정렬 순서</span>
      <div className="grid grid-cols-4 gap-1">
        {/* 맨 앞으로 보내기 */}
        <button
          type="button"
          onClick={handleBringToFront}
          disabled={isLast}
          className="flex flex-col items-center justify-center p-2 rounded-md border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-gray-700 dark:text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-all"
          title="맨 앞으로 보내기"
        >
          <BringToFront className="w-4 h-4 mb-1" />
          <span className="text-[9px] font-semibold">맨 앞으로</span>
        </button>

        {/* 앞으로 한 단계 */}
        <button
          type="button"
          onClick={handleBringForward}
          disabled={isLast}
          className="flex flex-col items-center justify-center p-2 rounded-md border border-gray-255 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-gray-700 dark:text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-all"
          title="앞으로 한 단계"
        >
          <ArrowUp className="w-4 h-4 mb-1" />
          <span className="text-[9px] font-semibold">앞으로</span>
        </button>

        {/* 뒤로 한 단계 */}
        <button
          type="button"
          onClick={handleSendBackward}
          disabled={isFirst}
          className="flex flex-col items-center justify-center p-2 rounded-md border border-gray-255 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-gray-700 dark:text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-all"
          title="뒤로 한 단계"
        >
          <ArrowDown className="w-4 h-4 mb-1" />
          <span className="text-[9px] font-semibold">뒤로</span>
        </button>

        {/* 맨 뒤로 보내기 */}
        <button
          type="button"
          onClick={handleSendToBack}
          disabled={isFirst}
          className="flex flex-col items-center justify-center p-2 rounded-md border border-gray-255 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-gray-700 dark:text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-all"
          title="맨 뒤로 보내기"
        >
          <SendToBack className="w-4 h-4 mb-1" />
          <span className="text-[9px] font-semibold">맨 뒤로</span>
        </button>
      </div>
    </div>
  )
}
