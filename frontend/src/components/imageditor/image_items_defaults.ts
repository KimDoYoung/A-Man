export const SYSTEM_ITEM_DEFAULTS = {
  // 1. 원숫자 (circle-number) 전용 속성
  circleNumberBgColor: '#ef4444',
  circleNumberTextColor: '#ffffff',
  circleNumberBorderColor: '#0f172a',
  circleNumberBorderWidth: 3,
  circleNumberFontSize: 13,

  // 2. 강조 상자 (box) 전용 속성
  boxBorderColor: '#ef4444',
  boxLineWidth: 3,
  boxLineStyle: 'dashed' as 'solid' | 'dashed',
  boxBgColor: '#f59e0b',
  boxOpacity: 30,
  boxBorderRadius: 7,

  // 3. 화살표 (arrow) 전용 속성
  arrowColor: '#ef4444',
  arrowLineWidth: 3,
  arrowLineStyle: 'solid' as 'solid' | 'dashed',

  // 4. 일반 텍스트 (text) 전용 속성
  textTextColor: '#0f172a',
  textFontSize: 16,

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
  captionAlign: 'center' as 'left' | 'center'
} as const
