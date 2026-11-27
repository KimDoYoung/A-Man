// 멀티 인스턴스(aman, aman20 ...) 경로·저장소 키의 단일 출처 (docs/multi-instance-설계.md 3.4)
// 빌드 시 VITE_BASE(예: /aman20/)가 import.meta.env.BASE_URL로 주입된다.

const DEFAULT_INSTANCE = 'aman'

/** 컨텍스트 경로 (끝 '/' 없음). 예: '/aman', '/aman20' */
export const CONTEXT_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '') || `/${DEFAULT_INSTANCE}`

/** 인스턴스 이름. 예: 'aman', 'aman20' */
export const INSTANCE = CONTEXT_PATH.replace(/^\/+/, '') || DEFAULT_INSTANCE

/**
 * localStorage 키. 같은 origin의 인스턴스끼리 값이 섞이지 않도록 접두어를 붙인다.
 * 기본 인스턴스(aman)는 기존 키를 그대로 사용하여 하위 호환을 유지한다.
 */
export function storageKey(name: string): string {
  return INSTANCE === DEFAULT_INSTANCE ? name : `${INSTANCE}:${name}`
}
