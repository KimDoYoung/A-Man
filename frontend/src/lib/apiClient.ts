import axios from 'axios'

// 개발/배포 공통: Vite proxy 설정에 의해 브라우저와 동일한 origin인 /aman으로 요청합니다.
// 개발 환경(http://localhost:5173)에서는 vite.config.ts의 proxy 설정이 http://localhost:8686으로 프록시합니다.
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/aman',
})

instance.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('aman_user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      if (user && user.accessToken) {
        config.headers.Authorization = `Bearer ${user.accessToken}`
      }
    } catch (e) {
      console.error('인증 헤더 설정 에러:', e)
    }
  }
  return config
})

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (!isLoginRequest && error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('aman_user')
      alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
      window.location.href = '/aman/login'
    }
    return Promise.reject(error)
  },
)

// response.data를 직접 반환하는 인터셉터로 인해 타입을 재정의
export const apiClient = instance as unknown as {
  get<T = unknown>(url: string, config?: object): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: object): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: object): Promise<T>
  patch<T = unknown>(url: string, data?: unknown, config?: object): Promise<T>
  delete<T = unknown>(url: string, config?: object): Promise<T>
}
