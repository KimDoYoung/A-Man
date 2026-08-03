package kr.co.kfs.aman.security;

import org.springframework.web.filter.OncePerRequestFilter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import kr.co.kfs.aman.util.SecurityUtil;

public class ErpTokenValidationFilter extends OncePerRequestFilter {

    private final String secretKey = "A-Man-Shared-Secret-Key-Custom-Value-Here!";
    private final long tokenExpiryMs = 15000; // 토큰 만료 기한 (15초)

    private final boolean internalIpEnabled;
    private final String internalIps;

    public ErpTokenValidationFilter(boolean internalIpEnabled, String internalIps) {
        this.internalIpEnabled = internalIpEnabled;
        this.internalIps = internalIps;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String uri = request.getRequestURI();
        
        // 정적 자원(JS, CSS, 이미지) 및 로그인/관리자 페이지(/admin)는 필터 예외 처리
        if (uri.contains("/assets") || uri.contains("/favicon") || uri.contains("/admin/") || uri.contains("/security/handshake")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = SecurityUtil.getClientIp(request);
        HttpSession session = request.getSession(true);
        
        if (isInternalIp(clientIp)) {
            session.setAttribute("AMAN_ERP_AUTHENTICATED", true);
            filterChain.doFilter(request, response);
            return;
        }

        // 이미 인증된 세션이면 통과
        if (Boolean.TRUE.equals(session.getAttribute("AMAN_ERP_AUTHENTICATED"))) {
            filterChain.doFilter(request, response);
            return;
        }

        // URL 파라미터의 token 검증
        String token = request.getParameter("token");
        if (token != null && !token.trim().isEmpty()) {
            if (validateSecureToken(token, clientIp)) {
                // 검증 성공 -> 로컬 세션 생성
                session.setAttribute("AMAN_ERP_AUTHENTICATED", true);
                filterChain.doFilter(request, response);
                return;
            } else {
                sendAccessDeniedResponse(response, "유효하지 않거나 만료된 보안 토큰입니다.");
                return;
            }
        }

        // 토큰이 없고 사외 IP인 경우 접근 차단
        sendAccessDeniedResponse(response, "AssetERP 시스템을 정상 경로로 거쳐서 도움말을 열어주시기 바랍니다.");
    }

    private boolean isInternalIp(String ip) {
        if (!internalIpEnabled) {
            return false;
        }
        if (internalIps == null || internalIps.trim().isEmpty()) {
            return false;
        }
        for (String pattern : internalIps.split(",")) {
            String trimmedPattern = pattern.trim();
            if (trimmedPattern.isEmpty()) continue;
            
            // Exact match or prefix match (e.g. "192.168.10.")
            if (ip.equals(trimmedPattern) || ip.startsWith(trimmedPattern)) {
                return true;
            }
        }
        return false;
    }

    private void sendAccessDeniedResponse(HttpServletResponse response, String message) throws IOException {
        response.setContentType("text/html; charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.getWriter().println("<html><body style='text-align:center; padding-top:100px; font-family:sans-serif; color:#64748b;'>");
        response.getWriter().println("<h2>⚠️ 접근 권한이 없습니다.</h2>");
        response.getWriter().println("<p>" + message + "</p>");
        response.getWriter().println("</body></html>");
    }

    private boolean validateSecureToken(String tokenStr, String clientIp) {
        try {
            // Base64 디코딩
            byte[] decodedBytes = Base64.getUrlDecoder().decode(tokenStr);
            String decodedStr = new String(decodedBytes, StandardCharsets.UTF_8);
            
            String[] parts = decodedStr.split(":");
            if (parts.length != 4) return false;
            
            String userId = parts[0];
            long timestamp = Long.parseLong(parts[1]);
            String ipInToken = parts[2];
            String signature = parts[3];
            
            // 검증 1: 15초 유효 기한 확인
            if (System.currentTimeMillis() - timestamp > tokenExpiryMs) {
                return false;
            }
            
            // 검증 2: 대칭키를 활용한 HMAC-SHA256 서명 검증
            String payload = userId + ":" + timestamp + ":" + ipInToken;
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secretKeySpec);
            byte[] hashBytes = sha256_HMAC.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
            
            return expectedSignature.equals(signature);
        } catch (Exception e) {
            return false;
        }
    }
}
