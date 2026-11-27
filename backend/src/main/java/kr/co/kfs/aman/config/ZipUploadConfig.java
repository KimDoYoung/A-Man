package kr.co.kfs.aman.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * zip-upload IP 제한 필터 등록 (docs/zip-upload-설계.md 3.3)
 * /zip-upload 경로에만 적용하고, Spring Security 필터 체인(order -100)보다 먼저 실행한다.
 */
@Configuration
public class ZipUploadConfig {

    public static final String ZIP_UPLOAD_PATH = "/zip-upload";

    @Bean
    public FilterRegistrationBean<ZipUploadIpFilter> zipUploadIpFilter(
            @Value("${aman.zip-upload.enabled:false}") boolean enabled,
            @Value("${aman.zip-upload.allowed-ips:}") String allowedIps,
            @Value("${aman.zip-upload.trusted-proxies:}") String trustedProxies) {
        FilterRegistrationBean<ZipUploadIpFilter> bean =
                new FilterRegistrationBean<>(new ZipUploadIpFilter(enabled, allowedIps, trustedProxies));
        bean.addUrlPatterns(ZIP_UPLOAD_PATH);
        bean.setOrder(-200);
        bean.setName("zipUploadIpFilter");
        return bean;
    }
}
