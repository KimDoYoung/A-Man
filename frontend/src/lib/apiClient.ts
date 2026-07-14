import axios from 'axios'

// 개발/배포 공통: Vite proxy 설정에 의해 브라우저와 동일한 origin인 /aman으로 요청합니다.
// 개발 환경(http://localhost:5173)에서는 vite.config.ts의 proxy 설정이 http://localhost:8686으로 프록시합니다.
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/aman',
  withCredentials: true,
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

// 토큰 갱신 진행 여부 및 대기 큐 정의
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

instance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    const isLoginRequest = originalRequest?.url?.includes('/auth/login')
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh')

    // 401 또는 403 에러이고 로그인이나 리프레시 요청이 아니며, 아직 재시도하지 않은 요청인 경우
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !isLoginRequest &&
      !isRefreshRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // 이미 토큰 갱신 작업이 진행 중이면, 완료될 때까지 대기 큐에 등록
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return instance(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // 백그라운드 토큰 리프레시 요청 (쿠키에 저장된 refresh_token 활용)
        const responseData = await instance.post<{ accessToken: string }>('/auth/refresh')
        const newAccessToken = responseData.accessToken

        if (newAccessToken) {
          const userStr = localStorage.getItem('aman_user')
          if (userStr) {
            const user = JSON.parse(userStr)
            localStorage.setItem(
              'aman_user',
              JSON.stringify({ ...user, accessToken: newAccessToken })
            )
          }

          processQueue(null, newAccessToken)
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return instance(originalRequest)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        // 리프레시 실패 시 로그아웃 및 강제 리다이렉트
        localStorage.removeItem('aman_user')
        alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
        window.location.href = '/aman/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
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
