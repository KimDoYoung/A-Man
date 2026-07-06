/**
 * 날짜 데이터를 기준으로 '방금 전', '5분 전', '3시간 전' 등의 상대적 경과 시간을 문자열로 변환합니다.
 */
export function formatRelativeTime(dateString: string | Date): string {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  // 미래의 시간이 간혹 시스템 시간차로 인입될 경우에 대응
  if (diffMs < 0) {
    return '방금 전'
  }

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) {
    return '방금 전'
  } else if (diffMin < 60) {
    return `${diffMin}분 전`
  } else if (diffHr < 24) {
    return `${diffHr}시간 전`
  } else if (diffDays < 7) {
    return `${diffDays}일 전`
  } else {
    // 7일 이상 경과했을 경우 일반 날짜 형식으로 반환
    return date.toLocaleDateString()
  }
}
