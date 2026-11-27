package kr.co.kfs.aman.config;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** zip-upload IP 판정 (docs/zip-upload-설계.md 3장) */
class ZipUploadIpFilterTest {

    private final List<String> allowed = ZipUploadIpFilter.parseList(" 127.0.0.1, ::1 ,192.168.0., 10.1.2.3,,");

    @Test
    void parseList() {
        assertEquals(Arrays.asList("127.0.0.1", "::1", "192.168.0.", "10.1.2.3"), allowed);
        assertTrue(ZipUploadIpFilter.parseList("").isEmpty());
        assertTrue(ZipUploadIpFilter.parseList(null).isEmpty());
    }

    @Test
    void exactAndPrefixMatch() {
        assertTrue(ZipUploadIpFilter.matches("127.0.0.1", allowed));
        assertTrue(ZipUploadIpFilter.matches("::1", allowed));
        assertTrue(ZipUploadIpFilter.matches("192.168.0.77", allowed));   // 접두어
        assertTrue(ZipUploadIpFilter.matches("10.1.2.3", allowed));

        assertFalse(ZipUploadIpFilter.matches("10.1.2.30", allowed));     // 정확 일치 항목은 접두어로 보지 않음
        assertFalse(ZipUploadIpFilter.matches("192.168.1.5", allowed));
        assertFalse(ZipUploadIpFilter.matches("127.0.0.10", allowed));
        assertFalse(ZipUploadIpFilter.matches(null, allowed));
        assertFalse(ZipUploadIpFilter.matches("127.0.0.1", Collections.<String>emptyList())); // 목록 비면 전부 거부
    }

    @Test
    void forwardedForIgnoredWithoutTrustedProxy() {
        // 신뢰 프록시가 없으면 X-Forwarded-For 위조를 무시하고 remoteAddr 사용
        assertEquals("203.0.113.9",
                ZipUploadIpFilter.resolveClientIp("203.0.113.9", "127.0.0.1", Collections.<String>emptyList()));
    }

    @Test
    void forwardedForUsedOnlyFromTrustedProxy() {
        List<String> proxies = ZipUploadIpFilter.parseList("172.20.");
        // 신뢰 프록시에서 온 요청: 마지막 값(프록시가 직접 본 IP) 사용. 앞쪽 값은 클라이언트가 위조 가능
        assertEquals("192.168.0.5",
                ZipUploadIpFilter.resolveClientIp("172.20.0.1", "127.0.0.1, 192.168.0.5", proxies));
        // 신뢰 프록시가 아닌 곳에서 온 요청은 헤더 무시
        assertEquals("203.0.113.9",
                ZipUploadIpFilter.resolveClientIp("203.0.113.9", "127.0.0.1", proxies));
        // 헤더가 없으면 remoteAddr
        assertEquals("172.20.0.1", ZipUploadIpFilter.resolveClientIp("172.20.0.1", null, proxies));
        assertEquals("172.20.0.1", ZipUploadIpFilter.resolveClientIp("172.20.0.1", " ", proxies));
    }
}
