package kr.co.kfs.aman.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class PropertyConfig {

    @Bean
    public static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
        PropertySourcesPlaceholderConfigurer configurer = new PropertySourcesPlaceholderConfigurer();
        List<Resource> resources = new ArrayList<>();

        // 1. 공통 기본 설정 파일 로드 (application.properties)
        resources.add(new ClassPathResource("application.properties"));

        // 2. OS 환경변수 AMAN_MODE 읽기 (값이 없으면 기본값 'local'로 세팅)
        String mode = System.getenv("AMAN_MODE");
        if (mode == null || mode.trim().isEmpty()) {
            mode = "local"; 
        }

        // 3. 환경변수 값에 따른 프로퍼티 파일 결정 (예: application-local.properties)
        String targetPropertyFile = String.format("application-%s.properties", mode.toLowerCase());
        resources.add(new ClassPathResource(targetPropertyFile));

        configurer.setLocations(resources.toArray(new Resource[0]));
        // 파일이 없어도 에러를 내지 않고 통과하려면 true 설정 (필요에 따라 제어)
        configurer.setIgnoreResourceNotFound(false); 
        
        return configurer;
    }
}