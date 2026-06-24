import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FolderTree from './components/shared/FolderTree'
import ManualMain from './domains/content/ManualMain'
import MarkdownViewer from './domains/content/MarkdownViewer'

// 임시 컴포넌트 (추후 구현 예정)
const Login = () => <div className="p-8">로그인 화면 (준비 중)</div>
const ContentManager = () => <div className="p-8">매뉴얼 편집기 (준비 중)</div>
const FolderManager = () => <div className="p-8">폴더 관리 (준비 중)</div>
const UserManager = () => <div className="p-8">사용자 관리 (준비 중)</div>

// 임시 인증 가드
const ProtectedLayout = () => {
  const isAuthenticated = true; // JWT 토큰 여부 확인 예정
  return isAuthenticated ? (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 관리자 공통 레이아웃 */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-xs px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">A-Man 관리자 시스템</h2>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Administrator</span>
        </header>
        <main className="flex-1">
          {/* Outlet 대용 라우트별 컴포넌트 렌더링을 위해 react-router-dom Outlet 연동 필요하나 
              지금은 BrowserRouter 구조 내 서브 라우팅이 처리함 */}
        </main>
      </div>
    </div>
  ) : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 일반 사용자용 경로 (Free Pass) */}
        <Route path="/" element={<Navigate to="/docs" replace />} />
        <Route path="/docs" element={<FolderTree />}>
          <Route index element={<ManualMain />} />
          <Route path="page/:page_id" element={<MarkdownViewer />} />
        </Route>

        {/* 2. 로그인 */}
        <Route path="/login" element={<Login />} />

        {/* 3. 관리자 및 작성자 경로 */}
        <Route path="/admin" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="content" replace />} />
          <Route path="content" element={<ContentManager />} />
          <Route path="folders" element={<FolderManager />} />
          <Route path="users" element={<UserManager />} />
        </Route>

        {/* 4. 예외 리다이렉트 */}
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
