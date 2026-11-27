package kr.co.kfs.aman.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * zip-upload IP 제한 필터 (docs/zip-upload-설계.md 3장)
 * ZipUploadConfig 에서 /zip-upload 경로에만 등록한다. multipart 처리 이전에 차단한다.
 *
 * - 클라이언트 IP는 request.getRemoteAddr() 기준.
 * - X-Forwarded-For 는 remoteAddr 가 신뢰 프록시(trusted-proxies)일 때만, 마지막 값을 사용한다.
 *   (SecurityUtil.getClientIp 처럼 헤더를 그대로 믿으면 헤더 위조로 우회 가능)
 * - 허용 목록 항목이 '.' 또는 ':' 로 끝나면 접두어 일치, 아니면 정확히 일치.
 */
public class ZipUploadIpFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ZipUploadIpFilter.class);

    private final boolean enabled;
    private final List<String> allowedIps;
    private final List<String> trustedProxies;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ZipUploadIpFilter(boolean enabled, String allowedIps, String trustedProxies) {
        this.enabled = enabled;
        this.allowedIps = parseList(allowedIps);
        this.trustedProxies = parseList(trustedProxies);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String clientIp = resolveClientIp(request.getRemoteAddr(), request.getHeader("X-Forwarded-For"), trustedProxies);

        if (!enabled) {
            log.warn("[zip-upload] 거부 (기능 꺼짐) ip={}", clientIp);
            reject(response, clientIp, "zip-upload 기능이 꺼져 있습니다. (aman.zip-upload.enabled)");
            return;
        }
        if (!matches(clientIp, allowedIps)) {
            log.warn("[zip-upload] 거부 (허용되지 않은 IP) ip={}, remoteAddr={}", clientIp, request.getRemoteAddr());
            reject(response, clientIp, "허용되지 않은 IP입니다.");
            return;
        }
        log.info("[zip-upload] 허용 ip={}", clientIp);
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String clientIp, String message) throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", message);
        body.put("ip", clientIp);
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /**
     * 클라이언트 IP 판정.
     * remoteAddr 가 신뢰 프록시이고 X-Forwarded-For 가 있으면 그 마지막 값(프록시가 직접 본 IP), 아니면 remoteAddr.
     */
    static String resolveClientIp(String remoteAddr, String forwardedFor, List<String> trustedProxies) {
        if (remoteAddr != null && forwardedFor != null && !forwardedFor.trim().isEmpty()
                && matches(remoteAddr, trustedProxies)) {
            String[] parts = forwardedFor.split(",");
            String last = parts[parts.length - 1].trim();
            if (!last.isEmpty()) {
                return last;
            }
        }
        return remoteAddr;
    }

    /** ip 가 목록과 일치하는지. '.' 또는 ':' 로 끝나는 항목은 접두어 일치. */
    static boolean matches(String ip, List<String> list) {
        if (ip == null || list == null) {
            return false;
        }
        for (String entry : list) {
            boolean prefix = entry.endsWith(".") || entry.endsWith(":");
            if (prefix ? ip.startsWith(entry) : ip.equals(entry)) {
                return true;
            }
        }
        return false;
    }

    static List<String> parseList(String csv) {
        if (csv == null || csv.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<String> result = new ArrayList<>();
        for (String s : csv.split(",")) {
            String v = s.trim();
            if (!v.isEmpty()) {
                result.add(v);
            }
        }
        return result;
    }
}
