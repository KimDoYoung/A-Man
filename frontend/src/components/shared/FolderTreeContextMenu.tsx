import React from 'react'
import { ChevronDownSquare, ChevronUpSquare, Edit2, Trash2, FolderPlus } from 'lucide-react'

interface FolderTreeContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  targetName: string;
  targetDepth: number;
  onClose: () => void;
}

const FolderTreeContextMenu: React.FC<FolderTreeContextMenuProps> = ({
  open,
  x,
  y,
  targetName,
  targetDepth,
  onClose
}) => {
  if (!open) return null

  return (
    <div 
      className="fixed z-[100] w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1 text-xs text-gray-700 font-medium select-none"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={() => {
          alert(`'${targetName}' 항목 아래에 동급 메뉴를 추가합니다.`)
          onClose()
        }} 
        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
      >
        <ChevronDownSquare className="w-3.5 h-3.5 text-gray-400" />
        <span>아래에 동급 메뉴 추가</span>
      </button>
      <button 
        onClick={() => {
          alert(`'${targetName}' 항목 위에 동급 메뉴를 추가합니다.`)
          onClose()
        }} 
        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
      >
        <ChevronUpSquare className="w-3.5 h-3.5 text-gray-400" />
        <span>위에 동급 메뉴 추가</span>
      </button>
      {(targetDepth === 1 || targetDepth === 2) && (
        <button 
          onClick={() => {
            alert(`'${targetName}' 항목 하위에 서브메뉴를 추가합니다.`)
            onClose()
          }} 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-gray-400" />
          <span>서브메뉴 추가</span>
        </button>
      )}
      <div className="border-t border-gray-100 my-1"></div>
      <button 
        onClick={() => {
          alert(`'${targetName}' 이름 바꾸기 팝업 활성화`)
          onClose()
        }} 
        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
        <span>이름 바꾸기</span>
      </button>
      <button 
        onClick={() => {
          if (confirm(`정말 '${targetName}' 항목을 삭제하시겠습니까?`)) {
            alert(`'${targetName}' 항목이 삭제되었습니다.`)
          }
          onClose()
        }} 
        className="w-full text-left px-3 py-1.5 hover:bg-red-50 hover:text-red-600 flex items-center space-x-2 text-red-500 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>삭제</span>
      </button>
    </div>
  )
}

export default FolderTreeContextMenu
