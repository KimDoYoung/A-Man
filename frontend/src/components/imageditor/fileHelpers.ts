// HTTP 및 HTTPS 모두 호환되는 텍스트 클립보드 복사 헬퍼 함수
export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (err) {
      console.warn('navigator.clipboard 실패, fallback 사용:', err)
    }
  }

  // 비보안 환경(HTTP)용 fallback
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    const successful = document.execCommand('copy')
    textArea.remove()
    if (!successful) throw new Error('execCommand 복사 실패')
  } catch (err) {
    textArea.remove()
    throw new Error('클립보드 복사 최종 실패: ' + err)
  }
}

// File → dataURL → HTMLImageElement 공용 로딩 헬퍼 (addSubImage/loadImage 공용)
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target?.result as string) || '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function loadImageFromFile(file: File): Promise<{ img: HTMLImageElement; dataUrl: string }> {
  const dataUrl = await readFileAsDataURL(file)
  const img = await loadImageElement(dataUrl)
  return { img, dataUrl }
}
