import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Bold, Italic, Strikethrough, List, ListOrdered, Link, Image, Smile, Type, FileText, Layout, Download, Upload, Palette, HelpCircle, X, Quote, Copy, Check } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

interface Asset {
  id?: number
  atype: 'EMOJI' | 'PHRASE' | 'TEMPLATE' | 'SYMBOL'
  name: string
  value: string
}

const FALLBACK_EMOJIS: Asset[] = [
  { atype: 'EMOJI', name: 'Double Exclamation', value: '‼️' },
  { atype: 'EMOJI', name: 'Exclamation', value: '❗' },
  { atype: 'EMOJI', name: 'Checkmark Thin', value: '✔️' },
  { atype: 'EMOJI', name: 'Flag', value: '🚩' },
  { atype: 'EMOJI', name: 'Right Arrow', value: '➡️' },
  { atype: 'EMOJI', name: 'Memo', value: '📝' },
  { atype: 'EMOJI', name: 'Play Button', value: '▶️' },
  { atype: 'EMOJI', name: 'Red Circle', value: '🔴' },
  { atype: 'EMOJI', name: 'Blue Diamond', value: '🔷' },
  { atype: 'EMOJI', name: 'Blue Circle', value: '🔵' },
  { atype: 'EMOJI', name: 'Point Right', value: '👉' },
  { atype: 'EMOJI', name: 'Prohibited', value: '🚫' },
  { atype: 'EMOJI', name: 'Question Mark', value: '❓' },
  { atype: 'EMOJI', name: 'Light Bulb', value: '💡' },
  { atype: 'EMOJI', name: 'Fire', value: '🔥' },
  { atype: 'EMOJI', name: 'Sparkles', value: '✨' },
  { atype: 'EMOJI', name: 'Tada', value: '🎉' },
  { atype: 'EMOJI', name: 'Pin', value: '📌' },
  { atype: 'EMOJI', name: 'Warning Triangle', value: '⚠️' },
  { atype: 'EMOJI', name: 'Checkmark Thick', value: '✅' },
  { atype: 'EMOJI', name: 'Cross Mark', value: '❌' },
  { atype: 'EMOJI', name: 'Speech Balloon', value: '💬' },
  { atype: 'EMOJI', name: 'Thumbs Up', value: '👍' }
]

const FALLBACK_SYMBOLS: Asset[] = [
  { atype: 'SYMBOL', name: 'Reference Sign (※)', value: '※' },
  { atype: 'SYMBOL', name: 'Black Square (■)', value: '■' },
  { atype: 'SYMBOL', name: 'Black Right-Pointing Triangle (▶)', value: '▶' },
  { atype: 'SYMBOL', name: 'White Circle (○)', value: '○' },
  { atype: 'SYMBOL', name: 'Black Circle (●)', value: '●' },
  { atype: 'SYMBOL', name: 'Black Star (★)', value: '★' },
  { atype: 'SYMBOL', name: 'White Star (☆)', value: '☆' },
  { atype: 'SYMBOL', name: 'Right Arrow (➔)', value: '➔' },
  { atype: 'SYMBOL', name: 'Checkmark (✓)', value: '✓' }
]

interface EditorToolbarProps {
  insertMarkdown: (prefix: string, suffix?: string) => void
  insertLink: () => void
  insertBullet: () => void
  insertNumber: () => void
  selectAndUploadImage: () => void
  aka: string
  onAkaChange: (value: string) => void
  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void
  pageTitle: string
  pageContent: string
  folderId?: string
  onImportSuccess?: (importedPage: any) => void
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  insertMarkdown,
  insertLink,
  insertBullet,
  insertNumber,
  selectAndUploadImage,
  aka,
  onAkaChange,
  previewOpen,
  setPreviewOpen,
  pageTitle,
  pageContent,
  folderId,
  onImportSuccess
}) => {
  const [emojis, setEmojis] = useState<Asset[]>([])
  const [symbols, setSymbols] = useState<Asset[]>([])
  const [phrases, setPhrases] = useState<Asset[]>([])
  const [templates, setTemplates] = useState<Asset[]>([])

  const [emojiOpen, setEmojiOpen] = useState(false)
  const [symbolOpen, setSymbolOpen] = useState(false)
  const [phraseOpen, setPhraseOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [headingOpen, setHeadingOpen] = useState(false)

  const emojiPanelRef = useRef<HTMLDivElement>(null)
  const symbolPanelRef = useRef<HTMLDivElement>(null)
  const phrasePanelRef = useRef<HTMLDivElement>(null)
  const templatePanelRef = useRef<HTMLDivElement>(null)
  const colorPanelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const headingPanelRef = useRef<HTMLDivElement>(null)

  const [downloading, setDownloading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyContent = async () => {
    if (!pageContent) return
    try {
      await navigator.clipboard.writeText(pageContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = pageContent
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleDownloadZip = async () => {
    setDownloading(true)
    try {
      const blob = await apiClient.post<Blob>('/content/export', {
        title: pageTitle || 'document',
        content: pageContent,
        aka: aka
      }, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${aka || 'document'}.zip`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('다운로드 오류:', error)
      alert('ZIP 파일을 생성하는 데 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  const handleTriggerImport = () => {
    if (!folderId) {
      alert('가져오기를 수행할 폴더가 선택되지 않았습니다. 좌측 트리에서 대/중/소 메뉴 폴더를 선택하십시오.')
      return
    }
    fileInputRef.current?.click()
  }

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!folderId) {
      alert('가져오기를 수행할 폴더가 선택되지 않았습니다.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folderId', folderId)

    setImporting(true)
    try {
      const data = await apiClient.post<any>('/content/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      alert('도움말 가져오기가 완료되었습니다.')
      if (onImportSuccess) {
        onImportSuccess(data)
      }
    } catch (err: any) {
      console.error('Import failed:', err)
      alert(err.response?.data || 'ZIP 파일 가져오기 중 오류가 발생했습니다.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  useEffect(() => {
    apiClient.get<Asset[]>('/assets')
      .then(data => {
        
        // EMOJI: split comma-separated values
        const emRaw = data.filter(x => x.atype === 'EMOJI')
        const emParsed: Asset[] = []
        if (emRaw.length > 0) {
          emRaw.forEach(asset => {
            const parts = asset.value.split(',').map(s => s.trim()).filter(Boolean)
            parts.forEach((val, idx) => {
              emParsed.push({
                atype: 'EMOJI',
                name: `${asset.name}-${idx}`,
                value: val
              })
            })
          })
        }

        // SYMBOL: split comma-separated values
        const syRaw = data.filter(x => x.atype === 'SYMBOL')
        const syParsed: Asset[] = []
        if (syRaw.length > 0) {
          syRaw.forEach(asset => {
            const parts = asset.value.split(',').map(s => s.trim()).filter(Boolean)
            parts.forEach((val, idx) => {
              syParsed.push({
                atype: 'SYMBOL',
                name: `${asset.name}-${idx}`,
                value: val
              })
            })
          })
        }

        const ph = data.filter(x => x.atype === 'PHRASE')
        const tm = data.filter(x => x.atype === 'TEMPLATE')

        setEmojis(emParsed.length > 0 ? emParsed : FALLBACK_EMOJIS)
        setSymbols(syParsed.length > 0 ? syParsed : FALLBACK_SYMBOLS)
        setPhrases(ph)
        setTemplates(tm)
      })
      .catch(err => {
        console.error('Failed to load assets:', err)
        setEmojis(FALLBACK_EMOJIS)
        setSymbols(FALLBACK_SYMBOLS)
      })
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(target)) {
        setEmojiOpen(false)
      }
      if (symbolPanelRef.current && !symbolPanelRef.current.contains(target)) {
        setSymbolOpen(false)
      }
      if (phrasePanelRef.current && !phrasePanelRef.current.contains(target)) {
        setPhraseOpen(false)
      }
      if (templatePanelRef.current && !templatePanelRef.current.contains(target)) {
        setTemplateOpen(false)
      }
      if (colorPanelRef.current && !colorPanelRef.current.contains(target)) {
        setColorOpen(false)
      }
      if (headingPanelRef.current && !headingPanelRef.current.contains(target)) {
        setHeadingOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex items-center justify-between text-gray-500 shrink-0 select-none">
      <div className="flex items-center space-x-1">
        {/* 제목 헤더(H) 드롭다운 */}
        <div className="relative" ref={headingPanelRef}>
          <button
            onClick={() => setHeadingOpen(!headingOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-sm px-1.5 cursor-pointer flex items-center space-x-0.5 ${headingOpen ? 'bg-indigo-50 text-indigo-650 border border-indigo-100' : ''}`}
            title="제목 헤더 삽입 (H1 ~ H6)"
          >
            <span>H</span>
            {/* <span className="text-[9px] text-gray-400 font-normal">▼</span> */}
          </button>
          {headingOpen && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg w-48 z-50 flex flex-col gap-1">
              <div className="text-[10px] text-gray-400 font-semibold px-1 mb-1 select-none">제목 크기 선택</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'H1', prefix: '# ', title: '제목 1 (Ctrl+1)', bg: 'bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-800 border border-slate-200' },
                  { label: 'H2', prefix: '## ', title: '제목 2 (Ctrl+2)', bg: 'bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-800 border border-slate-200' },
                  { label: 'H3', prefix: '### ', title: '제목 3 (Ctrl+3)', bg: 'bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-800 border border-slate-200' },
                  { label: 'H4', prefix: '#### ', title: '제목 4', bg: 'bg-slate-50 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 border border-slate-200/60' },
                  { label: 'H5', prefix: '##### ', title: '제목 5', bg: 'bg-slate-50 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 border border-slate-200/60' },
                  { label: 'H6', prefix: '###### ', title: '제목 6', bg: 'bg-slate-50 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 border border-slate-200/60' }
                ].map((h) => (
                  <button
                    key={h.label}
                    onClick={() => {
                      insertMarkdown(h.prefix)
                      setHeadingOpen(false)
                    }}
                    className={`px-2 py-1 rounded text-center text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs ${h.bg}`}
                    title={h.title}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="w-px h-3.5 bg-gray-300"></span>
        <button
          onClick={() => insertMarkdown('**', '**')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="굵게 (Ctrl + B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertMarkdown('*', '*')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="기울임 (Ctrl + I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertMarkdown('~~', '~~')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="취소선 (Ctrl + Shift + S)"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-3.5 bg-gray-300"></span>
        <button
          onClick={insertBullet}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="글머리 기호 (Ctrl + 0)"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={insertNumber}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="번호 매기기 (Ctrl + 9)"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertMarkdown('> ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="인용구 (Ctrl + 8)"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={insertLink}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="링크 삽입 (Ctrl + L)"
        >
          <Link className="w-3.5 h-3.5" />
        </button>

        {/* 글자 색상 드롭다운 */}
        <div className="relative" ref={colorPanelRef}>
          <button
            onClick={() => setColorOpen(!colorOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer ${colorOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}`}
            title="글자 색상 변경"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {colorOpen && (
            <div className="absolute left-0 mt-1 p-1.5 bg-white border border-gray-200 rounded-lg shadow-lg w-36 z-50 space-y-1">
              {[
                { name: '빨강 (Red)', value: 'red', colorClass: 'text-red-500', bgDot: 'bg-red-500' },
                { name: '파랑 (Blue)', value: 'blue', colorClass: 'text-blue-500', bgDot: 'bg-blue-500' },
                { name: '주황 (Orange)', value: 'orange', colorClass: 'text-orange-500', bgDot: 'bg-orange-500' },
                { name: '초록 (Green)', value: 'green', colorClass: 'text-green-500', bgDot: 'bg-green-500' },
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    insertMarkdown(`<font color="${c.value}">`, '</font>')
                    setColorOpen(false)
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded text-xs transition-colors cursor-pointer text-left font-medium"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.bgDot} shrink-0 inline-block`} />
                  <span className={c.colorClass}>{c.name}</span>
                </button>
              ))}
              <div className="pt-1 border-t border-gray-100 mt-1">
                <label className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-100 rounded text-xs transition-colors cursor-pointer font-medium text-gray-700">
                  <span>직접 선택</span>
                  <input
                    type="color"
                    defaultValue="#6366f1"
                    onChange={(e) => {
                      insertMarkdown(`<font color="${e.target.value}">`, '</font>')
                      setColorOpen(false)
                    }}
                    className="w-5 h-5 rounded cursor-pointer border border-gray-300 p-0 bg-transparent shrink-0"
                    title="사용자 지정 색상 선택"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={selectAndUploadImage}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="이미지 업로드 및 삽입 (Ctrl + V 붙여넣기 지원)"
        >
          <Image className="w-3.5 h-3.5" />
        </button>
        
        <span className="w-px h-3.5 bg-gray-300"></span>

        {/* 1. 이모지 */}
        <div className="relative" ref={emojiPanelRef}>
          <button
            onClick={() => setEmojiOpen(!emojiOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer ${emojiOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}`}
            title="이모지 삽입(ctrl+1)"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          {emojiOpen && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg grid grid-cols-8 gap-1 w-48 z-50">
              {emojis.map((item, idx) => (
                <button
                  key={`${item.id || idx}`}
                  onClick={() => {
                    insertMarkdown(item.value)
                    setEmojiOpen(false)
                  }}
                  className="w-5.5 h-5.5 flex items-center justify-center text-base hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  title={item.name}
                >
                  {item.value}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. 특수기호 */}
        <div className="relative" ref={symbolPanelRef}>
          <button
            onClick={() => setSymbolOpen(!symbolOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer ${symbolOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}`}
            title="특수기호 삽입(ctrl+2)"
          >
            <Type className="w-3.5 h-3.5" />
          </button>
          {symbolOpen && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg grid grid-cols-6 gap-1 w-40 z-50">
              {symbols.map((item, idx) => (
                <button
                  key={`${item.id || idx}`}
                  onClick={() => {
                    insertMarkdown(item.value)
                    setSymbolOpen(false)
                  }}
                  className="w-5.5 h-5.5 flex items-center justify-center text-sm hover:bg-gray-100 rounded transition-colors cursor-pointer font-mono text-gray-700"
                  title={item.name}
                >
                  {item.value}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. 상용구 */}
        <div className="relative" ref={phrasePanelRef}>
          <button
            onClick={() => setPhraseOpen(!phraseOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer ${phraseOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}`}
            title="상용구 삽입(ctrl+3)"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          {phraseOpen && (
            <div className="absolute left-0 mt-1 p-2.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto w-80 z-50 flex flex-wrap gap-1.5">
              {phrases.length === 0 ? (
                <div className="w-full text-center text-xs text-gray-400 py-2">등록된 상용구가 없습니다.</div>
              ) : (
                phrases.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      insertMarkdown(item.value)
                      setPhraseOpen(false)
                    }}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded text-purple-700 text-xs font-semibold cursor-pointer transition-colors max-w-[130px] truncate"
                    title={`${item.name}\n---\n${item.value}`}
                  >
                    {item.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 4. 템플릿 */}
        <div className="relative" ref={templatePanelRef}>
          <button
            onClick={() => setTemplateOpen(!templateOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer ${templateOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}`}
            title="템플릿 삽입(ctrl+4)"
          >
            <Layout className="w-3.5 h-3.5" />
          </button>
          {templateOpen && (
            <div className="absolute left-0 mt-1 p-2.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto w-80 z-50 flex flex-wrap gap-1.5">
              {templates.length === 0 ? (
                <div className="w-full text-center text-xs text-gray-400 py-2">등록된 템플릿이 없습니다.</div>
              ) : (
                templates.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      insertMarkdown(item.value)
                      setTemplateOpen(false)
                    }}
                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded text-indigo-750 text-xs font-semibold cursor-pointer transition-colors max-w-[130px] truncate"
                    title={`${item.name}\n---\n${item.value}`}
                  >
                    {item.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* 액션 및 별칭 영역 */}
      <div className="flex items-center space-x-3 ml-auto mr-4">
        <div className="flex items-center space-x-0.5">
          {/* 가져오기 (Import) */}
          <button
            onClick={handleTriggerImport}
            disabled={importing}
            className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="가져오기 (ZIP 업로드)"
          >
            <Upload className={`w-4 h-4 ${importing ? 'text-gray-400 animate-pulse' : 'text-indigo-600'}`} />
          </button>

          {/* 숨겨진 파일 인풋 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportZip}
            accept=".zip"
            className="hidden"
          />

          {/* 내보내기 (Export) */}
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="내보내기 (ZIP 다운로드)"
          >
            <Download className={`w-4 h-4 ${downloading ? 'text-gray-400 animate-bounce' : 'text-indigo-600'}`} />
          </button>

          {/* 본문 복사 (Copy Content) */}
          <button
            onClick={handleCopyContent}
            disabled={!pageContent}
            className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            title="본문 복사"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>

        {/* 세퍼레이터 */}
        <span className="text-gray-300 select-none px-1">|</span>

        {/* 별칭 AKA 입력창 */}
        <span className="text-[10px] font-semibold text-gray-400">별칭:</span>
        <input
          type="text"
          value={aka || ''}
          onChange={(e) => onAkaChange(e.target.value)}
          placeholder="예: 1110"
          className="w-20 px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded focus:outline-hidden focus:border-indigo-500 font-mono text-gray-800"
          title="이 페이지의 별칭을 지정합니다 (예: 1110 입력 시 /aman/manual/1110 으로 접근 가능)"
        />
      </div>

      {/* 도움말 및 미리보기 영역 */}
      <div className="flex items-center space-x-1.5 border-l border-gray-200 pl-3">
        {/* 도움말 버튼 */}
        <button
          onClick={() => setHelpOpen(true)}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 flex items-center justify-center cursor-pointer"
          title="단축키 및 에디터 도움말"
        >
          <HelpCircle className="w-4 h-4 text-slate-500 hover:text-slate-700" />
        </button>

        {/* 미리보기 토글 */}
        <button
          onClick={() => setPreviewOpen(!previewOpen)}
          className="px-1.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-xs text-xs font-medium text-gray-600 flex items-center space-x-1 cursor-pointer"
          title="미리보기토글(F9)"
        >
          {previewOpen ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* 단축키 및 에디터 도움말 모달 */}
      {helpOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] transition-all duration-300">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl border border-slate-100 transform transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-950 flex items-center space-x-1.5">
                <HelpCircle className="w-4.5 h-4.5 text-indigo-650" />
                <span>에디터 단축키 및 마크다운 도움말</span>
              </h3>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs text-gray-600 custom-scroll">
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-xs flex items-center">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-xs mr-1.5 inline-block"></span>
                  단축키 목록
                </h4>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-100 text-slate-500 font-semibold">
                        <th className="px-3 py-2">기능</th>
                        <th className="px-3 py-2">단축키</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { name: '변경사항 저장하기', keys: ['Ctrl', 'S'] },
                        { name: '이모지 삽입 패널 (커서 위치)', keys: ['Ctrl', '1'] },
                        { name: '특수기호 삽입 패널 (커서 위치)', keys: ['Ctrl', '2'] },
                        { name: '상용구 삽입 패널 (커서 위치)', keys: ['Ctrl', '3'] },
                        { name: '템플릿 삽입 패널 (커서 위치)', keys: ['Ctrl', '4'] },
                        { name: '인용구 (Blockquote) 변환', keys: ['Ctrl', '8'] },
                        { name: '굵게 (Bold) 텍스트 감싸기', keys: ['Ctrl', 'B'] },
                        { name: '기울임 (Italic) 텍스트 감싸기', keys: ['Ctrl', 'I'] },
                        { name: '취소선 (Strike) 텍스트 감싸기', keys: ['Ctrl', 'Shift', 'S'] },
                        { name: '글머리 기호 리스트 변환', keys: ['Ctrl', '0'] },
                        { name: '번호 매기기 리스트 변환', keys: ['Ctrl', '9'] },
                        { name: '표 ↔ CSV 양방향 전환 / 표 삽입', keys: ['Ctrl', ','] },
                        { name: '마크다운 링크 ([텍스트](URL)) 삽입', keys: ['Ctrl', 'L'] },
                      ].map((item) => (
                        <tr key={item.name} className="hover:bg-slate-50/50">
                          <td className="px-3 py-1.5 font-medium text-slate-700">{item.name}</td>
                          <td className="px-3 py-1.5">
                            {item.keys.map((k, i) => (
                              <React.Fragment key={k}>
                                {i > 0 && <span className="mx-1 text-slate-400 font-normal">+</span>}
                                <kbd className="px-1.5 py-0.5 text-[9px] font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-md shadow-xs font-mono">
                                  {k}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-xs flex items-center">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-xs mr-1.5 inline-block"></span>
                  편리한 편집 꿀팁
                </h4>
                <ul className="list-disc list-inside space-y-2 pl-1.5 text-slate-600 leading-relaxed text-[11px]">
                  <li>
                    <strong className="text-slate-800">들여쓰기 및 내어쓰기 (Tab / Shift + Tab)</strong>: 
                    텍스트 블록을 전체 드래그한 상태에서 <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[9px]">Tab</kbd> 키를 누르면 줄 시작 부분에 들여쓰기가 추가되고, 
                    <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[9px]">Shift+Tab</kbd> 키를 누르면 들여쓰기가 한 단계 제거됩니다.
                  </li>
                  <li>
                    <strong className="text-slate-800">편집 행 화면 중앙 정렬 (Alt + Z)</strong>: 
                    화면 최하단 부근에서 편집할 때 <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[9px]">Alt+Z</kbd> 키를 누르면 현재 작성 중인 행이 즉시 화면 중앙으로 스크롤 조정되어 편안하게 작성하실 수 있습니다.
                  </li>
                  <li>
                    <strong className="text-slate-800">강제 다음 줄 줄바꿈 (Shift + Enter)</strong>: 
                    커서가 단어 중간 등 어디에 위치해 있든 상관없이 <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[9px]">Shift+Enter</kbd>를 누르면 즉시 다음 줄로 커서가 이동하여 편리합니다.
                  </li>
                  <li>
                    <strong className="text-slate-800">목록 및 인용구 자동 줄바꿈 연속</strong>: 
                    글머리 기호(<code className="font-mono text-[10px] text-indigo-650 bg-indigo-50 px-1 rounded">-</code>), 번호 매기기, 인용구(<code className="font-mono text-[10px] text-indigo-650 bg-indigo-50 px-1 rounded">&gt;</code>) 줄에서 엔터를 치면 다음 줄에도 기호가 자동 생성됩니다. 내용이 비어있을 때 엔터를 한 번 더 치면 기호가 지워지며 목록 작성이 종료됩니다.
                  </li>
                  <li>
                    <strong className="text-slate-800">클립보드 이미지 직접 붙여넣기 (Ctrl + V)</strong>: 
                    화면 캡처나 클립보드에 복사된 이미지 파일을 에디터 내부에서 <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[9px]">Ctrl+V</kbd>로 즉시 붙여넣어 서버에 자동 업로드하고 마크다운 이미지 코드를 추가할 수 있습니다.
                  </li>
                  <li>
                    <strong className="text-slate-800">우클릭 커스텀 메뉴</strong>: 
                    마크다운 편집창 안에서 마우스 우클릭을 하면 단축키 지원 메뉴가 팝업되어, 클릭만으로 다양한 태그를 쉽게 넣을 수 있습니다.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-gray-100 pt-3 mt-4">
              <button
                onClick={() => setHelpOpen(false)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                도움말 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditorToolbar
