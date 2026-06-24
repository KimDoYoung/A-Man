import React from 'react';

// 굵게(**), 기울임(*), 인라인코드(`) 등의 스타일 인라인 인코더 (링크, 이미지, 인라인 코드 지원 추가)
export const parseInlineStyles = (text: string): React.ReactNode => {
  if (!text) return '';
  let tokens: React.ReactNode[] = [text];

  // 1. 이미지 파싱: !\[(.*?)\]\((.*?)\)
  tokens = tokens.flatMap((token, index) => {
    if (typeof token !== 'string') return token;
    const regex = /!\[(.*?)\]\((.*?)\)/g;
    const result: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(token)) !== null) {
      if (match.index > lastIdx) {
        result.push(token.substring(lastIdx, match.index));
      }
      const alt = match[1];
      const url = match[2];
      result.push(
        <img
          key={`img-inline-${index}-${match.index}`}
          src={url}
          alt={alt}
          className="inline-block max-w-full h-auto rounded-md border border-gray-200 my-1 align-middle"
        />
      );
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < token.length) {
      result.push(token.substring(lastIdx));
    }
    return result;
  });

  // 2. 링크 파싱: \[(.*?)\]\((.*?)\)
  tokens = tokens.flatMap((token, index) => {
    if (typeof token !== 'string') return token;
    const regex = /\[(.*?)\]\((.*?)\)/g;
    const result: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(token)) !== null) {
      if (match.index > lastIdx) {
        result.push(token.substring(lastIdx, match.index));
      }
      const linkText = match[1];
      const url = match[2];
      result.push(
        <a
          key={`link-inline-${index}-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline font-medium"
        >
          {linkText}
        </a>
      );
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < token.length) {
      result.push(token.substring(lastIdx));
    }
    return result;
  });

  // 3. 굵게 파싱: \*\*(.*?)\*\*
  tokens = tokens.flatMap((token, index) => {
    if (typeof token !== 'string') return token;
    const regex = /\*\*(.*?)\*\*/g;
    const result: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(token)) !== null) {
      if (match.index > lastIdx) {
        result.push(token.substring(lastIdx, match.index));
      }
      const boldText = match[1];
      result.push(
        <strong key={`bold-inline-${index}-${match.index}`} className="font-bold text-gray-900">
          {boldText}
        </strong>
      );
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < token.length) {
      result.push(token.substring(lastIdx));
    }
    return result;
  });

  // 4. 인라인 코드 파싱: `(.*?)`
  tokens = tokens.flatMap((token, index) => {
    if (typeof token !== 'string') return token;
    const regex = /`(.*?)`/g;
    const result: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(token)) !== null) {
      if (match.index > lastIdx) {
        result.push(token.substring(lastIdx, match.index));
      }
      const codeText = match[1];
      result.push(
        <code key={`code-inline-${index}-${match.index}`} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-200">
          {codeText}
        </code>
      );
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < token.length) {
      result.push(token.substring(lastIdx));
    }
    return result;
  });

  return <>{tokens}</>;
};

// 초경량 마크다운 렌더러 (테이블, 이미지, 링크, 인라인 코드 지원 추가)
export const renderMarkdownToHtml = (md: string): React.ReactNode[] => {
  if (!md.trim()) return [<p key="empty" className="text-gray-400 italic">내용이 비어있습니다.</p>];
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 0. 코드 블록 파싱 (```로 시작하는 블록)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.substring(3).trim();
      const codeLines: string[] = [];
      i++; // 첫 줄(```) 건너뛰기
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      if (i < lines.length) {
        i++; // 끝 줄(```) 건너뛰기
      }

      elements.push(
        <pre key={`codeblock-${i}`} className="bg-slate-900 text-slate-100 p-4 rounded-lg my-4 font-mono text-xs overflow-x-auto leading-normal whitespace-pre">
          <code className={lang ? `language-${lang}` : ''}>
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      continue;
    }

    // 1. 테이블 파싱
    if (trimmed.startsWith('|')) {
      const rows: string[][] = [];
      
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowLine = lines[i].trim();
        const cells = rowLine
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => c.trim());
        
        // 헤더 구분선 제외 (ex: |---|---|...)
        const isSeparator = cells.every(c => c.startsWith('-') || c.endsWith('-'));
        if (!isSeparator) {
          rows.push(cells);
        }
        i++;
      }

      if (rows.length > 0) {
        const header = rows[0];
        const body = rows.slice(1);

        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-4 border border-slate-200 rounded-lg shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {header.map((cell, idx) => (
                    <th key={`th-${idx}`} className="px-4 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                      {parseInlineStyles(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {body.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-50/55 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${cIdx}`} className="px-4 py-2.5 text-slate-650 border-b border-slate-150">
                        {parseInlineStyles(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 2. 리스트 파싱 (연속된 리스트 그룹화)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        const itemText = lines[i].trim().substring(2);
        items.push(
          <li key={`li-${i}`} className="list-disc ml-5 text-slate-650 text-sm mb-1">
            {parseInlineStyles(itemText)}
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="my-2">{items}</ul>);
      continue;
    }

    // 3. 이미지 파싱 (ex: ![alt](url))
    const imageRegex = /^!\[(.*?)\]\((.*?)\)$/;
    const imgMatch = trimmed.match(imageRegex);
    if (imgMatch) {
      const alt = imgMatch[1];
      const url = imgMatch[2];
      elements.push(
        <div key={`img-${i}`} className="my-4 flex justify-center">
          <img src={url} alt={alt} className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm" />
        </div>
      );
      i++;
      continue;
    }

    // 4. 기타 일반 블록 요소들
    if (trimmed.startsWith('# ')) {
      const text = trimmed.substring(2);
      elements.push(
        <h1 key={`h1-${i}`} className="text-lg font-bold text-slate-900 mt-6 mb-3 pb-1 border-b border-slate-200">
          {parseInlineStyles(text)}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      const text = trimmed.substring(3);
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-bold text-slate-900 mt-5 mb-2">
          {parseInlineStyles(text)}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      const text = trimmed.substring(4);
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-semibold text-slate-800 mt-4 mb-2">
          {parseInlineStyles(text)}
        </h3>
      );
    } else if (trimmed.startsWith('> ')) {
      const text = trimmed.substring(2);
      elements.push(
        <blockquote key={`quote-${i}`} className="border-l-4 border-indigo-500 pl-4 py-1.5 bg-slate-50 text-slate-600 italic my-3 text-sm rounded-r">
          {parseInlineStyles(text)}
        </blockquote>
      );
    } else if (trimmed === '---') {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-t border-slate-200" />);
    } else if (trimmed !== '') {
      elements.push(
        <p key={`p-${i}`} className="text-slate-650 text-sm leading-relaxed mb-3">
          {parseInlineStyles(trimmed)}
        </p>
      );
    }

    i++;
  }

  return elements;
};
