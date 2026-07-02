import React, { useState, useEffect } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { useUserLocalSettingStore } from '@/store/useUserLocalSettingStore'
import { OutletContextType, PageData, TocItem } from '@/types'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import { Copy, Check } from 'lucide-react'

const extractText = (node: any): string => {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node.props && node.props.children) return extractText(node.props.children)
  return ''
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2.5 right-2.5 p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-xs transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
      title="코드 복사"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

const MarkdownViewer: React.FC = () => {
  const { page_id, folder_id } = useParams<{ page_id?: string; folder_id?: string }>()
  const { setTocData } = useOutletContext<OutletContextType>()
  const { fontSize, contentWidth } = useUserLocalSettingStore()
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [settings, setSettings] = useState<Record<string, string>>({})

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

  // 사이트 제어 설정 로드
  useEffect(() => {
    axios.get('/aman/health')
      .then(res => {
        if (res.data && res.data.settings) {
          setSettings(res.data.settings)
        }
      })
      .catch(err => {
        console.error('Failed to load settings in MarkdownViewer:', err)
      })
  }, [])

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

  const fontSizeClassMap = {
    sm: {
      p: 'text-xs',
      li: 'text-xs',
      h3: 'text-base',
      h2: 'text-lg',
      h1: 'text-xl',
      table: 'text-xs'
    },
    base: {
      p: 'text-sm',
      li: 'text-sm',
      h3: 'text-lg',
      h2: 'text-xl',
      h1: 'text-2xl',
      table: 'text-sm'
    },
    lg: {
      p: 'text-base',
      li: 'text-base',
      h3: 'text-xl',
      h2: 'text-2xl',
      h1: 'text-3xl',
      table: 'text-base'
    },
    xl: {
      p: 'text-lg',
      li: 'text-lg',
      h3: 'text-2xl',
      h2: 'text-3xl',
      h1: 'text-4xl',
      table: 'text-lg'
    }
  }[fontSize] || {
    p: 'text-sm',
    li: 'text-sm',
    h3: 'text-lg',
    h2: 'text-xl',
    h1: 'text-2xl',
    table: 'text-sm'
  }

  // 표준 마크다운 컴포넌트 렌더러
  const renderMarkdownToHtml = (md: string): React.ReactNode => {
    if (!md || !md.trim()) {
      return <p className="text-gray-400 italic">내용이 비어있습니다.</p>
    }

    let headingIndex = 0;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              id={`heading-${headingIndex++}`}
              className={`${fontSizeClassMap.h1} font-bold tracking-tight text-gray-900 dark:text-slate-100 mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800`}
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              id={`heading-${headingIndex++}`}
              className={`${fontSizeClassMap.h2} font-bold tracking-tight text-gray-900 dark:text-slate-100 mt-6 mb-3`}
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              id={`heading-${headingIndex++}`}
              className={`${fontSizeClassMap.h3} font-semibold text-gray-800 dark:text-slate-200 mt-4 mb-2`}
              {...props}
            >
              {children}
            </h3>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-slate-700 pl-4 py-1.5 my-4 bg-gray-50/50 dark:bg-slate-800/40 rounded-r-md text-gray-600 dark:text-slate-300 italic text-sm [&_p:last-child]:mb-0"
              {...props}
            >
              {children}
            </blockquote>
          ),
          hr: (props) => <hr className="my-6 border-t border-gray-200 dark:border-slate-800" {...props} />,
          p: ({ children, ...props }) => (
            <p className={`text-gray-600 dark:text-slate-300 ${fontSizeClassMap.p} leading-relaxed mb-4`} {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-2 list-disc pl-5 text-gray-600 dark:text-slate-300" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-2 list-decimal pl-5 text-gray-600 dark:text-slate-300" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className={`text-slate-655 dark:text-slate-350 ${fontSizeClassMap.li} mb-1`} {...props}>
              {children}
            </li>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs">
              <table className={`min-w-full divide-y divide-gray-200 dark:divide-slate-850 ${fontSizeClassMap.table}`} {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => <thead className="bg-gray-50 dark:bg-slate-800/80" {...props}>{children}</thead>,
          tbody: ({ children, ...props }) => <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800" {...props}>{children}</tbody>,
          tr: ({ children, ...props }) => <tr className="hover:bg-gray-50/55 dark:hover:bg-slate-800/50 transition-colors" {...props}>{children}</tr>,
          th: ({ children, ...props }) => (
            <th className="px-4 py-2.5 text-left font-semibold text-gray-900 dark:text-slate-100 border-b border-gray-200 dark:border-slate-800" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2.5 text-gray-750 dark:text-slate-300 border-b border-gray-200 dark:border-slate-800" {...props}>
              {children}
            </td>
          ),
          pre: ({ children, ...props }) => {
            const text = extractText(children)
            return (
              <div className="relative group my-4">
                <pre className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-normal whitespace-pre m-0" {...props}>
                  {children}
                </pre>
                <CopyButton text={text} />
              </div>
            )
          },
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="bg-slate-100 dark:bg-slate-950 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-200 dark:border-slate-850"
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
            <span className="my-4 flex justify-center">
              <img src={src} alt={alt} className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm" {...props} />
            </span>
          ),
          a: ({ href, children, ...props }) => {
            const isBlank = settings.LINK_BLANK !== 'false';
            return (
              <a
                href={href}
                target={isBlank ? "_blank" : undefined}
                rel={isBlank ? "noopener noreferrer" : undefined}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline font-medium"
                {...props}
              >
                {children}
              </a>
            );
          }
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

  const fontSizeClass = {
    sm: 'prose-sm',
    base: 'prose-base',
    lg: 'prose-lg',
    xl: 'prose-xl'
  }[fontSize] || 'prose-base'

  const contentWidthClass = {
    normal: 'max-w-5xl',
    wide: 'max-w-7xl',
    full: 'max-w-none'
  }[contentWidth] || 'max-w-5xl'

  return (
    <article className={`prose dark:prose-invert ${fontSizeClass} ${contentWidthClass} mx-auto`}>
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 pb-4 border-b border-gray-200 dark:border-slate-800 mb-6">
        {page.title}
      </h1>
      
      {/* 렌더링된 본문 데이터 뷰 영역 */}
      <div className="markdown-content">
        {renderMarkdownToHtml(page.content)}
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-12 pt-4 border-t border-gray-100 dark:border-slate-800">
        --- 문서의 끝입니다 ---
      </p>
    </article>
  )
}

export default MarkdownViewer
