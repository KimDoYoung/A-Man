# frontend 라우팅

## 제안하는 Frontend URL 구조
   URL 경로               | 타겟 컴포넌트                | 접근 권한    | 화면 설명 및 구성 요소
  ------------------------|------------------------------|--------------|------------------------------
    /                     |  Navigate (Redirect)         | Free Pass    | •  /docs 로 자동 리다이렉션
    /docs                 |  ManualLayout  >  ManualMain | Free Pass    | • 일반사용자용 메인 화면•
                          |                              |              | 왼쪽: 3depth 메뉴 트리
                          |                              |              | 아코디언• 오른쪽: 환영 인사
                          |                              |              | 및 전체 도움말 사용 가이드
    /docs/page/{page_id}  |  ManualLayout  >             | Free Pass    | • 특정 도움말 상세 뷰어•
                          | MarkdownViewer               |              | pages 테이블에서 가져온
                          |                              |              | 마크다운 렌더링
    /login                |  Login                       | Free Pass    | • 로그인 화면 (쿠키 베이스
                          |                              |              | JWT 세션 획득)
    /admin                |  Navigate (Redirect)         | 토큰 필요    | •  /admin/content 로 자동
                          |                              |              | 리다이렉션
    /admin/content        |  AdminLayout  >              | 토큰 필요    | • 도움말 문서 편집 대시보드•
                          | ContentManager               |              | WYSIWYG 에디터(
                          |                              |              | @milkdown/crepe )를 연동한
                          |                              |              | 추가/수정/삭제
    /admin/folders        |  AdminLayout  >              | 토큰 필요    | • 3단계 메뉴 폴더 관리 화면•
                          | FolderManager                |              | 대/중/소 카테고리 추가 및
                          |                              |              | 순서 제어
    /admin/users          |  AdminLayout  >  UserManager |  admin  전용 | • 회원 관리 화면 ( AG Grid
                          |                              |              | 연동)• 신규 계정 추가, 패치
                          |                              |              | 수정, Soft Delete(비활성)

## /admin으로 접속시

- 로그인 상태가 아니라면 /login페이지로 이동.
- 로그인 상태라면 /admin/content로 이동

## ContentPage설계
- TopBar  : 왼쪽 'A-Man version', 오른쪽 : 로그인유저명, 로그아웃
- ContentLayout
  - 왼쪽 : MenuTree 30% width
    - 종단 즉 3 level의 메뉴가 선택시 오른쪽 ContentEditView에 내용이 display됨
  - 오른쪽 : ContentEditView 2개의 탭으로 구성된 편집과 보기  70% width
    - 1번탭 편집 : tiptap을 기본으로 함. markdown 편집기
    - 2번탭 : 현재 편집중인 내용을 보기
