import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';

// Helper for darkening hex color (similar to darkenColor in AssetKbdRenderer)
function darkenColor(hex, percent) {
  let num = parseInt(hex.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}

function isLightColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 186;
}

const PREDEFINED_BUTTONS = {};
const buttonGroups = [
  {
    color: '456EA6',
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
    color: '17A2B8',
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
    color: 'DD5E5E',
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
    color: 'E89646',
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
    color: '646362',
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
    color: '6AB6CF',
    icon: 'fas fa-undo-alt',
    texts: ['초기화', '재생성', '새로고침', '복구', '4대보험 정산 재생성', '조건 초기화']
  },
  {
    color: '6AB6CF',
    icon: 'fas fa-exchange-alt',
    texts: ['변경', '상위조직변경', '매뉴권한복사(초기)', '문서개요복사', '문서분류복사', '계정과목복사', '점검내역복사', '매뉴권한복사', '권한그룹복사', '문서분류지정복사', '양식복사', '권한복사', '코드복사', '평가자 변경(선택)', '일괄복사']
  },
  {
    color: '2EAC7E',
    icon: 'fas fa-edit',
    texts: ['등록', '등록(복사)', '등록(수요예측)', '항목추가', '현금흐름표', '거래유형추가', '계약서 양식작성', '증명서 양식작성', '게시물 작성', '신청서 양식작성', '불러오기', '잔고입력(대사용)', '거래처추가', '영업거래처추가', '결제등록', '화면별 거래유형 등록', '분류관리', 'ICAM 월말잔액 대사', '잔액대사', '파일일괄등록', '시세입력', '환율입력', '신청구분별 내용관리', '홈페이지 등록', '루트매뉴 등록', '하위매뉴 등록', '휴일관리', '특별휴가 추가', '직전 보고내용 가져오기', '반복등록', '설정', '경조구분별 문구등록', '지출결의등록', "최초원장 등록", "주식등록", "요청하기", "전표생성", "비품등록", "일괄 결제등록", "바로등록", "양식관리", "활동처 추가", "추가", "인사정보 가져오기", "최근잔고 가져오기", "승인선", "조치계획등록", "부서책무담당자 관리", "결재요청", "일괄등록", "정기보고서 작성", "승인신청", "신규등록", "업무등록", "상위등록", "하위등록", "하위조직등록", "신규문서 작성", "전체층등록", "회계발생", "상신", "통합상신", "상위분류 등록", "하위분류 등록", "임원동의서 상신", "대장분류설정", "점검항목생성", "AI"]
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
    color: '343A40',
    icon: 'fas fa-cog',
    texts: ['기본설정']
  }
];

buttonGroups.forEach((g) => {
  g.texts.forEach((txt) => {
    PREDEFINED_BUTTONS[txt] = { color: g.color, icon: g.icon };
  });
});

const AssetKbdRendererMock = ({ children }) => {
  const text = String(children).trim();
  
  const renderButton = (colorVal, iconVal, btnText) => {
    let bg = colorVal || '4D4D4D';
    const isHex = /^[0-9A-F]{3}$|^[0-9A-F]{6}$/i.test(bg);
    const backgroundColor = isHex ? `#${bg}` : bg;
    const borderColor = darkenColor(backgroundColor, 10);
    const textColor = isLightColor(backgroundColor) ? '#000000' : '#ffffff';
    
    let iconClass = iconVal;
    if (iconClass && !iconClass.includes('fa-') && !iconClass.startsWith('fa ')) {
      iconClass = `fas fa-${iconClass}`;
    }
    
    const paddingStyle = btnText ? {} : { padding: '3px 5px' };
    
    return React.createElement('kbd', {
      className: 'asset-kbd-btn select-none',
      style: {
        backgroundColor,
        borderColor,
        color: textColor,
        ...paddingStyle
      }
    }, 
      iconClass ? React.createElement('i', { className: `${iconClass} kbd-fa-icon`, 'aria-hidden': 'true' }) : null,
      btnText ? React.createElement('span', { className: 'kbd-text' }, btnText) : null
    );
  };
  
  if (!text.includes(':')) {
    const predefined = PREDEFINED_BUTTONS[text];
    if (predefined) {
      return renderButton(predefined.color, predefined.icon, text);
    }
    return React.createElement('code', { className: 'select-none font-mono text-[11px]' }, text);
  }
  
  const parts = text.split(':');
  if (parts.length >= 3) {
    const color = parts[0].trim();
    const icon = parts[1].trim();
    const buttonText = parts.slice(2).join(':').trim();
    return renderButton(color, icon, buttonText);
  }
  
  return React.createElement('code', { className: 'select-none font-mono text-[11px]' }, text);
};


// Main processing
async function readStdin() {
  return new Promise((resolve) => {
    let content = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { content += chunk; });
    process.stdin.on('end', () => resolve(content));
  });
}

async function main() {
  const markdown = await readStdin();
  
  const element = React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm, remarkBreaks],
    rehypePlugins: [rehypeRaw],
    components: {
      code: ({ className, children, node, ...props }) => {
        const isInline = !className;
        if (isInline) {
          return React.createElement(AssetKbdRendererMock, { children });
        }
        return React.createElement('code', { className: `${className || ''} select-none`, ...props }, children);
      }

    }
  }, markdown);

  const html = renderToStaticMarkup(element);
  process.stdout.write(html);
}

main().catch(err => {
  console.error("Error rendering markdown:", err);
  process.exit(1);
});
