package kr.co.kfs.aman.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${aman.base-dir:/home/kdy987/work/aman/aman-base-dir}")
    private String baseDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // /images/** 요청을 물리적 폴더인 ${baseDir}/data/images/ 로 라우팅 매핑
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:" + baseDir + "/data/images/");
    }
}
