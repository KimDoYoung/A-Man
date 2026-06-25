import React from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import NormalUserMain from '@/domains/docs/NormalUserMain'
import NormalUserIntro from '@/domains/docs/NormalUserIntro'
import MarkdownViewer from '@/domains/content/MarkdownViewer'
import LoginPage from '@/domains/auth/LoginPage'
import DocUserMain from '@/domains/content/DocUserMain'
import AssetAdminPage from '@/domains/content/AssetAdminPage'
import UserManagePage from '@/domains/user/UserManagePage'
import FolderManagePage from '@/domains/folder/FolderManagePage'
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
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

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
      { path: 'folders', element: <FolderManagePage /> }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/docs" replace />
  }
])

function App() {
  return <RouterProvider router={router} />
}

export default App
