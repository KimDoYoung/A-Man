<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="javax.crypto.Mac" %>
<%@ page import="javax.crypto.spec.SecretKeySpec" %>
<%@ page import="java.nio.charset.StandardCharsets" %>
<%@ page import="java.util.Base64" %>
<%
    // 0. A-Man 서비스 루트 URL 설정 (상단 상수로 선언)
    final String AMAN_BASE_URL = "https://aview.k-fs.co.kr:7171/aman";

    // 브라우저 리다이렉션 캐싱 방지 설정
    response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1
    response.setHeader("Pragma", "no-cache"); // HTTP 1.0
    response.setDateHeader("Expires", 0); // Proxies

    // 1. AssetERP 세션 및 로그인 유저 인증 여부 검증
    HttpSession erpSession = request.getSession(false);
    boolean isAuthorized = (erpSession != null && erpSession.getAttribute("LOGIN_USER") != null);

    if (!isAuthorized) {
        response.setContentType("text/html; charset=UTF-8");
        out.println("<html><body style='text-align:center; padding-top:100px; font-family:sans-serif; color:#64748b;'>");
        out.println("<h2>⚠️ 접근 권한이 없습니다.</h2>");
        out.println("<p>AssetERP 시스템에 로그인한 후 이용해 주십시오.</p>");
        out.println("</body></html>");
        return;
    }

    // 2. 화면 식별 파라미터(aka) 및 사용자 식별자 획득
    String aka = request.getParameter("aka");
    String userId = request.getParameter("personId");
    if (userId == null || userId.trim().isEmpty()) {
        userId = "unknown";
    }
    
    // 3. HMAC-SHA256 보안 토큰 생성
    String secretKey = "A-Man-Shared-Secret-Key-Custom-Value-Here!"; // A-Man 서버와 일치시켜야 함
    String clientIp = request.getRemoteAddr();
    long timestamp = System.currentTimeMillis();
    
    // 페이로드 데이터 조립 (사용자 ID | 타임스탬프 | 요청자 IP)
    String payload = userId + "|" + timestamp + "|" + clientIp;
    
    // HMAC-SHA256 서명 계산
    Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
    SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    sha256_HMAC.init(secretKeySpec);
    byte[] hashBytes = sha256_HMAC.doFinal(payload.getBytes(StandardCharsets.UTF_8));
    String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
    
    // 최종 토큰 (페이로드 + 서명)을 Base64 인코딩
    String rawToken = payload + "|" + signature;
    String secureToken = Base64.getUrlEncoder().withoutPadding().encodeToString(rawToken.getBytes(StandardCharsets.UTF_8));

    // 4. 리다이렉트 주소 계산
    String redirectUrl;
    if (aka != null && !aka.trim().isEmpty()) {
        // [화면별 도움말] 요청인 경우
        redirectUrl = AMAN_BASE_URL + "/manual/" + aka + "?token=" + secureToken;
    } else {
        // [전체 매뉴얼] 요청인 경우
        redirectUrl = AMAN_BASE_URL + "/docs?token=" + secureToken;
    }
    
    response.sendRedirect(redirectUrl);
%>
