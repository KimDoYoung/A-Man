import React, { useState, useEffect } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { OutletContextType, PageData, TocItem } from '../../types'
import axios from 'axios'

const MarkdownViewer: React.FC = () => {
  const { page_id } = useParams<{ page_id: string }>()
  const { setTocData } = useOutletContext<OutletContextType>()
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const fetchPage = async () => {
      if (!page_id) return
      setLoading(true)
      setErrorMsg('')
      try {
        const response = await axios.get(`/aman/docs/${page_id}`)
        const pageData = response.data
        setPage(pageData)

        // 마크다운 파싱을 통한 동적 목차(TOC) 데이터 추출
        const toc = extractTocFromMarkdown(pageData.content)
        setTocData(toc)
      } catch (error) {
        console.error('페이지 로드 실패:', error)
        setErrorMsg('도움말 문서를 가져오는 도중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchPage()

    // 컴포넌트 언마운트 시 목차 초기화
    return () => {
      setTocData([])
    }
  }, [page_id, setTocData])

  // 마크다운에서 헤더(#, ##, ###)를 추출하는 헬퍼 함수
  const extractTocFromMarkdown = (md: string): TocItem[] => {
    const lines = md.split('\n')
    const toc: TocItem[] = []
    
    let headingIndex = 0
    lines.forEach((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('# ')) {
        const text = trimmed.substring(2).trim()
        toc.push({ id: `heading-${headingIndex++}`, text, level: 1 })
      } else if (trimmed.startsWith('## ')) {
        const text = trimmed.substring(3).trim()
        toc.push({ id: `heading-${headingIndex++}`, text, level: 2 })
      } else if (trimmed.startsWith('### ')) {
        const text = trimmed.substring(4).trim()
        toc.push({ id: `heading-${headingIndex++}`, text, level: 3 })
      }
    })
    return toc
  }

  // 간단한 마크다운을 React 엘리먼트/HTML로 변환하는 초경량 렌더링 엔진
  const renderMarkdownToHtml = (md: string) => {
    const lines = md.split('\n')
    let headingIndex = 0
    let inList = false
    const elements: React.ReactNode[] = []

    lines.forEach((line, idx) => {
      const trimmed = line.trim()

      // 리스트 영역 처리 감지
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        inList = true
        const text = trimmed.substring(2)
        elements.push(
          <li key={`li-${idx}`} className="list-disc ml-5 text-gray-600 text-sm mb-1">
            {parseInlineStyles(text)}
          </li>
        )
        return
      } else if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ') && trimmed !== '') {
        inList = false
      }

      // 1. 헤더 처리 (TOC 앵커 ID와 결합)
      if (trimmed.startsWith('# ')) {
        const text = trimmed.substring(2)
        elements.push(
          <h1 
            key={`h1-${idx}`} 
            id={`heading-${headingIndex++}`} 
            className="text-2xl font-bold tracking-tight text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-100"
          >
            {parseInlineStyles(text)}
          </h1>
        )
      } else if (trimmed.startsWith('## ')) {
        const text = trimmed.substring(3)
        elements.push(
          <h2 
            key={`h2-${idx}`} 
            id={`heading-${headingIndex++}`} 
            className="text-xl font-bold tracking-tight text-gray-900 mt-6 mb-3"
          >
            {parseInlineStyles(text)}
          </h2>
        )
      } else if (trimmed.startsWith('### ')) {
        const text = trimmed.substring(4)
        elements.push(
          <h3 
            key={`h3-${idx}`} 
            id={`heading-${headingIndex++}`} 
            className="text-lg font-semibold text-gray-800 mt-4 mb-2"
          >
            {parseInlineStyles(text)}
          </h3>
        )
      } 
      // 2. 인용구 blockquote
      else if (trimmed.startsWith('> ')) {
        const text = trimmed.substring(2)
        elements.push(
          <blockquote key={`quote-${idx}`} className="border-l-4 border-indigo-500 pl-4 py-1.5 my-4 bg-gray-50/50 rounded-r-md text-gray-600 italic text-sm">
            {parseInlineStyles(text)}
          </blockquote>
        )
      }
      // 3. 코드 블록 영역 혹은 구분선
      else if (trimmed === '---') {
        elements.push(<hr key={`hr-${idx}`} className="my-6 border-t border-gray-200" />)
      }
      // 4. 일반 본문 단락
      else if (trimmed !== '') {
        elements.push(
          <p key={`p-${idx}`} className="text-gray-600 text-sm leading-relaxed mb-4">
            {parseInlineStyles(trimmed)}
          </p>
        )
      }
    })

    return elements
  }

  // 굵게(**), 기울임(*), 인라인코드(`) 등의 스타일 인라인 인코더
  const parseInlineStyles = (text: string): React.ReactNode => {
    // 1. Bold 처리 (ex: **text**)
    const boldRegex = /\*\*(.*?)\*\*/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(text)) !== null) {
      const matchIndex = match.index
      const matchText = match[1]

      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex))
      }
      parts.push(<strong key={`b-${matchIndex}`} className="font-bold text-gray-900">{matchText}</strong>)
      lastIndex = boldRegex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? <>{parts}</> : text
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-sm text-gray-500 font-medium">도움말 문서를 불러오는 중입니다...</p>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="p-6 border border-red-200 bg-red-50/30 rounded-lg text-center max-w-xl mx-auto my-12">
        <p className="text-sm text-red-600 font-semibold">{errorMsg}</p>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-sm">조회할 수 있는 문서 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <article className="prose max-w-3xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 pb-4 border-b border-gray-200 mb-6">
        {page.title}
      </h1>
      
      {/* 렌더링된 본문 데이터 뷰 영역 */}
      <div className="markdown-content">
        {renderMarkdownToHtml(page.content)}
      </div>

      <p className="text-xs text-gray-400 text-center mt-12 pt-4 border-t border-gray-100">
        --- 문서의 끝입니다 ---
      </p>
    </article>
  )
}

export default MarkdownViewer
