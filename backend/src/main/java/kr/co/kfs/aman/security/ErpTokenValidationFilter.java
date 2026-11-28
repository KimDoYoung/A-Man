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

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ErpTokenValidationFilter.class);

    private final String secretKey = "A-Man-Shared-Secret-Key-Custom-Value-Here!";
    private final long tokenExpiryMs = 15000; // 토큰 만료 기한 (15초)

    private final boolean enabled;
    private final boolean internalIpEnabled;
    private final String internalIps;

    public ErpTokenValidationFilter(boolean enabled, boolean internalIpEnabled, String internalIps) {
        this.enabled = enabled;
        this.internalIpEnabled = internalIpEnabled;
        this.internalIps = internalIps;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String uri = request.getRequestURI();
        
        boolean isDocsRequest = uri.contains("/docs");
        boolean isManualRequest = uri.contains("/manual");
        boolean isSecurityUtil = uri.contains("/security/");

        // 매뉴얼 조회(/docs 또는 /manual)가 아니거나, 보안 유틸리티(/security/) 요청인 경우 필터를 거치지 않고 패스
        // aman.security.erp-check.enabled=false 이면 모든 요청 패스 (개인 서버 jskn 등)
        if (!enabled || !(isDocsRequest || isManualRequest) || isSecurityUtil) {
            filterChain.doFilter(request, response);
            return;
        }

        // JWT 인증을 통해 이미 로그인된 사용자인 경우 필터 패스
        org.springframework.security.core.Authentication auth = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = SecurityUtil.getClientIp(request);
        HttpSession session = request.getSession(true);
        
        boolean internalIpCheck = isInternalIp(clientIp);
        log.info("[ErpTokenFilter] Request URI: {}, Client IP: {}, Internal IP Enabled: {}, isInternalIp: {}", 
                 uri, clientIp, internalIpEnabled, internalIpCheck);

        if (internalIpCheck) {
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
        if (ip == null) {
            return false;
        }
        if (!internalIpEnabled) {
            return false;
        }
        if (internalIps == null || internalIps.trim().isEmpty()) {
            return false;
        }
        for (String pattern : internalIps.split(",")) {
            String trimmedPattern = pattern.trim();
            if (trimmedPattern.isEmpty()) {
                continue;
            }
            
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
            
            String[] parts = decodedStr.split("\\|");
            if (parts.length != 4) {
                log.warn("[ErpTokenFilter] Token format invalid. Split parts length: {}", parts.length);
                return false;
            }
            
            String userId = parts[0];
            long timestamp = Long.parseLong(parts[1]);
            String ipInToken = parts[2];
            String signature = parts[3];
            
            // 검증 1: 15초 유효 기한 확인
            long diff = System.currentTimeMillis() - timestamp;
            if (diff > tokenExpiryMs) {
                log.warn("[ErpTokenFilter] Token expired. Age: {} ms, limit: {} ms", diff, tokenExpiryMs);
                return false;
            }
            if (diff < -60000) { // 미래 시간 방어 (클럭 차이 최대 1분 허용)
                log.warn("[ErpTokenFilter] Token from future. Time diff: {} ms", diff);
                return false;
            }
            
            // 검증 2: 요청자 IP와 토큰 내 IP 대조 (보안강화)
            if (!isSameIp(clientIp, ipInToken)) {
                log.warn("[ErpTokenFilter] IP mismatch. Request IP: {}, Token IP: {}", clientIp, ipInToken);
                return false;
            }
            
            // 검증 3: 대칭키를 활용한 HMAC-SHA256 서명 검증
            String payload = userId + "|" + timestamp + "|" + ipInToken;
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKeySpec);
            byte[] hashBytes = sha256Hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
            
            boolean signatureValid = expectedSignature.equals(signature);
            if (!signatureValid) {
                log.warn("[ErpTokenFilter] Signature verification failed. Expected: {}, Got: {}", expectedSignature, signature);
                return false;
            }
            
            return true;
        } catch (Exception e) {
            log.error("[ErpTokenFilter] Token validation exception", e);
            return false;
        }
    }

    private boolean isSameIp(String ip1, String ip2) {
        if (ip1 == null || ip2 == null) {
            return false;
        }
        if (ip1.equals(ip2)) {
            return true;
        }
        // 루프백 계열 예외 처리
        boolean isIp1Loopback = "127.0.0.1".equals(ip1) || "::1".equals(ip1) || "0:0:0:0:0:0:0:1".equals(ip1) || "localhost".equalsIgnoreCase(ip1);
        boolean isIp2Loopback = "127.0.0.1".equals(ip2) || "::1".equals(ip2) || "0:0:0:0:0:0:0:1".equals(ip2) || "localhost".equalsIgnoreCase(ip2);
        return isIp1Loopback && isIp2Loopback;
    }
}
