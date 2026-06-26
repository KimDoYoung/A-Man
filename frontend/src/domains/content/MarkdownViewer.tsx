import React, { useState, useEffect } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { OutletContextType, PageData, TocItem } from '@/types'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

const MarkdownViewer: React.FC = () => {
  const { page_id, folder_id } = useParams<{ page_id?: string; folder_id?: string }>()
  const { setTocData } = useOutletContext<OutletContextType>()
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const fetchPage = async () => {
      if (!page_id && !folder_id) return
      setLoading(true)
      setErrorMsg('')
      try {
        let pageData = null
        if (page_id) {
          const response = await axios.get(`/aman/docs/${page_id}`)
          pageData = response.data
        } else if (folder_id) {
          const response = await axios.get(`/aman/docs/folders/${folder_id}/pages`)
          const pages = response.data
          if (pages && pages.length > 0) {
            pageData = pages[0]
          }
        }

        if (pageData) {
          setPage(pageData)
          // 마크다운 파싱을 통한 동적 목차(TOC) 데이터 추출
          const toc = extractTocFromMarkdown(pageData.content)
          setTocData(toc)
        } else {
          setPage(null)
          setTocData([])
        }
      } catch (error: any) {
        console.error('페이지 로드 실패:', error)
        if (error.response?.status === 404) {
          setErrorMsg('존재하지 않거나 아직 작성이 완료되지 않은(DRAFT) 도움말 문서입니다.')
        } else {
          setErrorMsg('도움말 문서를 가져오는 도중 오류가 발생했습니다.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPage()

    // 컴포넌트 언마운트 시 목차 초기화
    return () => {
      setTocData([])
    }
  }, [page_id, folder_id, setTocData])

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

  // 표준 마크다운 컴포넌트 렌더러
  const renderMarkdownToHtml = (md: string): React.ReactNode => {
    if (!md || !md.trim()) {
      return <p className="text-gray-400 italic">내용이 비어있습니다.</p>
    }

    let headingIndex = 0;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              id={`heading-${headingIndex++}`}
              className="text-2xl font-bold tracking-tight text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-100"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              id={`heading-${headingIndex++}`}
              className="text-xl font-bold tracking-tight text-gray-900 mt-6 mb-3"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              id={`heading-${headingIndex++}`}
              className="text-lg font-semibold text-gray-800 mt-4 mb-2"
              {...props}
            >
              {children}
            </h3>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-indigo-500 pl-4 py-1.5 my-4 bg-gray-50/50 rounded-r-md text-gray-600 italic text-sm"
              {...props}
            >
              {children}
            </blockquote>
          ),
          hr: (props) => <hr className="my-6 border-t border-gray-200" {...props} />,
          p: ({ children, ...props }) => (
            <p className="text-gray-600 text-sm leading-relaxed mb-4" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-2 list-disc pl-5" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-2 list-decimal pl-5" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-slate-650 text-sm mb-1" {...props}>
              {children}
            </li>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg shadow-xs">
              <table className="min-w-full divide-y divide-gray-200 text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => <thead className="bg-gray-50" {...props}>{children}</thead>,
          tbody: ({ children, ...props }) => <tbody className="bg-white divide-y divide-gray-100" {...props}>{children}</tbody>,
          tr: ({ children, ...props }) => <tr className="hover:bg-gray-50/55 transition-colors" {...props}>{children}</tr>,
          th: ({ children, ...props }) => (
            <th className="px-4 py-2.5 text-left font-semibold text-gray-900 border-b border-gray-200" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2.5 text-gray-750 border-b border-gray-150" {...props}>
              {children}
            </td>
          ),
          pre: ({ children, ...props }) => (
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg my-4 font-mono text-xs overflow-x-auto leading-normal whitespace-pre" {...props}>
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-200"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          img: ({ src, alt, ...props }) => (
            <div className="my-4 flex justify-center">
              <img src={src} alt={alt} className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm" {...props} />
            </div>
          ),
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline font-medium"
              {...props}
            >
              {children}
            </a>
          )
        }}
      >
        {md}
      </ReactMarkdown>
    )
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
