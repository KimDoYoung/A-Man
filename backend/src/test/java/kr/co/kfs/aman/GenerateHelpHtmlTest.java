package kr.co.kfs.aman;

import org.junit.jupiter.api.Test;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.*;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.gfm.tasklist.TaskListExtension;
import static org.junit.jupiter.api.Assertions.*;

public class GenerateHelpHtmlTest {

    private static final String TOC_CSS = 
        "        /* --- Floating TOC & ScrollToTop outside Container Bounds --- */\n" +
        "        .floating-toc-trigger {\n" +
        "            position: fixed;\n" +
        "            bottom: 30px;\n" +
        "            left: calc(50% + 450px + 50px);\n" +
        "            width: 44px;\n" +
        "            height: 44px;\n" +
        "            border-radius: 50%;\n" +
        "            background-color: rgba(99, 102, 241, 0.35);\n" +
        "            color: rgba(99, 102, 241, 0.75);\n" +
        "            border: 1px solid rgba(99, 102, 241, 0.35);\n" +
        "            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);\n" +
        "            cursor: pointer;\n" +
        "            display: flex;\n" +
        "            align-items: center;\n" +
        "            justify-content: center;\n" +
        "            transition: all 0.2s ease;\n" +
        "            z-index: 999;\n" +
        "        }\n" +
        "        .floating-toc-trigger:hover {\n" +
        "            transform: scale(1.05);\n" +
        "            background-color: rgba(99, 102, 241, 0.95);\n" +
        "            color: #ffffff;\n" +
        "            border-color: #6366f1;\n" +
        "            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);\n" +
        "        }\n" +
        "        .dark-mode .floating-toc-trigger {\n" +
        "            background-color: rgba(99, 102, 241, 0.25);\n" +
        "            color: rgba(129, 140, 248, 0.65);\n" +
        "            border-color: rgba(99, 102, 241, 0.35);\n" +
        "        }\n" +
        "        .floating-scroll-top {\n" +
        "            position: fixed;\n" +
        "            bottom: 85px;\n" +
        "            left: calc(50% + 450px + 50px);\n" +
        "            width: 44px;\n" +
        "            height: 44px;\n" +
        "            border-radius: 50%;\n" +
        "            background-color: rgba(100, 116, 139, 0.35);\n" +
        "            color: rgba(100, 116, 139, 0.75);\n" +
        "            border: 1px solid rgba(100, 116, 139, 0.35);\n" +
        "            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);\n" +
        "            cursor: pointer;\n" +
        "            display: flex;\n" +
        "            align-items: center;\n" +
        "            justify-content: center;\n" +
        "            transition: all 0.2s ease;\n" +
        "            z-index: 999;\n" +
        "            opacity: 0;\n" +
        "            visibility: hidden;\n" +
        "        }\n" +
        "        .floating-scroll-top.visible {\n" +
        "            opacity: 1;\n" +
        "            visibility: visible;\n" +
        "        }\n" +
        "        .floating-scroll-top:hover {\n" +
        "            transform: scale(1.05);\n" +
        "            background-color: rgba(100, 116, 139, 0.95);\n" +
        "            color: #ffffff;\n" +
        "            border-color: #64748b;\n" +
        "            box-shadow: 0 4px 10px rgba(100, 116, 139, 0.3);\n" +
        "        }\n" +
        "        .dark-mode .floating-scroll-top {\n" +
        "            background-color: rgba(148, 163, 184, 0.25);\n" +
        "            color: rgba(148, 163, 184, 0.65);\n" +
        "            border-color: rgba(148, 163, 184, 0.35);\n" +
        "        }\n" +
        "        .toc-drawer-overlay {\n" +
        "            position: fixed;\n" +
        "            top: 0;\n" +
        "            left: 0;\n" +
        "            width: 100vw;\n" +
        "            height: 100vh;\n" +
        "            background-color: rgba(15, 23, 42, 0.3);\n" +
        "            backdrop-filter: blur(2px);\n" +
        "            z-index: 1000;\n" +
        "            opacity: 0;\n" +
        "            visibility: hidden;\n" +
        "            transition: all 0.25s ease;\n" +
        "        }\n" +
        "        .toc-drawer-overlay.open {\n" +
        "            opacity: 1;\n" +
        "            visibility: visible;\n" +
        "        }\n" +
        "        .toc-drawer {\n" +
        "            position: fixed;\n" +
        "            top: 0;\n" +
        "            right: -320px;\n" +
        "            width: 320px;\n" +
        "            height: 100vh;\n" +
        "            background-color: #ffffff;\n" +
        "            box-shadow: -4px 0 20px rgba(15, 23, 42, 0.15);\n" +
        "            z-index: 1001;\n" +
        "            transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1);\n" +
        "            display: flex;\n" +
        "            flex-direction: column;\n" +
        "            padding: 0;\n" +
        "        }\n" +
        "        .toc-drawer.open {\n" +
        "            right: 0;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer {\n" +
        "            background-color: #1e293b;\n" +
        "            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);\n" +
        "            border-left: 1px solid #334155;\n" +
        "        }\n" +
        "        .toc-drawer-header {\n" +
        "            padding: 16px 20px;\n" +
        "            border-bottom: 1px solid #e2e8f0;\n" +
        "            display: flex;\n" +
        "            align-items: center;\n" +
        "            justify-content: space-between;\n" +
        "            background-color: #f8fafc;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-header {\n" +
        "            border-bottom: 1px solid #334155;\n" +
        "            background-color: #0f172a;\n" +
        "        }\n" +
        "        .toc-drawer-title {\n" +
        "            font-size: 15px;\n" +
        "            font-weight: 700;\n" +
        "            color: #1e293b;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-title {\n" +
        "            color: #f8fafc;\n" +
        "        }\n" +
        "        .toc-drawer-close {\n" +
        "            background: none;\n" +
        "            border: none;\n" +
        "            font-size: 18px;\n" +
        "            color: #64748b;\n" +
        "            cursor: pointer;\n" +
        "            transition: color 0.15s;\n" +
        "        }\n" +
        "        .toc-drawer-close:hover {\n" +
        "            color: #0f172a;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-close:hover {\n" +
        "            color: #f8fafc;\n" +
        "        }\n" +
        "        .toc-drawer-list {\n" +
        "            flex: 1;\n" +
        "            overflow-y: auto;\n" +
        "            padding: 15px 20px;\n" +
        "            margin: 0;\n" +
        "            list-style: none;\n" +
        "        }\n" +
        "        .toc-drawer-item {\n" +
        "            margin-bottom: 10px;\n" +
        "            line-height: 1.4;\n" +
        "        }\n" +
        "        .toc-drawer-link {\n" +
        "            color: #475569;\n" +
        "            text-decoration: none;\n" +
        "            font-size: 13.5px;\n" +
        "            font-weight: 500;\n" +
        "            transition: color 0.15s;\n" +
        "            display: block;\n" +
        "            padding: 4px 0;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-link {\n" +
        "            color: #cbd5e1;\n" +
        "        }\n" +
        "        .toc-drawer-link:hover {\n" +
        "            color: #4f46e5;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-link:hover {\n" +
        "            color: #818cf8;\n" +
        "        }\n";

    private static final String TOC_SCRIPT =
        "    <script>\n" +
        "        document.addEventListener('DOMContentLoaded', function() {\n" +
        "            const contentContainer = document.querySelector('.container');\n" +
        "            if (!contentContainer) return;\n" +
        "            \n" +
        "            const headings = Array.from(contentContainer.querySelectorAll('h2')).filter(h => !h.textContent.includes('목차'));\n" +
        "            if (headings.length === 0) return;\n" +
        "            \n" +
        "            const overlay = document.createElement('div');\n" +
        "            overlay.className = 'toc-drawer-overlay';\n" +
        "            document.body.appendChild(overlay);\n" +
        "            \n" +
        "            const drawer = document.createElement('div');\n" +
        "            drawer.className = 'toc-drawer';\n" +
        "            \n" +
        "            const header = document.createElement('div');\n" +
        "            header.className = 'toc-drawer-header';\n" +
        "            \n" +
        "            const title = document.createElement('span');\n" +
        "            title.className = 'toc-drawer-title';\n" +
        "            title.textContent = '📌 본문 목차';\n" +
        "            header.appendChild(title);\n" +
        "            \n" +
        "            const closeBtn = document.createElement('button');\n" +
        "            closeBtn.className = 'toc-drawer-close';\n" +
        "            closeBtn.innerHTML = '✕';\n" +
        "            header.appendChild(closeBtn);\n" +
        "            drawer.appendChild(header);\n" +
        "            \n" +
        "            const ol = document.createElement('ol');\n" +
        "            ol.className = 'toc-drawer-list';\n" +
        "            \n" +
        "            headings.forEach((heading, idx) => {\n" +
        "                let id = heading.textContent.trim()\n" +
        "                    .toLowerCase()\n" +
        "                    .replace(/\\s+/g, '-')\n" +
        "                    .replace(/[^\\w\\s가-힣.-]/g, '');\n" +
        "                if (!id) id = 'heading-' + idx;\n" +
        "                heading.id = id;\n" +
        "                heading.style.scrollMarginTop = '30px';\n" +
        "                \n" +
        "                const li = document.createElement('li');\n" +
        "                li.className = 'toc-drawer-item';\n" +
        "                \n" +
        "                const a = document.createElement('a');\n" +
        "                a.className = 'toc-drawer-link';\n" +
        "                a.href = '#' + id;\n" +
        "                a.textContent = heading.textContent;\n" +
        "                \n" +
        "                a.addEventListener('click', function(e) {\n" +
        "                    e.preventDefault();\n" +
        "                    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });\n" +
        "                    history.pushState(null, '', '#' + id);\n" +
        "                    closeDrawer();\n" +
        "                });\n" +
        "                \n" +
        "                li.appendChild(a);\n" +
        "                ol.appendChild(li);\n" +
        "            });\n" +
        "            drawer.appendChild(ol);\n" +
        "            document.body.appendChild(drawer);\n" +
        "            \n" +
        "            const trigger = document.createElement('button');\n" +
        "            trigger.className = 'floating-toc-trigger';\n" +
        "            trigger.setAttribute('title', '목차 보기(ESC)');\n" +
        "            trigger.innerHTML = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"4\" y1=\"6\" x2=\"20\" y2=\"6\"/><line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"/><line x1=\"4\" y1=\"18\" x2=\"20\" y2=\"18\"/></svg>';\n" +
        "            contentContainer.appendChild(trigger);\n" +
        "            \n" +
        "            const scrollTopBtn = document.createElement('button');\n" +
        "            scrollTopBtn.className = 'floating-scroll-top';\n" +
        "            scrollTopBtn.setAttribute('title', '맨 위로 스크롤');\n" +
        "            scrollTopBtn.innerHTML = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"18 15 12 9 6 15\"></polyline></svg>';\n" +
        "            contentContainer.appendChild(scrollTopBtn);\n" +
        "            \n" +
        "            function openDrawer() {\n" +
        "                drawer.classList.add('open');\n" +
        "                overlay.classList.add('open');\n" +
        "            }\n" +
        "            \n" +
        "            function closeDrawer() {\n" +
        "                drawer.classList.remove('open');\n" +
        "                overlay.classList.remove('open');\n" +
        "            }\n" +
        "            \n" +
        "            trigger.addEventListener('click', openDrawer);\n" +
        "            closeBtn.addEventListener('click', closeDrawer);\n" +
        "            overlay.addEventListener('click', closeDrawer);\n" +
        "            \n" +
        "            window.addEventListener('scroll', function() {\n" +
        "                if (window.scrollY > 300) {\n" +
        "                    scrollTopBtn.classList.add('visible');\n" +
        "                } else {\n" +
        "                    scrollTopBtn.classList.remove('visible');\n" +
        "                }\n" +
        "            });\n" +
        "            \n" +
        "            scrollTopBtn.addEventListener('click', function() {\n" +
        "                window.scrollTo({ top: 0, behavior: 'smooth' });\n" +
        "            });\n" +
        "            \n" +
        "            document.addEventListener('keydown', function(e) {\n" +
        "                if (e.key === 'Escape') {\n" +
        "                    closeDrawer();\n" +
        "                }\n" +
        "            });\n" +
        "        });\n" +
        "    </script>\n";

    private static class ButtonDef {
        String color;
        String icon;
        ButtonDef(String color, String icon) {
            this.color = color;
            this.icon = icon;
        }
    }

    private static final Map<String, ButtonDef> PREDEFINED_BUTTONS = new HashMap<>();
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

    @Test
    public void testGenerateHelpHtml() throws Exception {
        // 1. Find directories
        File projectDir = new File(System.getProperty("user.dir"));
        File mdFile = null;
        File outHtmlFile = null;

        // Gradle or CLI runs test with Cwd = root or Cwd = backend. Check both locations.
        if (new File(projectDir, "src/main/resources/help/doc-user-help.md").exists()) {
            mdFile = new File(projectDir, "src/main/resources/help/doc-user-help.md");
            outHtmlFile = new File(projectDir, "src/main/resources/help/doc-user-help.html");
        } else if (new File(projectDir, "backend/src/main/resources/help/doc-user-help.md").exists()) {
            mdFile = new File(projectDir, "backend/src/main/resources/help/doc-user-help.md");
            outHtmlFile = new File(projectDir, "backend/src/main/resources/help/doc-user-help.html");
        } else {
            // Fallback: Read via resource stream
            InputStream is = getClass().getResourceAsStream("/help/doc-user-help.md");
            assertNotNull(is, "Markdown file doc-user-help.md must exist in classpath resources.");
            
            // Try to deduce resources path relative to build directory
            URL buildDirUrl = getClass().getProtectionDomain().getCodeSource().getLocation();
            File buildDirFile = new File(buildDirUrl.toURI());
            // buildDirFile is usually: backend/build/classes/java/test/ or similar
            // Search upwards for "backend"
            File current = buildDirFile;
            while (current != null && !current.getName().equals("backend") && !current.getName().equals("aman")) {
                current = current.getParentFile();
            }
            if (current != null) {
                File backendBase = current.getName().equals("backend") ? current : new File(current, "backend");
                mdFile = new File(backendBase, "src/main/resources/help/doc-user-help.md");
                outHtmlFile = new File(backendBase, "src/main/resources/help/doc-user-help.html");
            }
        }

        assertNotNull(mdFile, "Could not determine the location of doc-user-help.md in resources directory.");
        assertTrue(mdFile.exists(), "Markdown file must exist.");

        // 2. Read Markdown content
        StringBuilder sbMd = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(mdFile), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                sbMd.append(line).append("\n");
            }
        }
        String markdown = sbMd.toString();

        // 3. Compile Markdown to HTML
        String parsedBody = compileMarkdownToHtml(markdown);
        
        // Rewrite image tags to use contextPath dynamically: src="./main1.png" -> src="[contextPath]/manual/help/image/main1.png"
        parsedBody = parsedBody.replaceAll("src=\"\\./", "src=\"[contextPath]/manual/help/image/");

        // Target blank script (always injected for user help reference pages)
        String targetBlankScript = 
            "    <script>\n" +
            "        document.addEventListener('DOMContentLoaded', function() {\n" +
            "            var links = document.querySelectorAll('.container a');\n" +
            "            for (var i = 0; i < links.length; i++) {\n" +
            "                links[i].setAttribute('target', '_blank');\n" +
            "                links[i].setAttribute('rel', 'noopener noreferrer');\n" +
            "            }\n" +
            "        });\n" +
            "    </script>\n";

        String tabScript = 
            "    <script>\n" +
            "        function switchTab(evt, tabId) {\n" +
            "            var i, tabcontent, tablinks;\n" +
            "            tabcontent = document.getElementsByClassName('tab-pane');\n" +
            "            for (i = 0; i < tabcontent.length; i++) {\n" +
            "                tabcontent[i].classList.remove('active');\n" +
            "            }\n" +
            "            tablinks = document.getElementsByClassName('tab-btn');\n" +
            "            for (i = 0; i < tablinks.length; i++) {\n" +
            "                tablinks[i].classList.remove('active');\n" +
            "            }\n" +
            "            document.getElementById(tabId).classList.add('active');\n" +
            "            evt.currentTarget.classList.add('active');\n" +
            "        }\n" +
            "    </script>\n";

        String fullHtml = 
            "<!DOCTYPE html>\n" +
            "<html lang=\"ko\">\n" +
            "<head>\n" +
            "    <meta charset=\"UTF-8\">\n" +
            "    <link rel=\"icon\" type=\"image/png\" href=\"[contextPath]/favicon.png\">\n" +
            "    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css\" />\n" +
            "    <title>A-Man 도움말</title>\n" +
            "    <style>\n" +
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
            "        .tabs {\n" +
            "            margin: 30px 0;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            border-radius: 8px;\n" +
            "            overflow: hidden;\n" +
            "            background: #ffffff;\n" +
            "        }\n" +
            "        .tab-header {\n" +
            "            display: flex;\n" +
            "            background-color: #f8fafc;\n" +
            "            border-bottom: 1px solid #e2e8f0;\n" +
            "        }\n" +
            "        .tab-btn {\n" +
            "            flex: 1;\n" +
            "            padding: 14px 16px;\n" +
            "            font-size: 14px;\n" +
            "            font-weight: 600;\n" +
            "            color: #64748b;\n" +
            "            background: none;\n" +
            "            border: none;\n" +
            "            cursor: pointer;\n" +
            "            transition: all 0.2s;\n" +
            "            outline: none;\n" +
            "            text-align: center;\n" +
            "            border-bottom: 2px solid transparent;\n" +
            "        }\n" +
            "        .tab-btn:hover {\n" +
            "            color: #0f172a;\n" +
            "            background-color: #f1f5f9;\n" +
            "        }\n" +
            "        .tab-btn.active {\n" +
            "            color: #4f46e5;\n" +
            "            background-color: #ffffff;\n" +
            "            border-bottom: 2px solid #4f46e5;\n" +
            "        }\n" +
            "        .tab-content {\n" +
            "            padding: 24px;\n" +
            "        }\n" +
            "        .tab-pane {\n" +
            "            display: none;\n" +
            "        }\n" +
            "        .tab-pane.active {\n" +
            "            display: block;\n" +
            "        }\n" +
            "        .theme-color-box {\n" +
            "            display: inline-block;\n" +
            "            width: 14px;\n" +
            "            height: 14px;\n" +
            "            border-radius: 3px;\n" +
            "            vertical-align: middle;\n" +
            "            margin-right: 6px;\n" +
            "            border: 1px solid rgba(0,0,0,0.1);\n" +
            "        }\n" +
            "        body {\n" +
            "            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n" +
            "            padding: 30px;\n" +
            "            margin: 0;\n" +
            "            color: #334155;\n" +
            "            background-color: #f8fafc;\n" +
            "            line-height: 1.6;\n" +
            "        }\n" +
            "        .container {\n" +
            "            background-color: #ffffff;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            padding: 40px;\n" +
            "            border-radius: 12px;\n" +
            "            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);\n" +
            "            max-width: 900px;\n" +
            "            margin: 20px auto;\n" +
            "        }\n" +
            "        code {\n" +
            "            background-color: #f1f5f9;\n" +
            "            color: #db2777;\n" +
            "            padding: 2px 6px;\n" +
            "            border-radius: 4px;\n" +
            "            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n" +
            "            font-size: 0.85em;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "        }\n" +
            "        pre {\n" +
            "            background-color: #0f172a;\n" +
            "            color: #f8fafc;\n" +
            "            padding: 16px;\n" +
            "            border-radius: 8px;\n" +
            "            overflow-x: auto;\n" +
            "            margin: 16px 0;\n" +
            "        }\n" +
            "        pre code {\n" +
            "            background-color: transparent;\n" +
            "            color: inherit;\n" +
            "            padding: 0;\n" +
            "            border-radius: 0;\n" +
            "            border: none;\n" +
            "            font-size: 13px;\n" +
            "        }\n" +
            "        table {\n" +
            "            width: 100%;\n" +
            "            border-collapse: collapse;\n" +
            "            margin: 20px 0;\n" +
            "            font-size: 13px;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            border-radius: 8px;\n" +
            "            overflow: hidden;\n" +
            "        }\n" +
            "        th, td {\n" +
            "            padding: 10px 16px;\n" +
            "            border-bottom: 1px solid #e2e8f0;\n" +
            "        }\n" +
            "        th {\n" +
            "            background-color: #f8fafc;\n" +
            "            font-weight: 600;\n" +
            "            color: #1e293b;\n" +
            "            text-align: left;\n" +
            "        }\n" +
            "        td {\n" +
            "            color: #475569;\n" +
            "        }\n" +
            "        blockquote {\n" +
            "            margin: 14px 0;\n" +
            "            padding: 12px 18px;\n" +
            "            background-color: #f7f9fb;\n" +
            "            border-left: 3px solid #c7dbf0;\n" +
            "            border-radius: 6px;\n" +
            "            color: #455160;\n" +
            "            font-size: 14px;\n" +
            "        }\n" +
            "        blockquote p {\n" +
            "            margin: 4px 0;\n" +
            "            font-size: 14px;\n" +
            "        }\n" +
            "        img {\n" +
            "            max-width: 100%;\n" +
            "            height: auto;\n" +
            "            display: block;\n" +
            "            margin: 16px auto;\n" +
            "            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n" +
            "        }\n" +
            "        a {\n" +
            "            color: #4f46e5;\n" +
            "            text-decoration: none;\n" +
            "        }\n" +
            "        a:hover {\n" +
            "            text-decoration: underline;\n" +
            "        }\n" +
            TOC_CSS +
            "    </style>\n" +
            targetBlankScript +
            tabScript +
            TOC_SCRIPT +
            "</head>\n" +
            "<body>\n" +
            "    <div class=\"container\">\n" +
            "        " + parsedBody + "\n" +
            "    </div>\n" +
            "</body>\n" +
            "</html>";

        // 4. Save to doc-user-help.html
        System.out.println("Writing compiled HTML to: " + outHtmlFile.getAbsolutePath());
        try (BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(outHtmlFile), StandardCharsets.UTF_8))) {
            bw.write(fullHtml);
        }

        assertTrue(outHtmlFile.exists(), "Output HTML file should be created.");
        assertTrue(outHtmlFile.length() > 0, "Output HTML file should not be empty.");
    }

    private String compileMarkdownToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "<p style='color:#888; font-style:italic;'>내용이 비어있습니다.</p>";
        }

        // **텍스트(괄호)** 등 볼드 한글 파싱 에러 방지용 전처리
        markdown = markdown.replaceAll("\\*\\*(.*?)\\*\\*", "<strong>$1</strong>");

        // 백틱 확장 정규식 전처리 주입 (도움말 파일 개별 파싱으로 격리 보장)
        markdown = preprocessBackticks(markdown);

        MutableDataSet options = new MutableDataSet();
        options.set(Parser.EXTENSIONS, Arrays.asList(
            TablesExtension.create(),
            StrikethroughExtension.create(),
            TaskListExtension.create()
        ));
        options.set(HtmlRenderer.SOFT_BREAK, "<br />\n");

        Parser parser = Parser.builder(options).build();
        HtmlRenderer renderer = HtmlRenderer.builder(options).build();

        com.vladsch.flexmark.util.ast.Node document = parser.parse(markdown);
        return renderer.render(document);
    }

    private static final Pattern BACKTICK_PATTERN = Pattern.compile("`([^`]+)`");

    private String preprocessBackticks(String markdown) {
        if (markdown == null) {
            return null;
        }
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
        Matcher matcher = BACKTICK_PATTERN.matcher(text);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String content = matcher.group(1).trim();
            String replacement = renderButtonHtml(content);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String renderButtonHtml(String content) {
        if (content == null) {
            return "";
        }
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
                if (i > 2) {
                    textBuilder.append(":");
                }
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

    private String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }

    private String darkenColorJava(String hexColor, int percent) {
        try {
            String c = hexColor.startsWith("#") ? hexColor.substring(1) : hexColor;
            if (c.length() == 3) {
                c = "" + c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
            }
            int r = Integer.parseInt(c.substring(0, 2), 16);
            int g = Integer.parseInt(c.substring(2, 4), 16);
            int b = Integer.parseInt(c.substring(4, 6), 16);

            r = Math.max(0, r - (r * percent / 100));
            g = Math.max(0, g - (g * percent / 100));
            b = Math.max(0, b - (b * percent / 100));

            return String.format("#%02x%02x%02x", r, g, b);
        } catch (Exception e) {
            return hexColor;
        }
    }

    private boolean isLightColorJava(String hexColor) {
        try {
            String c = hexColor.startsWith("#") ? hexColor.substring(1) : hexColor;
            if (c.length() == 3) {
                c = "" + c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
            }
            int r = Integer.parseInt(c.substring(0, 2), 16);
            int g = Integer.parseInt(c.substring(2, 4), 16);
            int b = Integer.parseInt(c.substring(4, 6), 16);

            // Perceptual luminance formula
            double luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
            return luminance > 0.65;
        } catch (Exception e) {
            return false;
        }
    }
}
