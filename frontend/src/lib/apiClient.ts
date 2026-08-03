import axios from 'axios'
import { decryptPayload, STATIC_CLIENT_KEY } from '@/utils/crypto'

// 개발/배포 공통: Vite proxy 설정에 의해 브라우저와 동일한 origin인 /aman으로 요청합니다.
// 개발 환경(http://localhost:5173)에서는 vite.config.ts의 proxy 설정이 http://localhost:8686으로 프록시합니다.
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/aman',
  withCredentials: true,
})

let cachedHandshake: {
  key: string;
  block: number;
} | null = null;

let handshakePromise: Promise<{ key: string; block: number }> | null = null;

async function getOrFetchHandshake(): Promise<{ key: string; block: number }> {
  const currentBlock = Math.floor(Date.now() / (1000 * 60 * 10)); // 10 minutes block
  
  if (cachedHandshake && cachedHandshake.block >= currentBlock - 1 && cachedHandshake.block <= currentBlock + 1) {
    return cachedHandshake;
  }
  
  if (handshakePromise) {
    return handshakePromise;
  }
  
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/aman';
  handshakePromise = (async () => {
    try {
      const resp = await axios.get<any>(`${baseURL}/docs/security/handshake`, { withCredentials: true });
      if (!resp.data || typeof resp.data !== 'object' || !resp.data.encryptedKey) {
        throw new Error('핸드셰이크 응답 오류: 백엔드 서버가 재시작되지 않았거나 잘못된 데이터가 리턴되었습니다.');
      }
      const { encryptedKey, block } = resp.data;
      
      const key = await decryptPayload(encryptedKey, STATIC_CLIENT_KEY);
      cachedHandshake = { key, block };
      return cachedHandshake;
    } catch (e) {
      console.error('Handshake failed:', e);
      throw e;
    } finally {
      handshakePromise = null;
    }
  })();
  
  return handshakePromise;
}

instance.interceptors.request.use(async (config) => {
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

  // Inject handshake block for /docs endpoints (except /docs/security/handshake)
  const isDocsRequest = config.url && config.url.startsWith('/docs') && !config.url.includes('/docs/security/handshake');
  if (isDocsRequest) {
    try {
      const handshake = await getOrFetchHandshake();
      config.headers['X-Handshake-Block'] = String(handshake.block);
    } catch (err) {
      console.error('Failed to attach handshake block:', err);
    }
  }

  return config
}, (error) => {
  return Promise.reject(error);
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
  async (response) => {
    const config = response.config;
    const isDocsRequest = config.url && config.url.startsWith('/docs') && !config.url.includes('/docs/security/handshake');
    
    if (isDocsRequest && response.data) {
      try {
        const handshake = await getOrFetchHandshake();
        const key = handshake.key;
        
        const decryptPage = async (page: any) => {
          if (page && typeof page.content === 'string') {
            try {
              page.content = await decryptPayload(page.content, key);
            } catch (err) {
              console.error('Error decrypting page content:', err);
            }
          }
        };

        if (Array.isArray(response.data)) {
          await Promise.all(response.data.map(decryptPage));
        } else {
          await decryptPage(response.data);
        }
      } catch (err) {
        console.error('Decryption interceptor failed:', err);
      }
    }
    
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config
    const isLoginRequest = originalRequest?.url?.includes('/auth/login')
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh')
    const isDocsRequest = originalRequest?.url?.startsWith('/docs') && !originalRequest?.url?.includes('/docs/security/handshake');

    // 403 Forbidden이고 /docs 요청이고 handshake block이 만료되었을 수 있는 경우 재시도
    if (
      error.response &&
      error.response.status === 403 &&
      isDocsRequest &&
      !originalRequest._retryHandshake
    ) {
      originalRequest._retryHandshake = true;
      cachedHandshake = null; // force a new handshake
      try {
        const handshake = await getOrFetchHandshake();
        originalRequest.headers['X-Handshake-Block'] = String(handshake.block);
        return instance(originalRequest);
      } catch (handshakeError) {
        return Promise.reject(handshakeError);
      }
    }

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
        // 리프레시 실패 시 로그아웃 및 경로별 강제 리다이렉트
        localStorage.removeItem('aman_user')
        const isAdminPath = window.location.pathname.includes('/admin')
        if (isAdminPath) {
          alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
          window.location.href = '/aman/login'
        } else {
          window.location.href = '/aman/expired'
        }
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
