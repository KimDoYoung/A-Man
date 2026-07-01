package kr.co.kfs.aman.config;

import kr.co.kfs.aman.repository.TokenBlacklistRepository;
import kr.co.kfs.aman.security.JwtAuthenticationFilter;
import kr.co.kfs.aman.security.JwtTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistRepository blacklistRepository;

    public SecurityConfig(JwtTokenProvider tokenProvider, TokenBlacklistRepository blacklistRepository) {
        this.tokenProvider = tokenProvider;
        this.blacklistRepository = blacklistRepository;
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
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeRequests()
                // /admin 하위 경로이되, 브라우저 새로고침(text/html)이 아닌 API 요청(JSON 등)에만 JWT 인증을 적용
                .requestMatchers(request -> {
                    String uri = request.getRequestURI();
                    String accept = request.getHeader("Accept");
                    boolean isAdminPath = uri.contains("/admin/");
                    boolean isHtmlRequest = accept != null && accept.contains("text/html");
                    return isAdminPath && !isHtmlRequest;
                }).authenticated()
                // 그 외 모든 요청(일반 도움말, static 자원, /health, /history 등)은 접근 허용
                .anyRequest().permitAll()
            .and()
            .addFilterBefore(new JwtAuthenticationFilter(tokenProvider, blacklistRepository), UsernamePasswordAuthenticationFilter.class);
    }
}
