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
                // /health 및 정적 이미지 경로 등 Free Pass 설정
                .antMatchers("/health", "/images/**", "/auth/**", "/docs/**").permitAll()
                // 그 외 모든 /admin, /user, /content 등의 API는 인증 필요
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(new JwtAuthenticationFilter(tokenProvider, blacklistRepository), UsernamePasswordAuthenticationFilter.class);
    }
}
