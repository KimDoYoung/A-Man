package kr.co.kfs.aman.config;

import kr.co.kfs.aman.model.User;
import kr.co.kfs.aman.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * 신규 인스턴스 초기 관리자 계정 생성 (docs/multi-instance-설계.md 3.6)
 * users 테이블이 비어 있을 때만 1회 admin 계정을 만든다. 기존 데이터가 있으면 아무것도 하지 않는다.
 */
@Component
public class InitialAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InitialAdminRunner.class);

    private final UserRepository userRepository;

    @Value("${aman.init.admin-username:admin}")
    private String adminUsername;

    @Value("${aman.init.admin-password:1111}")
    private String adminPassword;

    @Value("${aman.init.admin-email:admin@aman.local}")
    private String adminEmail;

    public InitialAdminRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        // PasswordEncoder가 NoOp(평문 비교)이므로 평문으로 저장 (SecurityConfig 참조)
        User admin = User.builder()
                .username(adminUsername)
                .password(adminPassword)
                .email(adminEmail)
                .name("관리자")
                .role("admin")
                .isActive(1)
                .build();
        userRepository.save(admin);
        log.warn("사용자가 없어 초기 관리자 계정({})을 생성했습니다. 로그인 후 비밀번호를 반드시 변경하세요.", adminUsername);
    }
}
