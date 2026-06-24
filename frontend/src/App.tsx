import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import NormalUserMain from '@/domains/docs/NormalUserMain'
import NormalUserIntro from '@/domains/docs/NormalUserIntro'
import MarkdownViewer from '@/domains/content/MarkdownViewer'
import LoginPage from '@/domains/auth/LoginPage'
import DocUserMain from '@/domains/content/DocUserMain'

// 인증 가드 컴포넌트
const ProtectedLayout = () => {
  const isAuthenticated = !!localStorage.getItem('aman_user')
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 일반 사용자용 경로 (Free Pass) */}
        <Route path="/" element={<Navigate to="/docs" replace />} />
        <Route path="/docs" element={<NormalUserMain />}>
          <Route index element={<NormalUserIntro />} />
          <Route path="page/:page_id" element={<MarkdownViewer />} />
        </Route>

        {/* 2. 로그인 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 3. 관리자 및 작성자 경로 */}
        <Route path="/admin" element={<ProtectedLayout />}>
          <Route index element={<DocUserMain />} />
          <Route path="page/:page_id" element={<DocUserMain />} />
        </Route>

        {/* 4. 예외 리다이렉트 */}
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
