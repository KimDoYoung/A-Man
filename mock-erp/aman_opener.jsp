<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="javax.crypto.Mac" %>
<%@ page import="javax.crypto.spec.SecretKeySpec" %>
<%@ page import="java.nio.charset.StandardCharsets" %>
<%@ page import="java.util.Base64" %>
<%
    // 브라우저 리다이렉션 캐싱 방지 설정
    response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1
    response.setHeader("Pragma", "no-cache"); // HTTP 1.0
    response.setDateHeader("Expires", 0); // Proxies

    // Mock ERP이므로 세션 검증은 항상 허용으로 시뮬레이션합니다.
    boolean isAuthorized = true;

    if (!isAuthorized) {
        response.setContentType("text/html; charset=UTF-8");
        out.println("<html><body><h2>⚠️ 접근 권한이 없습니다.</h2></body></html>");
        return;
    }

    // 파라미터 획득
    String aka = request.getParameter("aka");
    String userId = request.getParameter("personId");
    if (userId == null || userId.trim().isEmpty()) {
        userId = "mock-tester";
    }
    
    // 테스트용 A-Man 주소 동적 획득
    String amanBaseUrl = request.getParameter("amanUrl");
    if (amanBaseUrl == null || amanBaseUrl.trim().isEmpty()) {
        amanBaseUrl = "http://localhost:5173/aman"; 
    }
    
    // 3. HMAC-SHA256 보안 토큰 생성
    String secretKey = "A-Man-Shared-Secret-Key-Custom-Value-Here!"; // A-Man과 공유한 대칭키
    String clientIp = request.getRemoteAddr();
    long timestamp = System.currentTimeMillis();
    
    // 페이로드 조립 (사용자 ID | 타임스탬프 | 요청자 IP)
    String payload = userId + "|" + timestamp + "|" + clientIp;
    
    // HMAC-SHA256 계산
    Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
    SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    sha256_HMAC.init(secretKeySpec);
    byte[] hashBytes = sha256_HMAC.doFinal(payload.getBytes(StandardCharsets.UTF_8));
    String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
    
    // 최종 토큰 Base64 인코딩
    String rawToken = payload + "|" + signature;
    String secureToken = Base64.getUrlEncoder().withoutPadding().encodeToString(rawToken.getBytes(StandardCharsets.UTF_8));

    // 4. A-Man 서버 주소로 리다이렉트
    String redirectUrl;
    if (aka != null && !aka.trim().isEmpty()) {
        // [화면별 도움말] 요청인 경우
        redirectUrl = amanBaseUrl + "/manual/" + aka + "?token=" + secureToken;
    } else {
        // [전체 매뉴얼] 요청인 경우
        redirectUrl = amanBaseUrl + "/docs?token=" + secureToken;
    }
    
    // format이 json이면 리다이렉션 대신 JSON 응답을 내려줌 (AJAX용)
    String format = request.getParameter("format");
    if ("json".equalsIgnoreCase(format)) {
        response.setContentType("application/json; charset=UTF-8");
        out.println("{\"redirectUrl\": \"" + redirectUrl + "\"}");
        return;
    }
    
    response.sendRedirect(redirectUrl);
%>
