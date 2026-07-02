import React, { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import NormalUserMain from '@/domains/docs/NormalUserMain'
import NormalUserIntro from '@/domains/docs/NormalUserIntro'
import MarkdownViewer from '@/domains/content/MarkdownViewer'
import LoginPage from '@/domains/auth/LoginPage'
import DocUserMain from '@/domains/content/DocUserMain'
import AssetAdminPage from '@/domains/content/AssetAdminPage'
import UserManagePage from '@/domains/user/UserManagePage'
import FolderManagePage from '@/domains/folder/FolderManagePage'
import SettingsPage from '@/domains/system/SettingsPage'
import AboutPage from '@/domains/system/AboutPage'
import axios from 'axios'

// 1. JWT 토큰 자동 첨부 인터셉터
axios.interceptors.request.use((config) => {
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
}, (error) => {
  return Promise.reject(error)
})

// 2. 인증 만료(401/403) 시 로그인 페이지로 자동 리다이렉트 인터셉터
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login')
    if (!isLoginRequest && error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('aman_user')
      alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
      window.location.href = '/aman/login'
    }
    return Promise.reject(error)
  }
)

// JWT 토큰에서 만료 시각(ms)을 가져오는 헬퍼 함수
function getJwtExpiry(token: string): number | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    return payload.exp ? payload.exp * 1000 : null
  } catch (e) {
    return null
  }
}

// 인증 가드 컴포넌트
const ProtectedLayout = () => {
  const isAuthenticated = !!localStorage.getItem('aman_user')
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/docs" replace />
  },
  {
    path: '/docs',
    element: <NormalUserMain />,
    children: [
      { index: true, element: <NormalUserIntro /> },
      { path: 'page/:page_id', element: <MarkdownViewer /> },
      { path: 'folder/:folder_id', element: <MarkdownViewer /> }
    ]
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/admin',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <DocUserMain /> },
      { path: 'page/:page_id', element: <DocUserMain /> },
      { path: 'folder/:folder_id', element: <DocUserMain /> },
      { path: 'assets', element: <AssetAdminPage /> },
      { path: 'users', element: <UserManagePage /> },
      { path: 'folders', element: <FolderManagePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'about', element: <AboutPage /> }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/docs" replace />
  }
], {
  basename: '/aman'
})

function App() {

  useEffect(() => {
    let isRefreshing = false

    const checkAndRefresh = async () => {
      const userStr = localStorage.getItem('aman_user')
      if (!userStr) return

      try {
        const user = JSON.parse(userStr)
        if (!user || !user.accessToken) return

        const expiry = getJwtExpiry(user.accessToken)
        if (!expiry) return

        const now = Date.now()
        const timeRemaining = expiry - now

        // 만료 5분(300,000ms) 전이고 만료되지 않았을 때 백그라운드 갱신
        if (timeRemaining > 0 && timeRemaining <= 5 * 60 * 1000) {
          if (isRefreshing) return
          isRefreshing = true
          console.log('Access token expiring soon. Attempting silent refresh...')
          
          try {
            const response = await axios.post('/aman/auth/refresh')
            const newAccessToken = response.data.accessToken
            if (newAccessToken) {
              const updatedUser = { ...user, accessToken: newAccessToken }
              localStorage.setItem('aman_user', JSON.stringify(updatedUser))
              console.log('Silent refresh successful. Access token updated.')
            }
          } catch (error) {
            console.error('Silent refresh failed:', error)
          } finally {
            isRefreshing = false
          }
        }
      } catch (e) {
        console.error('Failed to parse user storage or refresh token:', e)
      }
    }

    // 1분마다 주기적으로 확인
    const intervalId = setInterval(checkAndRefresh, 60 * 1000)

    // 마운트 시 최초 즉시 확인
    checkAndRefresh()

    return () => clearInterval(intervalId)
  }, [])

  return <RouterProvider router={router} />
}

export default App
