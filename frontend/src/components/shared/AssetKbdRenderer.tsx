import React, { useSyncExternalStore } from 'react'

interface PredefinedBtn {
  color: string
  icon: string
}

interface ButtonGroup {
  color: string
  icon: string
  texts: string[]
}

let predefinedButtonsCache: Record<string, PredefinedBtn> = {}
let loadStarted = false
const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

const ensureButtonDefinesLoaded = () => {
  if (loadStarted || typeof window === 'undefined') return
  loadStarted = true

  const baseUrl = import.meta.env.BASE_URL || '/'
  const url = `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}button-defines.json`

  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load button-defines.json (${res.status})`)
      }
      return res.json() as Promise<ButtonGroup[]>
    })
    .then((groups) => {
      const map: Record<string, PredefinedBtn> = {}
      groups.forEach((group) => {
        group.texts.forEach((text) => {
          map[text] = { color: group.color, icon: group.icon }
        })
      })
      predefinedButtonsCache = map
      notifyListeners()
    })
    .catch((err) => {
      console.error('Failed to load button-defines.json:', err)
    })
}

const subscribeButtonDefines = (listener: () => void) => {
  listeners.add(listener)
  ensureButtonDefinesLoaded()
  return () => {
    listeners.delete(listener)
  }
}

const getButtonDefinesSnapshot = () => predefinedButtonsCache

// 모듈 로드 시점에 미리 JSON을 가져와 렌더링 지연을 최소화
ensureButtonDefinesLoaded()

const darkenColor = (col: string, amt: number): string => {
  if (col.startsWith('#')) {
    const num = parseInt(col.slice(1), 16)
    let r = (num >> 16) - amt
    let g = ((num >> 8) & 0x00ff) - amt
    let b = (num & 0x0000ff) - amt
    r = Math.max(0, r)
    g = Math.max(0, g)
    b = Math.max(0, b)
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
  return col
}

const isLightColor = (color: string): boolean => {
  if (!color.startsWith('#')) return false
  const hex = color.slice(1)
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const brightness = r * 0.299 + g * 0.587 + b * 0.114
    return brightness > 186
  }
  return false
}

interface AssetKbdRendererProps {
  children: React.ReactNode
}

export const AssetKbdRenderer: React.FC<AssetKbdRendererProps> = ({ children }) => {
  const predefinedButtons = useSyncExternalStore(
    subscribeButtonDefines,
    getButtonDefinesSnapshot,
    getButtonDefinesSnapshot
  )
  const text = String(children).trim()

  const renderButton = (colorVal: string, iconVal: string, btnText: string) => {
    let bg = colorVal
    if (!bg) {
      bg = '4D4D4D' // 기본 회색 (buttonColorDefault)
    }
    const isHex = /^[0-9A-F]{3}$|^[0-9A-F]{6}$/i.test(bg)
    const backgroundColor = isHex ? `#${bg}` : bg
    const borderColor = darkenColor(backgroundColor, 10)
    const textColor = isLightColor(backgroundColor) ? '#000000' : '#ffffff'

    // Icon class auto-completes fas fa- if it is just a simple name
    let iconClass = iconVal
    if (iconClass && !iconClass.includes('fa-') && !iconClass.startsWith('fa ')) {
      iconClass = `fas fa-${iconClass}`
    }

    const paddingStyle = btnText ? undefined : { padding: '3px 5px' }

    return (
      <kbd
        className="asset-kbd-btn select-none"
        style={{
          backgroundColor,
          borderColor,
          color: textColor,
          ...paddingStyle
        }}
      >
        {iconClass && <i className={`${iconClass} kbd-fa-icon`} aria-hidden="true"></i>}
        {btnText && <span className="kbd-text">{btnText}</span>}
      </kbd>
    )
  }

  // 1. 구분자가 없는 일반 단어
  if (!text.includes(':')) {
    const predefined = predefinedButtons[text]
    if (predefined) {
      return renderButton(predefined.color, predefined.icon, text)
    }
    // 기본 일반 code 컴포넌트 반환
    return <code className="select-none font-mono text-[11px]">{text}</code>
  }

  // 2. 구분자(:)가 포함된 문법 처리
  const parts = text.split(':')
  if (parts.length >= 3) {
    const color = parts[0].trim()
    const icon = parts[1].trim()
    const buttonText = parts.slice(2).join(':').trim()
    return renderButton(color, icon, buttonText)
  }

  // 매칭되지 않는 텍스트는 일반 code 폴백
  return <code className="select-none font-mono text-[11px]">{text}</code>
}

export default AssetKbdRenderer

