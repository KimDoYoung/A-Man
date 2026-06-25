import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Bold, Code, List, ListOrdered, Link, Image, Smile, Type, FileText, Layout } from 'lucide-react'
import axios from 'axios'

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
  setPreviewOpen
}) => {
  const [emojis, setEmojis] = useState<Asset[]>([])
  const [symbols, setSymbols] = useState<Asset[]>([])
  const [phrases, setPhrases] = useState<Asset[]>([])
  const [templates, setTemplates] = useState<Asset[]>([])

  const [emojiOpen, setEmojiOpen] = useState(false)
  const [symbolOpen, setSymbolOpen] = useState(false)
  const [phraseOpen, setPhraseOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)

  const emojiPanelRef = useRef<HTMLDivElement>(null)
  const symbolPanelRef = useRef<HTMLDivElement>(null)
  const phrasePanelRef = useRef<HTMLDivElement>(null)
  const templatePanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    axios.get<Asset[]>('/aman/assets')
      .then(res => {
        const data = res.data
        
        // EMOJI: split comma-separated values
        const emRaw = data.filter(x => x.atype === 'EMOJI')
        let emParsed: Asset[] = []
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
        let syParsed: Asset[] = []
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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-gray-500 shrink-0 select-none">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => insertMarkdown('# ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-1 cursor-pointer"
          title="H1 헤더 추가"
        >
          H1
        </button>
        <button
          onClick={() => insertMarkdown('## ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-1 cursor-pointer"
          title="H2 헤더 추가"
        >
          H2
        </button>
        <button
          onClick={() => insertMarkdown('### ')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 font-bold text-xs px-1 cursor-pointer"
          title="H3 헤더 추가"
        >
          H3
        </button>
        <span className="w-px h-3.5 bg-gray-300"></span>
        <button
          onClick={() => insertMarkdown('**', '**')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="굵게"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertMarkdown('`', '`')}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="인라인 코드"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-3.5 bg-gray-300"></span>
        <button
          onClick={insertBullet}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="글머리 기호 (Ctrl+0)"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={insertNumber}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="번호 매기기 (Ctrl+9)"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={insertLink}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="링크 삽입 (Ctrl+L)"
        >
          <Link className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={selectAndUploadImage}
          className="p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer"
          title="이미지 업로드 및 삽입"
        >
          <Image className="w-3.5 h-3.5" />
        </button>
        
        <span className="w-px h-3.5 bg-gray-300"></span>

        {/* 1. 이모지 */}
        <div className="relative" ref={emojiPanelRef}>
          <button
            onClick={() => setEmojiOpen(!emojiOpen)}
            className={`p-1 hover:bg-gray-200 rounded text-gray-800 cursor-pointer ${emojiOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}`}
            title="이모지 삽입"
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
            title="특수기호 삽입"
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
            title="상용구 삽입"
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
            title="템플릿 삽입"
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

      {/* 별칭 AKA 입력창 */}
      <div className="flex items-center space-x-1.5 ml-auto mr-4">
        <span className="text-[10px] font-semibold text-gray-400">별칭(AKA):</span>
        <input
          type="text"
          value={aka || ''}
          onChange={(e) => onAkaChange(e.target.value)}
          placeholder="예: 1110"
          className="w-24 px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded focus:outline-hidden focus:border-indigo-500 font-mono text-gray-800"
          title="이 페이지의 별칭을 지정합니다 (예: 1110 입력 시 /aman/manual/1110 으로 접근 가능)"
        />
      </div>

      {/* 미리보기 토글 */}
      <button
        onClick={() => setPreviewOpen(!previewOpen)}
        className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-xs text-xs font-medium text-gray-600 flex items-center space-x-1 cursor-pointer"
      >
        {previewOpen ? (
          <>
            <EyeOff className="w-3.5 h-3.5" />
            <span>숨기기</span>
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" />
            <span>보이기</span>
          </>
        )}
      </button>
    </div>
  )
}

export default EditorToolbar
