import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Pin, ShieldAlert, Maximize2, AArrowDown, AArrowUp } from 'lucide-react'
import { useUserLocalSettingStore, FontSize, ContentWidth } from '@/store/useUserLocalSettingStore'
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
  const [version, setVersion] = useState('0.0.1')

  const { fontSize, contentWidth, setFontSize, setContentWidth } = useUserLocalSettingStore()

  const fontSizes: FontSize[] = ['sm', 'base', 'lg', 'xl']
  const contentWidths: ContentWidth[] = ['normal', 'wide', 'full']

  const handleDecreaseFont = () => {
    const idx = fontSizes.indexOf(fontSize)
    if (idx > 0) {
      setFontSize(fontSizes[idx - 1])
    }
  }

  const handleIncreaseFont = () => {
    const idx = fontSizes.indexOf(fontSize)
    if (idx < fontSizes.length - 1) {
      setFontSize(fontSizes[idx + 1])
    }
  }

  const handleCycleWidth = () => {
    const idx = contentWidths.indexOf(contentWidth)
    const nextIdx = (idx + 1) % contentWidths.length
    setContentWidth(contentWidths[nextIdx])
  }

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
          if (res.data.version) {
            setVersion(res.data.version)
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
            {renderSiteName(siteName)} <span className="text-xs font-semibold text-gray-400 font-mono ml-0.5">(v{version})</span>
          </span>
          {siteDescription && (
            <span className="text-xs text-gray-500 font-normal truncate hidden sm:inline ml-1">
              - {siteDescription}
            </span>
          )}
        </div>

        {/* 사용자 화면 설정 조절기 (아이콘은 왼쪽에 배치) */}
        <div className="hidden md:flex items-center space-x-2 ml-4 border-l border-gray-200 pl-4 shrink-0 select-none">
          {/* 글자 크기 조절 (AArrowDown, AArrowUp 아이콘 적용) */}
          <div className="flex items-center h-8 bg-gray-50 border border-gray-200 rounded-md px-1.5 space-x-1">
            <button 
              onClick={handleDecreaseFont} 
              disabled={fontSize === 'sm'}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 cursor-pointer text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center"
              title="글자 크기 축소"
            >
              <AArrowDown className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-gray-400 font-semibold font-mono min-w-[24px] text-center">
              {fontSize.toUpperCase()}
            </span>
            <button 
              onClick={handleIncreaseFont} 
              disabled={fontSize === 'xl'}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 cursor-pointer text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center"
              title="글자 크기 확대"
            >
              <AArrowUp className="w-4 h-4" />
            </button>
          </div>

          {/* 본문 너비 조절 */}
          <button 
            onClick={handleCycleWidth}
            className="flex items-center h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-2.5 text-xs text-gray-700 cursor-pointer transition-colors"
            title="본문 가로 너비 전환"
          >
            <Maximize2 className="w-4 h-4 text-gray-500 mr-1.5" />
            <span className="font-semibold text-[11px]">
              폭: {contentWidth === 'normal' ? '보통' : contentWidth === 'wide' ? '넓게' : '꽉차게'}
            </span>
          </button>
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
