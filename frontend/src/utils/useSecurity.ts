/* eslint-disable no-debugger, no-extra-semi, no-empty */
import { useEffect } from 'react'

export function useSecurity(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    // 1. 우클릭 및 텍스트 드래그/선택 시작 방지
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleSelectStart = (e: Event) => e.preventDefault()
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      alert('보안 정책상 매뉴얼 텍스트를 복사할 수 없습니다.')
    }

    // 2. 단축키 제한 (F12, Ctrl+Shift+I/C/J, Ctrl+S/P/U)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault()
        return
      }
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === 'I' ||
          e.key === 'C' ||
          e.key === 'J' ||
          e.keyCode === 73 ||
          e.keyCode === 67 ||
          e.keyCode === 74)
      ) {
        e.preventDefault()
        return
      }
      if (
        e.ctrlKey &&
        (e.key === 's' ||
          e.key === 'p' ||
          e.key === 'u' ||
          e.key === 'S' ||
          e.key === 'P' ||
          e.key === 'U' ||
          e.keyCode === 83 ||
          e.keyCode === 80 ||
          e.keyCode === 85)
      ) {
        e.preventDefault()
        return
      }
    }

    // 3. F12 개발자 도구 강제 활성화 감시 (도킹창 크기 비교 감지)
    const threshold = 160
    const checkDevTools = () => {
      const widthDev = window.outerWidth - window.innerWidth > threshold
      const heightDev = window.outerHeight - window.innerHeight > threshold
      if (widthDev || heightDev) {
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#ef4444;background:#fafafa;padding:20px;text-align:center;">
            <h2>⚠️ 보안 경고</h2>
            <p>개발자 도구(F12)가 활성화되어 있어 시스템 접근이 제한됩니다.</p>
            <p>개발자 도구를 완전히 종료하신 후 페이지를 새로고침해 주십시오.</p>
          </div>
        `
        throw new Error('DevTools detected.')
      }
    }

    // 4. 무한 디버거(Anti-Debugging) 기동
    let debuggerTimeoutId: any
    const startAntiDebug = () => {
      const debuggerTimer = () => {
        try {
          ;(function a(i: number) {
            if (('' + i / i).length !== 1 || i % 20 === 0) {
              ;(function () {}).constructor('debugger')()
            } else {
              debugger
            }
            a(++i)
          })(0)
        } catch (e) {}
        debuggerTimeoutId = setTimeout(debuggerTimer, 200)
      }
      debuggerTimer()
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', checkDevTools)

    // 즉시 감시 실행 및 디버거 가동
    checkDevTools()
    startAntiDebug()
    const devToolsIntervalId = setInterval(checkDevTools, 500)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', checkDevTools)
      clearInterval(devToolsIntervalId)
      clearTimeout(debuggerTimeoutId)
    }
  }, [enabled])
}
