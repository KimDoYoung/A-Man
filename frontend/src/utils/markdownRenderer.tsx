/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react'
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

export const parseInlineStyles = (text: string): React.ReactNode => {
  // 하위 호환성을 위해 남겨두되, 이제 사용되지 않습니다.
  return text;
}

export const renderMarkdownToHtml = (md: string, settings?: Record<string, string>): React.ReactNode => {
  if (!md || !md.trim()) {
    return <p className="text-gray-400 italic">내용이 비어있습니다.</p>;
  }

  // **텍스트(괄호)** 형태 등의 볼드 파싱 에러를 우회하기 위해 <strong> 태그로 강제 치환
  const processedMd = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: ({ children, ...props }) => (
          <h1 className="text-lg font-bold text-slate-900 mt-6 mb-3 pb-1 border-b border-slate-200" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-base font-bold text-slate-900 mt-5 mb-2" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-sm font-semibold text-slate-800 mt-4 mb-2" {...props}>
            {children}
          </h3>
        ),
        blockquote: ({ children, ...props }) => (
          <blockquote
            className="border-l-[3px] border-l-[#c7dbf0] dark:border-l-[#3b5266] px-[18px] py-[12px] my-[14px] bg-[#f7f9fb] dark:bg-slate-900/40 rounded-[6px] text-[#455160] dark:text-slate-300 text-sm [&_p]:my-[4px] [&_p]:text-[14px] [&_p]:leading-relaxed"
            {...props}
          >
            {children}
          </blockquote>
        ),
        hr: (props) => <hr className="my-4 border-t border-slate-200" {...props} />,
        p: ({ children, ...props }) => (
          <p className="text-slate-650 text-sm leading-relaxed mb-3" {...props}>
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
          <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-sm" {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }) => <thead className="bg-slate-50" {...props}>{children}</thead>,
        tbody: ({ children, ...props }) => <tbody className="bg-white divide-y divide-slate-100" {...props}>{children}</tbody>,
        tr: ({ children, ...props }) => <tr className="hover:bg-slate-50/55 transition-colors" {...props}>{children}</tr>,
        th: ({ children, ...props }) => (
          <th className="px-4 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="px-4 py-2.5 text-slate-650 border-b border-slate-200" {...props}>
            {children}
          </td>
        ),
        pre: ({ children, ...props }) => {
          const text = extractText(children)
          return (
            <div className="relative group my-4">
              <pre className="bg-slate-100 text-slate-800 border border-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-normal whitespace-pre m-0" {...props}>
                {children}
              </pre>
              <CopyButton text={text} />
            </div>
          )
        },
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-200" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        img: ({ src, alt, ...props }) => (
          <span className="my-4 flex justify-center">
            <img src={src} alt={alt} className="max-w-full h-auto border border-gray-200 shadow-sm" {...props} />
          </span>
        ),
        a: ({ href, children, ...props }) => {
          const isBlank = !settings || settings.LINK_BLANK !== 'false';
          return (
            <a
              href={href}
              target={isBlank ? "_blank" : undefined}
              rel={isBlank ? "noopener noreferrer" : undefined}
              className="text-indigo-600 hover:text-indigo-800 underline font-medium"
              {...props}
            >
              {children}
            </a>
          );
        }
      }}
    >
      {processedMd}
    </ReactMarkdown>
  )
}
