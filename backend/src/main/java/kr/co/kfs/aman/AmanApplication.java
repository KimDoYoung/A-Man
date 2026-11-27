package kr.co.kfs.aman;

import kr.co.kfs.aman.config.InstanceEnvironmentListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableScheduling;

import javax.servlet.ServletContext;
import javax.servlet.ServletException;

@SpringBootApplication
@EnableScheduling
public class AmanApplication extends SpringBootServletInitializer {

    // WAR 배포 시 컨텍스트 경로(/aman, /aman20 ...) - 인스턴스 식별용 (docs/multi-instance-설계.md)
    private String contextPath;

    @Override
    public void onStartup(ServletContext servletContext) throws ServletException {
        this.contextPath = servletContext.getContextPath();
        super.onStartup(servletContext);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(AmanApplication.class)
                .listeners(new InstanceEnvironmentListener(contextPath));
    }

    public static void main(String[] args) {
        // 로컬 bootRun은 항상 기본 인스턴스(aman)로 동작
        SpringApplication app = new SpringApplication(AmanApplication.class);
        app.addListeners(new InstanceEnvironmentListener(null));
        app.run(args);
    }
}
