package kr.co.kfs.aman.config;

import kr.co.kfs.aman.repository.TokenBlacklistRepository;
import kr.co.kfs.aman.security.JwtAuthenticationFilter;
import kr.co.kfs.aman.security.JwtTokenProvider;
import kr.co.kfs.aman.security.ErpTokenValidationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistRepository blacklistRepository;

    // false 이면 매뉴얼 조회 시 ERP 토큰/내부 IP 검사를 하지 않는다. (보안이 필요 없는 개인 서버용)
    @org.springframework.beans.factory.annotation.Value("${aman.security.erp-check.enabled:true}")
    private boolean erpCheckEnabled;

    @org.springframework.beans.factory.annotation.Value("${aman.security.internal-ip.enabled:true}")
    private boolean internalIpEnabled;

    @org.springframework.beans.factory.annotation.Value("${aman.security.internal-ips:127.0.0.1,0:0:0:0:0:0:0:1,192.168.10.,210.123.45.67}")
    private String internalIps;

    // 앞단 프록시 IP. 여기서 온 요청만 X-Forwarded-For 를 클라이언트 IP로 인정한다.
    @org.springframework.beans.factory.annotation.Value("${aman.security.trusted-proxies:}")
    private String trustedProxies;

    public SecurityConfig(JwtTokenProvider tokenProvider, TokenBlacklistRepository blacklistRepository) {
        this.tokenProvider = tokenProvider;
        this.blacklistRepository = blacklistRepository;
    }

    @javax.annotation.PostConstruct
    public void initTrustedProxies() {
        kr.co.kfs.aman.util.SecurityUtil.setTrustedProxies(trustedProxies);
    }



    @Bean
    public PasswordEncoder passwordEncoder() {
        // 개발 시 비밀번호 평문 비교 요구사항 반영
        return NoOpPasswordEncoder.getInstance();
    }

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .httpBasic().disable()
            .csrf().disable()
            .cors().and()
            .headers().frameOptions().disable().and()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            .and()
            .authorizeRequests()
                // /admin 하위 경로는 모두 JWT 인증 필요.
                // (이전에는 Accept: text/html 요청을 예외로 두어 헤더 하나로 우회가 가능했음.
                //  비로그인 브라우저 새로고침은 아래 entry point 에서 SPA index.html 로 보낸다.)
                .requestMatchers(request -> request.getRequestURI().contains("/admin/")).authenticated()
                // 문서 편집용 쓰기 API (/folder, /content) 는 조회(GET) 외 모두 인증 필요
                .antMatchers(HttpMethod.POST, "/folder", "/folder/**", "/content", "/content/**").authenticated()
                .antMatchers(HttpMethod.PUT, "/folder", "/folder/**", "/content", "/content/**").authenticated()
                .antMatchers(HttpMethod.PATCH, "/folder", "/folder/**", "/content", "/content/**").authenticated()
                .antMatchers(HttpMethod.DELETE, "/folder", "/folder/**", "/content", "/content/**").authenticated()
                // 그 외 모든 요청(일반 도움말, static 자원, /health, /history 등)은 접근 허용
                .anyRequest().permitAll()
            .and()
            .exceptionHandling()
                .authenticationEntryPoint((request, response, authException) -> {
                    String accept = request.getHeader("Accept");
                    boolean isHtmlGet = "GET".equalsIgnoreCase(request.getMethod())
                            && accept != null && accept.contains("text/html");
                    if (isHtmlGet) {
                        // 비로그인 상태의 /admin 화면 새로고침: SPA 를 내려주고 프론트에서 로그인으로 이동
                        request.getRequestDispatcher("/index.html").forward(request, response);
                    } else {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied");
                    }
                })
            .and()
            .addFilterBefore(new JwtAuthenticationFilter(tokenProvider, blacklistRepository), UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(new ErpTokenValidationFilter(erpCheckEnabled, internalIpEnabled, internalIps), JwtAuthenticationFilter.class);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(java.util.Arrays.asList(
            "http://localhost:8080", 
            "http://localhost:5173",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:5173"
        ));
        configuration.setAllowedMethods(java.util.Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-Handshake-Block"));
        configuration.setExposedHeaders(java.util.Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
