package kr.co.kfs.aman.util;

import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.gfm.tasklist.TaskListExtension;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MarkdownParserCLI {

    public static void main(String[] args) {
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            
            MarkdownParserCLI parserCLI = new MarkdownParserCLI();
            String resultHtml = parserCLI.parseMarkdownToHtml(sb.toString());
            System.out.print(resultHtml);
        } catch (Exception e) {
            System.err.println("Error parsing markdown: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private String parseMarkdownToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "<p style='color:#888; font-style:italic;'>내용이 비어있습니다.</p>";
        }

        // 백틱 확장 정규식 전처리 주입
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

    // --- 백틱 파싱 확장 관련 자바 구현 (ManualController.java에서 복제) ---
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
        return "<code>" + escapeHtml(text) + "</code>";
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
        if (color == null || !color.startsWith("#")) {
            return false;
        }
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
        if (color == null || !color.startsWith("#")) {
            return color;
        }
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

    private String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#x27;");
    }
}
