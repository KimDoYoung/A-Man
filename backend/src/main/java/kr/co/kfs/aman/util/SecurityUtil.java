package kr.co.kfs.aman.util;

import kr.co.kfs.aman.config.ZipUploadIpFilter;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

public class SecurityUtil {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // 이 키는 프론트엔드 빌드 시 난독화되어 내장될 것입니다.
    public static final String STATIC_CLIENT_KEY = "A-Man-Static-Client-Key-2026!";

    // 신뢰 프록시 목록 (aman.security.trusted-proxies). 기동 시 SecurityConfig 에서 설정한다.
    private static volatile List<String> trustedProxies = Collections.emptyList();

    public static void setTrustedProxies(String csv) {
        trustedProxies = ZipUploadIpFilter.parseList(csv);
    }

    // 클라이언트 IP 구하기 (프록시 고려)
    // X-Forwarded-For 는 remoteAddr 가 신뢰 프록시일 때만 그 마지막 값을 사용한다.
    // (헤더를 그대로 믿으면 "X-Forwarded-For: 127.0.0.1" 위조로 내부 IP 판정을 우회할 수 있음)
    public static String getClientIp(HttpServletRequest request) {
        return ZipUploadIpFilter.resolveClientIp(request.getRemoteAddr(), request.getHeader("X-Forwarded-For"), trustedProxies);
    }

    // SHA-256 해시를 이용한 256비트(32바이트) 키 생성
    private static byte[] get256BitKey(String keyStr) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return digest.digest(keyStr.getBytes(StandardCharsets.UTF_8));
    }

    // AES-256 Encrypt (IV 포함하여 Base64 인코딩 반환)
    public static String encrypt(String plainText, String keyStr) throws Exception {
        if (plainText == null) {
            return null;
        }
        byte[] keyBytes = get256BitKey(keyStr);
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");

        // 랜덤 16바이트 IV 생성
        byte[] iv = new byte[16];
        SECURE_RANDOM.nextBytes(iv);
        IvParameterSpec ivSpec = new IvParameterSpec(iv);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
        byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

        // IV + Encrypted Data 결합
        byte[] combined = new byte[iv.length + encryptedBytes.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);

        return Base64.getEncoder().encodeToString(combined);
    }

    // AES-256 Decrypt (Base64 디코딩 및 IV 분리하여 복호화)
    public static String decrypt(String encryptedBase64, String keyStr) throws Exception {
        if (encryptedBase64 == null) {
            return null;
        }
        byte[] combined = Base64.getDecoder().decode(encryptedBase64);

        if (combined.length < 16) {
            throw new IllegalArgumentException("Invalid encrypted data size");
        }

        byte[] iv = new byte[16];
        byte[] encryptedBytes = new byte[combined.length - 16];
        System.arraycopy(combined, 0, iv, 0, 16);
        System.arraycopy(combined, 16, encryptedBytes, 0, encryptedBytes.length);

        byte[] keyBytes = get256BitKey(keyStr);
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
        IvParameterSpec ivSpec = new IvParameterSpec(iv);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);

        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }

    // 시간 블록 및 IP에 매핑된 동적 키 계산
    public static String generateDynamicKey(String salt, String clientIp, long timeBlock) throws Exception {
        String base = salt + ":" + clientIp + ":" + timeBlock;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hash);
    }
}
