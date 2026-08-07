export const YOUTUBE_ID_REGEX =
  /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:shorts\/|embed\/|v\/|u\/\w+\/v\/|watch\?(?:[^#]*&)?v=))([a-zA-Z0-9_-]{11})/i

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(YOUTUBE_ID_REGEX)
  return match ? match[1] : null
}

export function isYouTubeUrl(url?: string | null): boolean {
  return !!url && /youtube\.com|youtu\.be/i.test(url)
}

export function isVideoSource(src?: string | null): boolean {
  return !!src && (/\.(mp4|webm|ogg)$/i.test(src) || isYouTubeUrl(src))
}
