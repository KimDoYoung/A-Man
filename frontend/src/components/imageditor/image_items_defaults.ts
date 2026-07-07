export const SYSTEM_ITEM_DEFAULTS = {
  // 강조 사각형 및 원숫자 등의 테두리 기본 색상 (기본: #0f1729)
  primaryColor: '#0f1729',
  
  // 원숫자의 기본 배경 색상 (기본: Red #ef4444)
  indigoColor: '#ef4444',
  
  // 강조 상자의 기본 배경 색상
  boxBgColor: 'transparent',
  
  // 강조 상자의 기본 배경 불투명도 (%)
  boxOpacity: 30,
  
  // 강조 상자의 기본 선 스타일 (실선/점선)
  boxLineStyle: 'solid' as 'solid' | 'dashed',
  
  // 강조 상자의 기본 모서리 둥글기 반경 (px)
  boxBorderRadius: 0,
  
  // 기본 선택된 이모지 심볼
  selectedEmoji: '💡',
  
  // 이모지 심볼의 기본 크기 배율 (1-5단계 중 3단계)
  symbolScale: 3,
  
  // 기본 텍스트 색상
  textColor: '#ffffff',
  
  // 기본 글자 크기
  fontSize: 16,
  
  // 기본 선 두께
  lineWidth: 3,
  
  // 기본 설명 캡션 정렬 방식 (left / center)
  captionAlign: 'center' as 'left' | 'center'
} as const
