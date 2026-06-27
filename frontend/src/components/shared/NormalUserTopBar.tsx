import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Pin, Key, ShieldAlert } from 'lucide-react'
import axios from 'axios'
import faviconImg from '../../assets/favicon.png'

interface NormalUserTopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  tocOpen: boolean;
  setTocOpen: (open: boolean) => void;
}

const NormalUserTopBar: React.FC<NormalUserTopBarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  tocOpen,
  setTocOpen
}) => {
  const navigate = useNavigate()
  const [siteName, setSiteName] = useState('AssetERP Docs')
  const [siteDescription, setSiteDescription] = useState('AssetERP 도움말 시스템')

  useEffect(() => {
    axios.get('/aman/health')
      .then(res => {
        if (res.data) {
          if (res.data.siteName) {
            setSiteName(res.data.siteName)
          }
          if (res.data.siteDescription) {
            setSiteDescription(res.data.siteDescription)
          }
        }
      })
      .catch(err => {
        console.error('사이트 정보 조회 실패:', err)
      })
  }, [])

  const renderSiteName = (name: string) => {
    const trimmed = name.trim()
    const lastSpaceIndex = trimmed.lastIndexOf(' ')
    if (lastSpaceIndex === -1) {
      return <span>{trimmed}</span>
    }
    const firstPart = trimmed.substring(0, lastSpaceIndex)
    const lastWord = trimmed.substring(lastSpaceIndex + 1)
    return (
      <>
        {firstPart} <span className="text-indigo-600">{lastWord}</span>
      </>
    )
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-xs shrink-0">
      <div className="flex items-center space-x-3">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div 
          className="flex items-center space-x-2 cursor-pointer" 
          onClick={() => navigate('/docs')}
          title={siteDescription}
        >
          <img src={faviconImg} alt="Logo" className="w-5 h-5 shrink-0 object-contain" />
          <span className="text-base font-bold tracking-tight shrink-0">
            {renderSiteName(siteName)}
          </span>
          {siteDescription && (
            <span className="text-xs text-gray-500 font-normal truncate hidden sm:inline ml-1">
              - {siteDescription}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* 어드민으로 이동 */}
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-all cursor-pointer"
          title="관리자 모드로 이동"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
        </button>

        {!tocOpen && (
          <button 
            onClick={() => setTocOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-all cursor-pointer"
            title="목차 열기"
          >
            <Pin className="w-3.5 h-3.5" />
            <span>목차 보기</span>
          </button>
        )}
      </div>
    </header>
  )
}

export default NormalUserTopBar
