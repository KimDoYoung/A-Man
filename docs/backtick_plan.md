# 구현 계획 - 마크다운 백틱(`) 확장 파싱 및 ERP 버튼 스타일 렌더러 구현 (Full-Stack)

이 문서는 마크다운 작성 및 조회 시 백틱(`)을 사용해 AssetERP 스타일의 특화된 버튼(배경색 및 FontAwesome 아이콘 포함)을 편리하게 표현하고 렌더링하기 위한 프론트엔드/백엔드 공통 구현 계획을 설명합니다.

프로젝트 내 문서 경로: [docs/backtick_plan.md](file:///home/kdy987/work/aman/docs/backtick_plan.md)

## 목표 설명
사용자(문서 작성자)가 마크다운 편집 중 백틱(`)을 사용하여 ERP 버튼을 시각적으로 묘사하고자 할 때, 일반 인라인 코드로 렌더링되는 대신 실제 ERP 시스템의 버튼(아이콘 및 배경색)과 동일한 형태의 `<kbd>` 요소로 렌더링되도록 기능을 확장합니다. 

이 기능은 React 프론트엔드 뷰어뿐 아니라, 백엔드(`ManualController.java`)를 통해 HTML 문서가 조회되거나 인쇄되는 환경에서도 동일하게 작동해야 합니다.

## 문법 프로토콜 정의 (`[HEX색상코드(또는 테마명)]:[FontAwesome아이콘명]:[버튼 텍스트]`)
백틱 내부에 들어가는 텍스트는 콜론(`:`)을 구분자로 하여 다음과 같은 구조를 가집니다:

1. **풀 포맷**: `` `ffff00:fa fa-edit:등록` ``
   - 배경색: `#ffff00`
   - 아이콘: `fa fa-edit`
   - 텍스트: `등록`
2. **색상 생략**: `` `:fas fa-plus:추가` ``
   - 배경색: 기본 색상(회색 계열) 사용
   - 아이콘: `fas fa-plus`
   - 텍스트: `추가`
3. **아이콘 생략**: `` `ff0000::저장` ``
   - 배경색: `#ff0000`
   - 아이콘: 출력하지 않음
   - 텍스트: `저장`
4. **색상, 아이콘 모두 생략**: `` `삭제` ``
   - 텍스트가 **기등록된 키워드**(`등록`, `수정`, `삭제`, `저장`, `조회`, `추가` 등)인 경우: 정의된 색상 및 아이콘 적용
   - 미등록 단어인 경우: 기본 `<kbd>` 스타일로 일반 렌더링
5. **텍스트 생략**: `` `:fa fa-plus:` `` 또는 `` `ffff00:fa fa-plus:` ``
   - 아이콘과 배경색만 렌더링
6. **예외 형식 처리**: `` `:abc` `` 등 구분자 개수가 부족하거나 포맷에 맞지 않는 경우
   - 기본 `<kbd>` 스타일로 기재된 텍스트 자체를 렌더링

---

## 🔍 ERP 정의 추출 정보
`~/tmp/ColorButtonBar.java`와 `styles.gss`로부터 분석해 낸 실제 AssetERP 버튼의 스타일 매핑 규칙을 컴포넌트의 기본 정의 데이터(`PREDEFINED_BUTTONS`)로 추가합니다.

- **기본 테마 색상(Hex) 정의**:
  - `blue`: `#456EA6`
  - `mint`: `#17A2B8`
  - `red`: `#DD5E5E`
  - `orange`: `#E89646`
  - `darkGray`: `#646362`
  - `lightBlue`: `#6AB6CF`
  - `green`: `#2EAC7E`
  - `dark`: `#343A40`
  - `default`: `#4D4D4D`

---

## 💻 상세 소스코드 구현 설계 (Proposed Code)

### 1. Frontend (React + TypeScript)

#### [NEW] [AssetKbdRenderer.tsx](file:///home/kdy987/work/aman/frontend/src/components/shared/AssetKbdRenderer.tsx)
```tsx
import React from 'react'

interface PredefinedBtn {
  color: string
  icon: string
}

const buttonGroups = [
  {
    color: '456EA6', // blue
    icon: 'fas fa-search',
    texts: ['조회', '검색', '찾기', '변경 및 상세보기', '기간조회', '내역상세', '지출결의서 선택', '미흡/개선 조치계획', '발생 점검항목 보기', '문서보기']
  },
  {
    color: '456EA6',
    icon: 'fas fa-plus',
    texts: ['일회성조건', '반복주기조건', '행 추가', '전체선택', '분류추가', 'C/F가져오기', '차변 행추가', '대변 행추가', '직원추가', '부서추가', '계좌추가', '연관법규 추가', '연관내규 추가']
  },
  {
    color: '456EA6',
    icon: 'fas fa-user-times',
    texts: ['없음']
  },
  {
    color: '456EA6',
    icon: 'fas fa-envelope',
    texts: ['개별전송', '전체전송', '메일발송', '발송', '일괄 알림발송', '반려건 일괄 알림발송', '마감문자발송', '알림발송']
  },
  {
    color: '456EA6',
    icon: 'fas fa-calculator',
    texts: ['계산하기']
  },
  {
    color: '17A2B8', // mint
    icon: 'fas fa-check',
    texts: ['저장', '반영', '전체적용', '내역확정', '선택내역확정', '전체내역확정', '마감', '전표발생', '회계마감', '승인', '일괄저장', '처리', '확정', '사용여부 일괄설정', '문서분류지정', '통제그룹담당자 지정', '일괄 권한설정', '결산처리', '자동연장', '지급확인', '확인', 'ICAM발생내역 가져오기', '환율적용', '평가처리', '배포처리', '관심종목 등록', '항목별 계정연결', '출력정보 및 사용여부 설정', '고객사반영', 'Admin(관리자)정보로 고객사 변경', '상장주식 평가처리', '제출', '관리그룹 일괄지정', '주계좌 설정', '복리후생비 설정', '게시물 항목 설정', '계정과목연결', '알림설정', '책무유형 관리', '잠금', '담당자 일괄변경', '부서일괄지정', '관리의무생성', '작성완료', '점검자일괄지정', '점검마감', '점검시작', '직책해제일 설정', '일괄승인', '승인시작', '점검완료', '조치완료']
  },
  {
    color: '17A2B8',
    icon: 'far fa-plus-square',
    texts: ['펼치기', '활성화']
  },
  {
    color: '17A2B8',
    icon: 'far fa-minus-square',
    texts: ['감추기', '비활성화']
  },
  {
    color: '17A2B8',
    icon: 'fas fa-bookmark',
    texts: ['북마크']
  },
  {
    color: '17A2B8',
    icon: 'fas fa-plus',
    texts: ['+']
  },
  {
    color: '17A2B8',
    icon: 'fas fa-minus',
    texts: ['-']
  },
  {
    color: 'DD5E5E', // red
    icon: 'fas fa-trash',
    texts: ['삭제', '전체삭제', '연결제거', '전표삭제', '문서폐기 신청', '관심종목 제거', '지출결의제거', '소모품 폐기/취소', '제거']
  },
  {
    color: 'DD5E5E',
    icon: 'fas fa-minus',
    texts: ['행 삭제', '전체해제', '차단해제', '알림해제']
  },
  {
    color: 'DD5E5E',
    icon: 'fas fa-ban',
    texts: ['취소', '마감취소', '확정취소', '결산취소', '승인취소', '지급취소', '확인취소', '반려', '평가취소', '전체취소', '제출취소', '차단', '신청취소', '요청취소', '반려취소', '개별로그아웃', '전체로그아웃', '잠금해제', '작성취소', '점검시작취소', '승인시작취소', '일괄승인취소', '완료취소']
  },
  {
    color: 'DD5E5E',
    icon: 'fas fa-exchange-alt',
    texts: ['문서이동(내부통제)']
  },
  {
    color: 'E89646', // orange
    icon: 'fas fa-upload',
    texts: ['파일업로드', '엑셀업로드', '로고등록']
  },
  {
    color: 'E89646',
    icon: 'fas fa-download',
    texts: ['다운로드', '템플릿', '엑셀다운로드', '엑셀다운로드(금감원양식)', '보고주기 변경 및 서약서 서명', 'DOWN', '출력/다운로드', '공모주 달력', '전체출력/다운로드', '개별출력/다운로드', '파일 일괄 다운로드', '츨력/다운로드', '가져오기', '임원 선임/해임 보고']
  },
  {
    color: 'E89646',
    icon: 'fas fa-eye',
    texts: ['오타수정', '기록보기', '계정원장 정리', '보유원장 정리', '은행이체명세서', '급여출금계좌', '임금계산방법', '사용여부설정', '예금잔고정리', '전표확인', '마감검증', '보수입금계좌', '첨부파일관리', '비고작성', '근로시간', '4대보험 연말정산 납부상세', '소득세 재계산', '근로소득공제표', '인적공제금액', '산출세액표', '산출기준', '투자한도/StopLoss 설정', '작성요령', '요청이력', '전체참조등록', '알람설정', '구분추가', '새로작성', '펀드보유종목 확인']
  },
  {
    color: 'E89646',
    icon: 'fas fa-arrow-right',
    texts: ['상대처 관리 바로가기', '거래처 관리 바로가기', 'DART 바로가기', '전산장비관리 바로가기', '증명서 발급 바로가기']
  },
  {
    color: 'E89646',
    icon: 'fas fa-users',
    texts: ['그룹', '그룹설정', '작성자그룹 관리', '담당그룹 관리', '종목유형설정', '운용사코드 등록']
  },
  {
    color: 'E89646',
    icon: 'fas fa-check',
    texts: ['작성자그룹 일괄지정', '담당그룹 일괄지정', '담당그룹 지정', '예상목록', '진행단계 기본설정', '직원 자동등록 설정', '엑셀업로드 설정', '커스텀 설정', '담당자 변경', '업무구분 설정', '기타고객사 추가', '매수제한종목']
  },
  {
    color: 'E89646',
    icon: 'fas fa-ban',
    texts: ['계좌폐쇄', '폐쇄취소', '미체결', '미체결취소']
  },
  {
    color: '646362', // darkGray
    icon: 'fas fa-print',
    texts: ['프린트']
  },
  {
    color: '646362',
    icon: 'fas fa-folder-plus',
    texts: ['첨부파일등록']
  },
  {
    color: '646362',
    icon: 'fas fa-users',
    texts: ['조직도보기', '특정직위 및 알림설정', '담당자 관리', '초기설정 휴가일수']
  },
  {
    color: '6AB6CF', // lightBlue
    icon: 'fas fa-undo-alt',
    texts: ['초기화', '재생성', '새로고침', '복구', '4대보험 정산 재생성', '조건 초기화']
  },
  {
    color: '6AB6CF',
    icon: 'fas fa-exchange-alt',
    texts: ['변경', '상위조직변경', '매뉴권한복사(초기)', '문서개요복사', '문서분류복사', '계정과목복사', '점검내역복사', '매뉴권한복사', '권한그룹복사', '문서분류지정복사', '양식복사', '권한복사', '코드복사', '평가자 변경(선택)', '일괄복사']
  },
  {
    color: '2EAC7E', // green
    icon: 'fas fa-edit',
    texts: ['등록', '등록(복사)', '등록(수요예측)', '항목추가', '현금흐름표', '거래유형추가', '계약서 양식작성', '증명서 양식작성', '게시물 작성', '신청서 양식작성', '불러오기', '잔고입력(대사용)', '거래처추가', '영업거래처추가', '결제등록', '화면별 거래유형 등록', '분류관리', 'ICAM 월말잔액 대사', '잔액대사', '파일일괄등록', '시세입력', '환율입력', '신청구분별 내용관리', '홈페이지 등록', '루트매뉴 등록', '하위매뉴 등록', '휴일관리', '특별휴가 추가', '직전 보고내용 가져오기', '반복등록', '설정', '경조구분별 문구등록', '지출결의등록', '최초원장 등록', '주식등록', '요청하기', '전표생성', '비품등록', '일괄 결제등록', '바로등록', '양식관리', '활동처 추가', '추가', '인사정보 가져오기', '최근잔고 가져오기', '승인선', '조치계획등록', '부서책무담당자 관리', '결재요청', '일괄등록', '정기보고서 작성', '승인신청', '신규등록', '업무등록', '상위등록', '하위등록', '하위조직등록', '신규문서 작성', '전체층등록', '회계발생', '상신', '통합상신', '상위분류 등록', '하위분류 등록', '임원동의서 상신', '대장분류설정', '점검항목생성', 'AI']
  },
  {
    color: '2EAC7E',
    icon: 'fas fa-bullseye',
    texts: ['생성', 'PDF 생성', '일괄생성', '건별생성', '자료일괄생성', '계약사별자료생성']
  },
  {
    color: '2EAC7E',
    icon: 'fas fa-arrow-alt-circle-left',
    texts: ['선택']
  },
  {
    color: '343A40', // dark
    icon: 'fas fa-cog',
    texts: ['기본설정']
  }
]

const PREDEFINED_BUTTONS: Record<string, PredefinedBtn> = {}
buttonGroups.forEach((group) => {
  group.texts.forEach((text) => {
    PREDEFINED_BUTTONS[text] = { color: group.color, icon: group.icon }
  })
})

const darkenColor = (col: string, amt: number): string => {
  if (col.startsWith('#')) {
    const num = parseInt(col.slice(1), 16)
    let r = (num >> 16) - amt
    let g = ((num >> 8) & 0x00ff) - amt
    let b = (num & 0x0000ff) - amt
    r = Math.max(0, r)
    g = Math.max(0, g)
    b = Math.max(0, b)
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
  return col
}

const isLightColor = (color: string): boolean => {
  if (!color.startsWith('#')) return false
  const hex = color.slice(1)
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const brightness = r * 0.299 + g * 0.587 + b * 0.114
    return brightness > 186
  }
  return false
}

interface AssetKbdRendererProps {
  children: React.ReactNode
}

export const AssetKbdRenderer: React.FC<AssetKbdRendererProps> = ({ children }) => {
  const text = String(children).trim()

  const renderButton = (colorVal: string, iconVal: string, btnText: string) => {
    let bg = colorVal
    if (!bg) {
      bg = '4D4D4D' // 기본 회색 (buttonColorDefault)
    }
    const isHex = /^[0-9A-F]{3}$|^[0-9A-F]{6}$/i.test(bg)
    const backgroundColor = isHex ? `#${bg}` : bg
    const borderColor = darkenColor(backgroundColor, 10)
    const textColor = isLightColor(backgroundColor) ? '#000000' : '#ffffff'

    // Icon class auto-completes fas fa- if it is just a simple name
    let iconClass = iconVal
    if (iconClass && !iconClass.includes('fa-') && !iconClass.startsWith('fa ')) {
      iconClass = `fas fa-${iconClass}`
    }

    const paddingStyle = btnText ? undefined : { padding: '3px 5px' }

    return (
      <kbd
        className="asset-kbd-btn select-none"
        style={{
          backgroundColor,
          borderColor,
          color: textColor,
          ...paddingStyle
        }}
      >
        {iconClass && <i className={`${iconClass} kbd-fa-icon`} aria-hidden="true"></i>}
        {btnText && <span className="kbd-text">{btnText}</span>}
      </kbd>
    )
  }

  // 1. 구분자가 없는 일반 단어
  if (!text.includes(':')) {
    const predefined = PREDEFINED_BUTTONS[text]
    if (predefined) {
      return renderButton(predefined.color, predefined.icon, text)
    }
    // 기본 일반 kbd 컴포넌트 반환
    return <kbd className="select-none font-mono text-[11px]">{text}</kbd>
  }

  // 2. 구분자(:)가 포함된 문법 처리
  const parts = text.split(':')
  if (parts.length >= 3) {
    const color = parts[0].trim()
    const icon = parts[1].trim()
    const buttonText = parts.slice(2).join(':').trim()
    return renderButton(color, icon, buttonText)
  }

  // 매칭되지 않는 텍스트는 일반 kbd 폴백
  return <kbd className="select-none font-mono text-[11px]">{text}</kbd>
}

export default AssetKbdRenderer
```

#### [MODIFY] [index.css](file:///home/kdy987/work/aman/frontend/src/index.css)
```css
/* index.css의 끝에 다음 스타일 추가 */

/* AssetERP 스타일의 kbd 버튼 */
kbd.asset-kbd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.2;
  vertical-align: middle;
  cursor: default;
  user-select: none;
}

kbd.asset-kbd-btn .kbd-fa-icon {
  font-size: 10px;
}

kbd.asset-kbd-btn .kbd-text {
  letter-spacing: 0.5px;
}

/* 일반 kbd 다크모드 대응 */
.dark kbd {
  color: #c9d1d9;
  background: #161b22;
  border-color: #30363d;
  box-shadow: inset 0 -2px 0 #30363d;
}
```

#### [MODIFY] [index.html](file:///home/kdy987/work/aman/frontend/index.html)
```html
<!-- <head> 내부에 FontAwesome CDN 연동 추가 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
```

#### [MODIFY] [markdownRenderer.tsx](file:///home/kdy987/work/aman/frontend/src/utils/markdownRenderer.tsx) 및 [MarkdownViewer.tsx](file:///home/kdy987/work/aman/frontend/src/domains/content/MarkdownViewer.tsx)
```tsx
// code 렌더러 부분을 아래와 같이 수정하여 AssetKbdRenderer 위임
import AssetKbdRenderer from '@/components/shared/AssetKbdRenderer'

// components 정의 내:
code: ({ className, children, ...props }) => {
  const isInline = !className
  if (isInline) {
    return <AssetKbdRenderer>{children}</AssetKbdRenderer>
  }
  return (
    <code className={`${className} select-none`} {...props}>
      {children}
    </code>
  )
}
```

---

### 2. Backend (Java 8 + Spring Boot)

#### [MODIFY] [ManualController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/ManualController.java)

##### 2.1 Predefined 버튼 상수 및 헬퍼 메소드 추가
`ManualController` 클래스 내에 아래 코드 블록을 삽입합니다:
```java
    // --- 백틱 파싱 확장 관련 자바 구현 ---
    private static class ButtonDef {
        String color;
        String icon;
        ButtonDef(String color, String icon) {
            this.color = color;
            this.icon = icon;
        }
    }

    private static final java.util.Map<String, ButtonDef> PREDEFINED_BUTTONS = new java.util.HashMap<>();
    static {
        addButtonGroup("456EA6", "fas fa-search", "조회", "검색", "찾기", "변경 및 상세보기", "기간조회", "내역상세", "지출결의서 선택", "미흡/개선 조치계획", "발생 점검항목 보기", "문서보기");
        addButtonGroup("456EA6", "fas fa-plus", "일회성조건", "반복주기조건", "행 추가", "전체선택", "분류추가", "C/F가져오기", "차변 행추가", "대변 행추가", "직원추가", "부서추가", "계좌추가", "연관법규 추가", "연관내규 추가");
        addButtonGroup("456EA6", "fas fa-user-times", "없음");
        addButtonGroup("456EA6", "fas fa-envelope", "개별전송", "전체전송", "메일발송", "발송", "일괄 알림발송", "반려건 일괄 알림발송", "마감문자발송", "알림발송");
        addButtonGroup("456EA6", "fas fa-calculator", "계산하기");
        
        addButtonGroup("17A2B8", "fas fa-check", "저장", "반영", "전체적용", "내역확정", "선택내역확정", "전체내역확정", "마감", "전표발생", "회계마감", "승인", "일괄저장", "처리", "확정", "사용여부 일괄설정", "문서분류지정", "통제그룹담당자 지정", "일괄 권한설정", "결산처리", "자동연장", "지급확인", "확인", "ICAM발생내역 가져오기", "환율적용", "평가처리", "배포처리", "관심종목 등록", "항목별 계정연결", "출력정보 및 사용여부 설정", "고객사반영", "Admin(관리자)정보로 고객사 변경", "상장주식 평가처리", "제출", "관리그룹 일괄지정", "주계좌 설정", "복리후생비 설정", "게시물 항목 설정", "계정과목연결", "알림설정", "책무유형 관리", "잠금", "담당자 일괄변경", "부서일괄지정", "관리의무생성", "작성완료", "점검자일괄지정", "점검마감", "점검시작", "직책해제일 설정", "일괄승인", "승인시작", "점검완료", "조치완료");
        addButtonGroup("17A2B8", "far fa-plus-square", "펼치기", "활성화");
        addButtonGroup("17A2B8", "far fa-minus-square", "감추기", "비활성화");
        addButtonGroup("17A2B8", "fas fa-bookmark", "북마크");
        addButtonGroup("17A2B8", "fas fa-plus", "+");
        addButtonGroup("17A2B8", "fas fa-minus", "-");
        
        addButtonGroup("DD5E5E", "fas fa-trash", "삭제", "전체삭제", "연결제거", "전표삭제", "문서폐기 신청", "관심종목 제거", "지출결의제거", "소모품 폐기/취소", "제거");
        addButtonGroup("DD5E5E", "fas fa-minus", "행 삭제", "전체해제", "차단해제", "알림해제");
        addButtonGroup("DD5E5E", "fas fa-ban", "취소", "마감취소", "확정취소", "결산취소", "승인취소", "지급취소", "확인취소", "반려", "평가취소", "전체취소", "제출취소", "차단", "신청취소", "요청취소", "반려취소", "개별로그아웃", "전체로그아웃", "잠금해제", "작성취소", "점검시작취소", "승인시작취소", "일괄승인취소", "완료취소");
        addButtonGroup("DD5E5E", "fas fa-exchange-alt", "문서이동(내부통제)");
        
        addButtonGroup("E89646", "fas fa-upload", "파일업로드", "엑셀업로드", "로고등록");
        addButtonGroup("E89646", "fas fa-download", "다운로드", "템플릿", "엑셀다운로드", "엑셀다운로드(금감원양식)", "보고주기 변경 및 서약서 서명", "DOWN", "출력/다운로드", "공모주 달력", "전체출력/다운로드", "개별출력/다운로드", "파일 일괄 다운로드", "츨력/다운로드", "가져오기", "임원 선임/해임 보고");
        addButtonGroup("E89646", "fas fa-eye", "오타수정", "기록보기", "계정원장 정리", "보유원장 정리", "은행이체명세서", "급여출금계좌", "임금계산방법", "사용여부설정", "예금잔고정리", "전표확인", "마감검증", "보수입금계좌", "첨부파일관리", "비고작성", "근로시간", "4대보험 연말정산 납부상세", "소득세 재계산", "근로소득공제표", "인적공제금액", "산출세액표", "산출기준", "투자한도/StopLoss 설정", "작성요령", "요청이력", "전체참조등록", "알람설정", "구분추가", "새로작성", "펀드보유종목 확인");
        addButtonGroup("E89646", "fas fa-arrow-right", "상대처 관리 바로가기", "거래처 관리 바로가기", "DART 바로가기", "전산장비관리 바로가기", "증명서 발급 바로가기");
        addButtonGroup("E89646", "fas fa-users", "그룹", "그룹설정", "작성자그룹 관리", "담당그룹 관리", "종목유형설정", "운용사코드 등록");
        addButtonGroup("E89646", "fas fa-check", "작성자그룹 일괄지정", "담당그룹 일괄지정", "담당그룹 지정", "예상목록", "진행단계 기본설정", "직원 자동등록 설정", "엑셀업로드 설정", "커스텀 설정", "담당자 변경", "업무구분 설정", "기타고객사 추가", "매수제한종목");
        addButtonGroup("E89646", "fas fa-ban", "계좌폐쇄", "폐쇄취소", "미체결", "미체결취소");
        
        addButtonGroup("646362", "fas fa-print", "프린트");
        addButtonGroup("646362", "fas fa-folder-plus", "첨부파일등록");
        addButtonGroup("646362", "fas fa-users", "조직도보기", "특정직위 및 알림설정", "담당자 관리", "초기설정 휴가일수");
        
        addButtonGroup("6AB6CF", "fas fa-undo-alt", "초기화", "재생성", "새로고침", "복구", "4대보험 정산 재생성", "조건 초기화");
        addButtonGroup("6AB6CF", "fas fa-exchange-alt", "변경", "상위조직변경", "매뉴권한복사(초기)", "문서개요복사", "문서분류복사", "계정과목복사", "점검내역복사", "매뉴권한복사", "권한그룹복사", "문서분류지정복사", "양식복사", "권한복사", "코드복사", "평가자 변경(선택)", "일괄복사");
        
        addButtonGroup("2EAC7E", "fas fa-edit", "등록", "등록(복사)", "등록(수요예측)", "항목추가", "현금흐름표", "거래유형추가", "계약서 양식작성", "증명서 양식작성", "게시물 작성", "신청서 양식작성", "불러오기", "잔고입력(대사용)", "거래처추가", "영업거래처추가", "결제등록", "화면별 거래유형 등록", "분류관리", "ICAM 월말잔액 대사", "잔액대사", "파일일괄등록", "시세입력", "환율입력", "신청구분별 내용관리", "홈페이지 등록", "루트매뉴 등록", "하위매뉴 등록", "휴일관리", "특별휴가 추가", "직전 보고내용 가져오기", "반복등록", "설정", "경조구분별 문구등록", "지출결의등록", "최초원장 등록", "주식등록", "요청하기", "전표생성", "비품등록", "일괄 결제등록", "바로등록", "양식관리", "활동처 추가", "추가", "인사정보 가져오기", "최근잔고 가져오기", "승인선", "조치계획등록", "부서책무담당자 관리", "결재요청", "일괄등록", "정기보고서 작성", "승인신청", "신규등록", "업무등록", "상위등록", "하위등록", "하위조직등록", "신규문서 작성", "전체층등록", "회계발생", "상신", "통합상신", "상위분류 등록", "하위분류 등록", "임원동의서 상신", "대장분류설정", "점검항목생성", "AI");
        addButtonGroup("2EAC7E", "fas fa-bullseye", "생성", "PDF 생성", "일괄생성", "건별생성", "자료일괄생성", "계약사별자료생성");
        addButtonGroup("2EAC7E", "fas fa-arrow-alt-circle-left", "선택");
        
        addButtonGroup("343A40", "fas fa-cog", "기본설정");
    }

    private static void addButtonGroup(String color, String icon, String... texts) {
        for (String text : texts) {
            PREDEFINED_BUTTONS.put(text, new ButtonDef(color, icon));
        }
    }

    private static final java.util.regex.Pattern BACKTICK_PATTERN = java.util.regex.Pattern.compile("`([^`]+)`");

    private String preprocessBackticks(String markdown) {
        if (markdown == null) return null;
        String[] parts = markdown.split("```", -1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                sb.append("```");
            }
            if (i % 2 == 0) {
                sb.append(replaceBacktickTokens(parts[i]));
            } else {
                sb.append(parts[i]);
            }
        }
        return sb.toString();
    }

    private String replaceBacktickTokens(String text) {
        java.util.regex.Matcher matcher = BACKTICK_PATTERN.matcher(text);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String content = matcher.group(1).trim();
            String replacement = renderButtonHtml(content);
            matcher.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String renderButtonHtml(String content) {
        if (content == null) return "";
        if (!content.contains(":")) {
            ButtonDef def = PREDEFINED_BUTTONS.get(content);
            if (def != null) {
                return buildButtonElement(def.color, def.icon, content);
            } else {
                return buildDefaultKbdElement(content);
            }
        }
        String[] parts = content.split(":", -1);
        if (parts.length >= 3) {
            String color = parts[0].trim();
            String icon = parts[1].trim();
            StringBuilder textBuilder = new StringBuilder();
            for (int i = 2; i < parts.length; i++) {
                if (i > 2) textBuilder.append(":");
                textBuilder.append(parts[i]);
            }
            String buttonText = textBuilder.toString().trim();
            return buildButtonElement(color, icon, buttonText);
        } else {
            return buildDefaultKbdElement(content);
        }
    }

    private String buildDefaultKbdElement(String text) {
        return "<kbd>" + escapeHtml(text) + "</kbd>";
    }

    private String buildButtonElement(String color, String icon, String text) {
        String bg = color;
        if (bg.isEmpty()) {
            bg = "4D4D4D";
        } else if (bg.matches("^[0-9A-Fa-f]{3}$") || bg.matches("^[0-9A-Fa-f]{6}$")) {
            bg = "#" + bg;
        }
        String border = darkenColorJava(bg, 10);
        String textColor = "#ffffff";
        if (isLightColorJava(bg)) {
            textColor = "#000000";
        }
        String style = "background-color: " + bg + "; border-color: " + border + "; color: " + textColor + ";";
        if (text.isEmpty()) {
            style += " padding: 3px 5px;";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("<kbd class=\"asset-kbd-btn\" style=\"").append(style).append("\">");
        if (!icon.isEmpty()) {
            String iconClass = icon;
            if (!iconClass.contains("fa-") && !iconClass.startsWith("fa ")) {
                iconClass = "fas fa-" + iconClass;
            }
            sb.append("<i class=\"").append(iconClass).append(" kbd-fa-icon\" aria-hidden=\"true\"></i>");
            if (!text.isEmpty()) {
                sb.append("&nbsp;");
            }
        }
        if (!text.isEmpty()) {
            sb.append("<span class=\"kbd-text\">").append(escapeHtml(text)).append("</span>");
        }
        sb.append("</kbd>");
        return sb.toString();
    }

    private boolean isLightColorJava(String color) {
        if (color == null || !color.startsWith("#")) return false;
        try {
            String hex = color.substring(1);
            if (hex.length() == 3) {
                hex = "" + hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
            }
            if (hex.length() == 6) {
                int r = Integer.parseInt(hex.substring(0, 2), 16);
                int g = Integer.parseInt(hex.substring(2, 4), 16);
                int b = Integer.parseInt(hex.substring(4, 6), 16);
                double brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                return brightness > 186;
            }
        } catch (Exception e) { }
        return false;
    }

    private String darkenColorJava(String color, int amt) {
        if (color == null || !color.startsWith("#")) return color;
        try {
            String hex = color.substring(1);
            if (hex.length() == 3) {
                hex = "" + hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
            }
            if (hex.length() == 6) {
                int r = Integer.parseInt(hex.substring(0, 2), 16);
                int g = Integer.parseInt(hex.substring(2, 4), 16);
                int b = Integer.parseInt(hex.substring(4, 6), 16);
                r = Math.max(0, r - amt);
                g = Math.max(0, g - amt);
                b = Math.max(0, b - amt);
                return String.format("#%02x%02x%02x", r, g, b);
            }
        } catch (Exception e) { }
        return color;
    }
```

##### 2.2 마크다운 파싱 메소드 내 전처리 주입
```java
    private String parseMarkdownToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "<p style='color:#888; font-style:italic;'>내용이 비어있습니다.</p>";
        }

        // **텍스트(괄호)** 등 볼드 한글 파싱 에러 방지용 전처리
        markdown = markdown.replaceAll("\\*\\*(.*?)\\*\\*", "<strong>$1</strong>");

        // 백틱 확장 정규식 전처리 주입
        markdown = preprocessBackticks(markdown);

        MutableDataSet options = new MutableDataSet();
        // ... (생략) ...
```

##### 2.3 HTML 템플릿 내 CSS 및 CDN 추가
- **FontAwesome CDN 추가** (약 672라인):
```html
            "<head>\n" +
            "    <meta charset=\"UTF-8\">\n" +
            "    <link rel=\"icon\" type=\"image/png\" href=\"/aman/favicon.png\">\n" +
            "    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css\" />\n" +
            "    <title>" + escapeHtml(title) + "</title>\n" +
```

- **style 태그 내 스타일 추가** (약 724라인):
```css
            "        kbd {\n" +
            "            display: inline-block;\n" +
            "            padding: 2px 6px;\n" +
            "            font-size: 0.8em;\n" +
            "            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n" +
            "            color: #24292e;\n" +
            "            background: #f6f8fa;\n" +
            "            border: 1px solid #d1d5da;\n" +
            "            border-radius: 4px;\n" +
            "            box-shadow: inset 0 -2px 0 #d1d5da;\n" +
            "            line-height: 1.4;\n" +
            "            white-space: nowrap;\n" +
            "            margin: 0 1px;\n" +
            "            transition: background-color 0.2s, border-color 0.2s, color 0.2s;\n" +
            "        }\n" +
            "        kbd.asset-kbd-btn {\n" +
            "            display: inline-flex;\n" +
            "            align-items: center;\n" +
            "            justify-content: center;\n" +
            "            gap: 6px;\n" +
            "            padding: 3px 8px;\n" +
            "            font-size: 11px;\n" +
            "            font-weight: 600;\n" +
            "            border-radius: 4px;\n" +
            "            border: 1px solid rgba(0, 0, 0, 0.15);\n" +
            "            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);\n" +
            "            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n" +
            "            line-height: 1.2;\n" +
            "            vertical-align: middle;\n" +
            "            cursor: default;\n" +
            "            user-select: none;\n" +
            "            transition: background-color 0.2s, border-color 0.2s, color 0.2s;\n" +
            "        }\n" +
            "        kbd.asset-kbd-btn .kbd-fa-icon {\n" +
            "            font-size: 10px;\n" +
            "            margin-bottom: 0;\n" +
            "        }\n" +
            "        kbd.asset-kbd-btn .kbd-text {\n" +
            "            letter-spacing: 0.5px;\n" +
            "        }\n" +
            "        .dark-mode kbd {\n" +
            "            color: #c9d1d9;\n" +
            "            background: #161b22;\n" +
            "            border-color: #30363d;\n" +
            "            box-shadow: inset 0 -2px 0 #30363d;\n" +
            "        }\n"
```

---

## 🧪 검증 계획

### 1. 자동화 테스트 (컴파일/린트/빌드 검사)
프론트엔드 및 백엔드에 각각 오류가 없는지 린트 및 빌드 명령어를 실행합니다.
- **프론트엔드**:
  ```bash
  ./fm.sh lint
  ./fm.sh build
  ```
- **백엔드**:
  ```bash
  ./bm.sh build
  ```

### 2. 테스트 케이스 정의 (Examples)
구현 목표와 입력을 정의하기 위해 `examples/` 폴더 내에 다음 파일들을 미리 생성해 두었습니다:
1. [examples/bt_examples.md](file:///home/kdy987/work/aman/examples/bt_examples.md): 개발 사양서에 명시된 모든 백틱 신택스(HEX 색상, 아이콘, 텍스트의 다양한 생략 조합 및 예외 사항)가 포함된 마크다운 테스트 세트입니다.
2. [examples/bt_examples.html](file:///home/kdy987/work/aman/examples/bt_examples.html): `bt_examples.md`를 렌더링했을 때 출력되어야 하는 최종 DOM 구조 및 스타일이 정의된 HTML 골든 파일(Golden File)입니다.

### 3. 수동 검증 단계
마크다운 에디터나 뷰어 본문에 아래의 테스트용 백틱을 삽입하고 가독성 높게 렌더링되는지 확인합니다:
- `` `ffff00:fa fa-edit:등록` `` (노란색 배경 + 에디터 아이콘 + 등록)
- `` `ffff00::인사정보 가져오기` `` (노란색 배경 + 인사정보 가져오기)
- `` `삭제` `` (기본 등록된 삭제 테마 적용: 붉은 배경 + 휴지통 아이콘 + 삭제)
- `` `ff0000::저장` `` (붉은 배경 + 저장)
- `` `:fas fa-plus:추가` `` (기본 배경 + 플러스 아이콘 + 추가)
- `` `:fa fa-plus:` `` (기본 배경 + 플러스 아이콘 단독)
- `` `:abc` `` (일반 회색 kbd 스타일에 `:abc` 텍스트 그대로 노출)
- 일반 코드 블록 (`` ```javascript ... ``` ``) 내의 백틱이나 소스코드가 깨지거나 오작동하지 않는지 함께 검증합니다.

---

## 💡 개발자 의견 및 설계 고려 사항

### 1. 동일 아이콘 / 다른 색상 충돌 해결 규칙
- 소스 코드 분석 결과, `+`와 `-` 기호는 `mint` 테마(`17A2B8`)인 반면 `행 추가`나 `직원추가` 등은 `blue` 테마(`456EA6`)를 사용하고 있습니다. 
- 단어 검색 시 완전 일치(Exact Match) 방식으로 `PREDEFINED_BUTTONS` 맵을 룩업하여, 단어별 고유의 아이콘과 색상이 정확히 일치하도록 처리합니다.

### 2. 다크 모드(Dark Mode) 시인성 확보
- ERP의 고정 HEX 색상들(예: `#456EA6` 파란색, `#DD5E5E` 빨간색 등)은 다크 모드 테마 하에서도 텍스트가 잘 보여야 합니다.
- 버튼 내부의 텍스트 색상은 기본적으로 흰색(`#ffffff`)을 적용하고, 그림자와 얇은 테두리(border)를 투명도(`rgba(0,0,0,0.15)`)를 주어 어두운 배경에서도 버튼이 입체적이고 고급스럽게 분리되어 보이도록 디자인 시스템을 최적화합니다.

### 3. 마크다운 편집기(Milkdown Crepe) 편의성 제안
- 문서 작성자가 이 복잡한 문법(예: `` `456EA6:fa-plus:행 추가` ``)을 외워서 쓰는 것은 작성 생산성을 떨어뜨립니다.
- 본 백틱 파싱 기능이 정상 작동한 뒤, 향후 고도화 단계에서 에디터 툴바에 **"ERP 버튼 삽입"** 퀵 메뉴를 추가하여 단어 선택 시 자동으로 해당 백틱 코드가 본문에 삽입되도록 설계하는 것을 강력히 추천합니다.
