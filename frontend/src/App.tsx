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
import BackupPages from '@/domains/system/BackupPages'
import LogPages from '@/domains/system/LogPages'
import AboutPage from '@/domains/system/AboutPage'
import PageManagePage from '@/domains/content/PageManagePage'
import { apiClient } from '@/lib/apiClient'

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
      { path: 'pages', element: <PageManagePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'backup', element: <BackupPages /> },
      { path: 'logs', element: <LogPages /> },
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
            const data = await apiClient.post<any>('/auth/refresh')
            const newAccessToken = data.accessToken
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

    // 브라우저 탭이 활성화될 때(슬립 모드 해제 등) 즉시 토큰 체크하도록 리스너 등록
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible. Checking token validity...')
        checkAndRefresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 마운트 시 최초 즉시 확인
    checkAndRefresh()

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return <RouterProvider router={router} />
}

export default App
