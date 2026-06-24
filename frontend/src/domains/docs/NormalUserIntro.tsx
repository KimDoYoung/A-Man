import React from 'react'
import { BookOpen, Key, FileText, CheckCircle } from 'lucide-react'

const NormalUserIntro: React.FC = () => {
  return (
    <article className="prose max-w-3xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 pb-4 border-b border-gray-200 mb-6">
        AssetERP 도움말 센터에 오신 것을 환영합니다
      </h1>
      
      <div className="space-y-6 text-gray-600 leading-relaxed text-sm">
        <p className="text-base text-gray-700">
          본 매뉴얼 시스템은 <strong>AssetERP</strong>의 효율적인 사용과 업무 처리를 돕기 위해 3단계 메뉴 분류에 기초하여 구축되었습니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600">
              <BookOpen className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 m-0">3단계 메뉴 구조</h3>
            </div>
            <p className="text-xs text-gray-500">
              왼쪽 내비게이션 트리는 실제 AssetERP의 [대분류 &gt; 중분류 &gt; 소분류] 구조를 그대로 재현하여 직관적인 매칭이 가능합니다.
            </p>
          </div>

          <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600">
              <FileText className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 m-0">마크다운 문서 뷰어</h3>
            </div>
            <p className="text-xs text-gray-500">
              가독성이 뛰어난 서식과 하이라이트 기능을 탑재하여 다양한 ERP 사용 업무 지침을 손쉽게 읽을 수 있습니다.
            </p>
          </div>

          <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600">
              <Key className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 m-0">문서 관리자 권한</h3>
            </div>
            <p className="text-xs text-gray-500">
              한국펀드서비스 권한을 획득한 문서 작성자는 에디터를 통해 실시간으로 도움말을 추가, 수정 및 삭제할 수 있습니다.
            </p>
          </div>

          <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600">
              <CheckCircle className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 m-0">실시간 목차 연동</h3>
            </div>
            <p className="text-xs text-gray-500">
              조회 중인 도움말 지침서 문서의 제목 수준에 따라 우측 목차(TOC)가 실시간으로 자동 구성되어 빠른 본문 이동을 돕습니다.
            </p>
          </div>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-5">
          <h4 className="text-indigo-900 font-bold mb-2">💡 이용 가이드</h4>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-indigo-800">
            <li>왼쪽 상단 필터 입력창에 키워드를 검색하면 관련 매뉴얼 폴더들이 즉시 필터링됩니다.</li>
            <li>왼쪽 트리에서 <strong>3단계 소분류 메뉴</strong>(예: 1.1.1 사용자 관리)를 열어 내부 지침 문서를 클릭하십시오.</li>
            <li>본문 우측의 [목차 감추기(Pin)] 버튼을 누르면 본문 영역을 확장하여 집중해서 글을 읽을 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </article>
  )
}

export default NormalUserIntro
