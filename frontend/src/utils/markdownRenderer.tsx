/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'

import AssetKbdRenderer from '@/components/shared/AssetKbdRenderer'

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
        pre: ({ children, ...props }) => (
          <pre className="bg-slate-100 text-slate-800 border border-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-normal whitespace-pre my-4 select-none" {...props}>
            {children}
          </pre>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return <AssetKbdRenderer>{children}</AssetKbdRenderer>;
          }
          return (
            <code className={`${className} select-none`} {...props}>
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
