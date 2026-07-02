import React from 'react'
import { FolderTree, SquarePen, TableOfContents, ShieldAlert } from 'lucide-react'
import { useUserLocalSettingStore } from '@/store/useUserLocalSettingStore'

const NormalUserIntro: React.FC = () => {
  const { fontSize, contentWidth } = useUserLocalSettingStore()

  const fontSizeClassMap = {
    sm: {
      intro: 'text-sm text-gray-700 dark:text-slate-200',
      desc: 'text-[11px] text-gray-500 dark:text-slate-400',
      guide: 'list-disc pl-5 space-y-1.5 text-[11px] text-indigo-800 dark:text-indigo-400',
      wrapper: 'space-y-6 text-gray-600 dark:text-slate-300 leading-relaxed text-xs'
    },
    base: {
      intro: 'text-base text-gray-700 dark:text-slate-200',
      desc: 'text-xs text-gray-500 dark:text-slate-400',
      guide: 'list-disc pl-5 space-y-1.5 text-xs text-indigo-800 dark:text-indigo-400',
      wrapper: 'space-y-6 text-gray-600 dark:text-slate-300 leading-relaxed text-sm'
    },
    lg: {
      intro: 'text-lg text-gray-700 dark:text-slate-200',
      desc: 'text-sm text-gray-500 dark:text-slate-400',
      guide: 'list-disc pl-5 space-y-1.5 text-sm text-indigo-800 dark:text-indigo-400',
      wrapper: 'space-y-6 text-gray-600 dark:text-slate-300 leading-relaxed text-base'
    },
    xl: {
      intro: 'text-xl text-gray-700 dark:text-slate-200',
      desc: 'text-base text-gray-500 dark:text-slate-400',
      guide: 'list-disc pl-5 space-y-1.5 text-base text-indigo-800 dark:text-indigo-400',
      wrapper: 'space-y-6 text-gray-600 dark:text-slate-300 leading-relaxed text-lg'
    }
  }[fontSize] || {
    intro: 'text-base text-gray-700 dark:text-slate-200',
    desc: 'text-xs text-gray-500 dark:text-slate-400',
    guide: 'list-disc pl-5 space-y-1.5 text-xs text-indigo-800 dark:text-indigo-400',
    wrapper: 'space-y-6 text-gray-600 dark:text-slate-300 leading-relaxed text-sm'
  }

  const fontSizeClass = {
    sm: 'prose-sm',
    base: 'prose-base',
    lg: 'prose-lg',
    xl: 'prose-xl'
  }[fontSize] || 'prose-base'

  const contentWidthClass = {
    normal: 'max-w-5xl',
    wide: 'max-w-7xl',
    full: 'max-w-none'
  }[contentWidth] || 'max-w-5xl'

  return (
    <article className={`prose dark:prose-invert ${fontSizeClass} ${contentWidthClass} mx-auto`}>
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 pb-4 border-b border-gray-200 dark:border-slate-800 mb-6">
        AssetERP 도움말 센터에 오신 것을 환영합니다
      </h1>
      
      <div className={fontSizeClassMap.wrapper}>
        <p className={fontSizeClassMap.intro}>
          본 매뉴얼 시스템은 <strong>AssetERP</strong>의 효율적인 사용과 업무 처리를 돕기 위해 3단계 메뉴 분류에 기초하여 구축되었습니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          <div className="p-5 border border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50/50 dark:bg-slate-900/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <FolderTree className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 dark:text-slate-100 m-0">3단계 메뉴 구조</h3>
            </div>
            <p className={fontSizeClassMap.desc}>
              왼쪽 내비게이션 트리는 실제 AssetERP의 [대분류 &gt; 중분류 &gt; 소분류] 구조를 그대로 재현하여 직관적인 매칭이 가능합니다.
            </p>
          </div>

          <div className="p-5 border border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50/50 dark:bg-slate-900/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <SquarePen className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 dark:text-slate-100 m-0">마크다운 문서 뷰어</h3>
            </div>
            <p className={fontSizeClassMap.desc}>
              가독성이 뛰어난 서식과 하이라이트 기능을 탑재하여 다양한 ERP 사용 업무 지침을 손쉽게 읽을 수 있습니다.
            </p>
          </div>
          <div className="p-5 border border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50/50 dark:bg-slate-900/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <TableOfContents className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 dark:text-slate-100 m-0">실시간 목차 연동</h3>
            </div>
            <p className={fontSizeClassMap.desc}>
              조회 중인 도움말 지침서 문서의 제목 수준에 따라 우측 목차(TOC)가 실시간으로 자동 구성되어 빠른 본문 이동을 돕습니다.
            </p>
          </div>

          <div className="p-5 border border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50/50 dark:bg-slate-900/50 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 dark:text-slate-100 m-0">문서 관리자 권한</h3>
            </div>
            <p className={fontSizeClassMap.desc}>
              한국펀드서비스(주) 문서 작성자는 에디터를 통해 실시간으로 도움말을 추가, 수정 및 삭제할 수 있습니다.
            </p>
          </div>          
        </div>

        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-5">
          <h4 className="text-indigo-900 dark:text-indigo-300 font-bold mb-2">💡 이용 가이드</h4>
          <ul className={fontSizeClassMap.guide}>
            <li>왼쪽 상단 <strong>필터링 입력창에 키워드 또는 문서번호</strong>를 검색하면 관련 매뉴얼 폴더들이 필터링됩니다.</li>
            <li>왼쪽 상단 툴바의 <strong>햄버거 icon</strong>을 클릭하면 메뉴 트리를 감추거나 보이게 할 수 있습니다.</li>
            <li>왼쪽 트리에서 <strong>3단계 소분류 메뉴</strong>(예: 1412 책무 등록)를 열어 내부 지침 문서를 클릭하십시오.</li>
            <li>본문 우측의 [<strong>목차 감추기(Pin)</strong>] 버튼을 누르면 본문 영역을 확장하여 집중해서 글을 읽을 수 있습니다.</li>
            <li>최 상단 툴바에서 <strong>글자 크기와 문서의 폭</strong>을 조절할 수 있습니다. 모니터에 따라서 최적의 읽기 상태를 만들 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </article>
  )
}

export default NormalUserIntro
