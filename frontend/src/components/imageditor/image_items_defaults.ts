export const SYSTEM_ITEM_DEFAULTS = {
  // 1. 원숫자 (circle-number) 전용 속성
  circleNumberBgColor: '#ef4444',
  circleNumberTextColor: '#ffffff',
  circleNumberBorderColor: '#f59e0b',
  circleNumberBorderWidth: 3,
  circleNumberFontSize: 28,

  // 2. 강조 상자 (box) 전용 속성
  boxBorderColor: '#ef4444',
  boxLineWidth: 2,
  boxLineStyle: 'solid' as 'solid' | 'dashed',
  boxBgColor: 'transparent',
  boxOpacity: 100,
  boxBorderRadius: 7,

  // 3. 화살표 (arrow) 전용 속성
  arrowColor: '#ef4444',
  arrowLineWidth: 3,
  arrowLineStyle: 'solid' as 'solid' | 'dashed',
  arrowHeadSize: 2,

  // 4. 일반 텍스트 (text) 전용 속성
  textTextColor: '#0f172a',
  textFontSize: 16,
  textBgColor: 'transparent',
  textFontStyle: 'normal' as 'normal' | 'italic',
  textTextDecoration: 'none' as 'none' | 'underline' | 'line-through',

  // 5. 이모지 심볼 (symbol) 전용 속성
  symbolEmoji: '💡',
  symbolScale: 3,

  // 6. 이미지 아이템 (image) 전용 속성
  imageSrcBorderColor: '#cbd5e1',
  imageSrcBorderWidth: 2,
  imageSrcBorderStyle: 'solid' as 'solid' | 'dashed',
  imageSrcHasBorder: false,
  imageSrcCaptionText: '',
  imageSrcHasCaption: false,

  // 7. 기타 공통 레이아웃 속성
  captionAlign: 'center' as 'left' | 'center',
  hasBorder: true,
  borderColor: '#808080',
  borderWidth: 1,
  borderStyle: 'rounded' as 'basic' | 'rounded'
} as const

// 아이템별 스타일 속성 25필드 shape (SYSTEM_ITEM_DEFAULTS와 동일)
export type StyleConfig = typeof SYSTEM_ITEM_DEFAULTS

// StyleConfig + 캔버스 테두리/캡션 6필드 (작업(Work) 저장/복원 시 사용하는 확장 shape)
export type WorkStyleConfig = StyleConfig & {
  hasCaption: boolean
  captionText: string
}

// FloatingPropertyPanel 색상/이모지 팔레트 (인스펙터/글로벌 탭 공용)
export const BOX_ARROW_BORDER_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a']
export const BOX_BG_COLORS = ['transparent', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#0f172a']
export const CIRCLE_NUMBER_BG_COLORS = ['#4f46e5', '#3b82f6', '#0f172a', '#10b981', '#ef4444']
export const CIRCLE_NUMBER_TEXT_COLORS = ['#ffffff', '#0f172a', '#ef4444', '#3b82f6', '#10b981']
export const CIRCLE_NUMBER_BORDER_COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#3b82f6', '#0f172a']
export const TEXT_COLOR_PALETTE = ['#ffffff', '#0f172a', '#ef4444', '#3b82f6', '#10b981']
export const IMAGE_BORDER_COLORS = ['#cbd5e1', '#64748b', '#3b82f6', '#ef4444', '#808080']
export const SYMBOL_EMOJI_OPTIONS = ['💡', '⚠️', '✅', '❌', 'ℹ️', '⭐', '🔥', '📌', '🚀', '🔍', '❓', '💬']
