import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, Server, Cpu, Layers, Terminal, ShieldCheck, FileText, Sparkles, Code, CheckCircle, ArrowLeft, History, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import DocUserTopBar from '@/components/shared/DocUserTopBar'

interface HistoryItem {
  version: string
  date: string
  description: string[]
}

const AboutPage: React.FC = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(true)

  useEffect(() => {
    axios.get<HistoryItem[]>('/aman/history')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setHistoryList(res.data)
        } else {
          setHistoryList([
            {
              version: "0.0.1",
              date: "2026-06-28",
              description: ["최초 배포"]
            }
          ])
        }
      })
      .catch(err => {
        console.error('히스토리 정보를 불러오는 중 오류가 발생했습니다:', err)
        setHistoryList([
          {
            version: "0.0.1",
            date: "2026-06-28",
            description: ["최초 배포"]
          }
        ])
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 관리자 상단바 */}
      <DocUserTopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 overflow-y-auto">
        <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          
          {/* 히어로 헤더 섹션 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-800 text-white border border-indigo-500/20 p-8 shadow-xl">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AssetERP 매뉴얼 시스템 (A-Man)</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                  A-Man System <span className="text-indigo-200 text-2xl font-mono">v0.0.1</span>
                </h1>
                <p className="text-indigo-100 text-sm md:text-base max-w-2xl leading-relaxed font-normal">
                  일반 사용자에게는 AssetERP 3단계 메뉴 체계에 맞춘 도움말을 제공하고, 
                  한국펀드서비스 작성자에게는 웹 기반 WYSIWYG 마크다운 에디터 환경을 제공하는 통합 매뉴얼 시스템입니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>문서 편집으로 돌아가기</span>
                </button>
              </div>
            </div>

            {/* 기본 정보 배지 */}
            <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
                <span className="text-indigo-200 block mb-1 font-medium">개발 시작일</span>
                <span className="font-semibold text-white">2026.06.22 ~</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
                <span className="text-indigo-200 block mb-1 font-medium">배포 아티팩트</span>
                <span className="font-semibold text-amber-300 font-mono">aman.war</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
                <span className="text-indigo-200 block mb-1 font-medium">운영 WAS 서버</span>
                <span className="font-semibold text-sky-200">Apache Tomcat 8.5</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
                <span className="text-indigo-200 block mb-1 font-medium">데이터베이스</span>
                <span className="font-semibold text-emerald-300">SQLite3 (Single File)</span>
              </div>
            </div>
          </div>

          {/* 시스템 변경 이력 (Release History) - 접기/펼치기 포함 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6 transition-all">
            <div 
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center justify-between border-b border-slate-100 pb-4 cursor-pointer select-none group"
              title={historyOpen ? "히스토리 접기" : "히스토리 펼치기"}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-100 transition-colors">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
                    <span>시스템 업데이트 히스토리 (Release History)</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full">
                      총 {historyList.length}개 버전
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">A-Man 시스템의 버전별 주요 변경 및 배포 이력 (클릭 시 토글)</p>
                </div>
              </div>
              <button 
                type="button"
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
              >
                {historyOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {historyOpen && (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 pt-1">
                {historyList.map((item, index) => (
                  <div key={`${item.version}-${index}`} className="relative group">
                    {/* 타임라인 노드 아이콘 */}
                    <div className="absolute -left-[1.625rem] top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 group-hover:scale-125 transition-transform" />
                    
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/40 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 font-mono bg-white px-2 py-0.5 border border-slate-200 rounded-md shadow-2xs">
                            v{item.version}
                          </span>
                          {index === 0 && (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                              Latest
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {item.date}
                        </span>
                      </div>

                      <ul className="text-xs text-slate-700 space-y-1.5 pt-1 pl-1">
                        {item.description && item.description.map((desc, dIdx) => (
                          <li key={dIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            <span className="leading-relaxed font-normal">{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2컬럼 레이아웃: 주요 목적 & 기술 스택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 시스템 주요 목적 & 기능 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">프로젝트 개요 및 주요 기능</h2>
                  <p className="text-xs text-slate-500 font-medium">시스템 구축 목적과 핵심 서비스 영역</p>
                </div>
              </div>

              <div className="space-y-3.5 text-sm">
                <div className="flex gap-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">일반 사용자 도움말 서비스</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      자산운용회사 직원 등 일반 사용자가 AssetERP의 3depth 메뉴 체계에 맞추어 손쉽게 검색하고 조회할 수 있는 최적화된 매뉴얼 페이지를 제공합니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                  <FileText className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">웹 기반 스마트 매뉴얼 에디터</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      한국펀드서비스 문서 관리 직원이 실시간 마크다운 에디터, 이모지, 특수기호, 상용구, 템플릿, 글자 색상 피커 기능을 활용해 도움말을 신속하게 작성 및 관리합니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                  <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">보안 및 권한 관리</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      JWT (JSON Web Token) 인증 시스템을 통해 관리자 영역을 안전하게 보호하며 계정 및 폴더 구조 관리 기능을 지원합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 기술 스택 상세 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">기술 스택 (Tech Stack)</h2>
                  <p className="text-xs text-slate-500 font-medium">서버 및 클라이언트 아키텍처 사양</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Backend */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2 text-indigo-600">
                      <Server className="w-4 h-4" /> Backend
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-mono text-[11px]">Java 8 / Spring Boot 2.3.12</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1 pl-5 list-disc font-normal">
                    <li>Tomcat 8.5 호환성 준수를 위한 Java 1.8 환경 지원</li>
                    <li>단일 파일 구조의 내장형 SQLite3 데이터베이스 연동</li>
                    <li>Spring Security + JWT 기반 API 라우트 보안 필터</li>
                  </ul>
                </div>

                {/* Frontend */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-2 text-sky-600">
                      <Code className="w-4 h-4" /> Frontend
                    </span>
                    <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200 font-mono text-[11px]">React 19 / TypeScript 5.7 / Vite 6</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1 pl-5 list-disc font-normal">
                    <li>Tailwind CSS 4 기반 모던 프리미엄 UI 디자인 시스템</li>
                    <li>Zustand 전역 상태 관리 & Axios 공통 인터셉터 연동</li>
                    <li>Lucide React 아이콘 및 라이브 마크다운 렌더링 파이프라인</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* 하단 2컬럼: 프로젝트 구조 & CLI 운영 스크립트 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 디렉토리 구조 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">프로젝트 디렉토리 구조</h2>
                  <p className="text-xs text-slate-500 font-medium">주요 모듈 및 리소스 구성</p>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 space-y-1.5 overflow-x-auto shadow-inner">
                <div className="text-indigo-400 font-bold">aman/</div>
                <div className="pl-4 text-slate-300">├── README.md & GEMINI.md <span className="text-slate-500">// 프로젝트 지침 및 설명서</span></div>
                <div className="pl-4 text-slate-300">├── docs/ <span className="text-slate-500">// 시스템 상세 설계서</span></div>
                <div className="pl-4 text-slate-300">├── sqls/ <span className="text-slate-500">// SQLite 데이터베이스 DDL</span></div>
                <div className="pl-4 text-slate-100 font-semibold">├── backend/ <span className="text-slate-500 font-normal">// Spring Boot 백엔드 프로젝트</span></div>
                <div className="pl-8 text-slate-400">└── src/main/resources/history.json</div>
                <div className="pl-4 text-slate-100 font-semibold">└── frontend/ <span className="text-slate-500 font-normal">// React TypeScript 프론트엔드</span></div>
                <div className="pl-8 text-slate-400">└── src/domains/ & components/</div>
              </div>
            </div>

            {/* 운영 관리 스크립트 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">운영 및 개발 스크립트</h2>
                  <p className="text-xs text-slate-500 font-medium">프로젝트 빌드 및 배포 도구</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 space-y-1">
                  <div className="font-mono font-bold text-emerald-600 text-sm">bm.sh</div>
                  <p className="text-slate-600 text-[11px] font-normal">백엔드 실행, 빌드 및 린트 검사 스크립트</p>
                </div>
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 space-y-1">
                  <div className="font-mono font-bold text-sky-600 text-sm">fm.sh</div>
                  <p className="text-slate-600 text-[11px] font-normal">프론트엔드 가동 및 린트 검사 스크립트</p>
                </div>
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 space-y-1">
                  <div className="font-mono font-bold text-amber-600 text-sm">db.sh</div>
                  <p className="text-slate-600 text-[11px] font-normal">SQLite3 데이터베이스 직접 조회 스크립트</p>
                </div>
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 space-y-1">
                  <div className="font-mono font-bold text-indigo-600 text-sm">deploy.sh</div>
                  <p className="text-slate-600 text-[11px] font-normal">WAR 파일 생성 및 Tomcat 서버 배포</p>
                </div>
              </div>
            </div>

          </div>

          {/* 푸터 카피라이트 */}
          <footer className="pt-8 border-t border-slate-200 text-center text-xs text-slate-400 pb-6 font-medium">
            <p>© 2026 한국펀드서비스 (KFS) AssetERP Manual System (A-Man). All rights reserved.</p>
          </footer>

        </main>
      </div>
    </div>
  )
}

export default AboutPage
