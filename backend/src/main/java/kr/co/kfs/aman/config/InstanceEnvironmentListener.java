package kr.co.kfs.aman.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.boot.context.event.SpringApplicationEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * 멀티 인스턴스 지원: WAR 컨텍스트 경로(aman, aman20 ...)로 인스턴스를 식별하고
 * 인스턴스별 base-dir을 결정한다. (docs/multi-instance-설계.md 3.1 참조)
 *
 * - 설정 파일 로딩(ConfigFileApplicationListener, HIGHEST+10) 이후,
 *   로깅 초기화(LoggingApplicationListener, HIGHEST+20) 이전에 실행되어야
 *   logback의 BASE_DIR까지 인스턴스별 경로를 따른다.
 * - 기본 인스턴스(aman)는 기존 base-dir을 그대로 사용한다.
 */
public class InstanceEnvironmentListener implements ApplicationListener<SpringApplicationEvent>, Ordered {

    public static final String DEFAULT_INSTANCE = "aman";
    public static final String INSTANCE_PROPERTY = "aman.instance";

    private static final String BASE_DIR_PROPERTY = "aman.base-dir";
    private static final String PROPERTY_SOURCE_NAME = "amanInstance";
    private static final Logger log = LoggerFactory.getLogger(InstanceEnvironmentListener.class);

    private final String instance;

    public InstanceEnvironmentListener(String contextPath) {
        this.instance = toInstanceName(contextPath);
    }

    /** 컨텍스트 경로("/aman20")를 인스턴스 이름("aman20")으로 변환한다. ROOT("")·null은 기본 인스턴스. */
    public static String toInstanceName(String contextPath) {
        if (contextPath == null) {
            return DEFAULT_INSTANCE;
        }
        String name = contextPath.trim();
        while (name.startsWith("/")) {
            name = name.substring(1);
        }
        return name.isEmpty() ? DEFAULT_INSTANCE : name;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 15;
    }

    @Override
    public void onApplicationEvent(SpringApplicationEvent event) {
        if (event instanceof ApplicationEnvironmentPreparedEvent) {
            applyInstance(((ApplicationEnvironmentPreparedEvent) event).getEnvironment());
        } else if (event instanceof ApplicationStartedEvent) {
            ConfigurableEnvironment env = ((ApplicationStartedEvent) event).getApplicationContext().getEnvironment();
            log.info("A-Man instance={}, base-dir={}", instance, env.getProperty(BASE_DIR_PROPERTY));
        }
    }

    private void applyInstance(ConfigurableEnvironment env) {
        Map<String, Object> props = new HashMap<>();
        props.put(INSTANCE_PROPERTY, instance);

        if (!DEFAULT_INSTANCE.equals(instance)) {
            String baseDir = resolveInstanceBaseDir(env);
            if (baseDir != null) {
                props.put(BASE_DIR_PROPERTY, baseDir);
            }
        }
        env.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, props));

        createDirectories(env);
    }

    /**
     * 기본 인스턴스가 아닐 때의 base-dir.
     * 1) aman.instances.<이름>.base-dir 이 있으면 그 값
     * 2) 없으면 기존 aman.base-dir 의 형제 디렉터리 (/data/asseterp/aman → /data/asseterp/aman20)
     */
    private String resolveInstanceBaseDir(ConfigurableEnvironment env) {
        String override = env.getProperty("aman.instances." + instance + ".base-dir");
        if (override != null && !override.trim().isEmpty()) {
            return override.trim();
        }
        String original = env.getProperty(BASE_DIR_PROPERTY);
        if (original == null || original.trim().isEmpty()) {
            return null;
        }
        File parent = new File(original.trim()).getAbsoluteFile().getParentFile();
        return new File(parent, instance).getPath();
    }

    /** SQLite는 상위 디렉터리가 없으면 DB 파일을 만들지 못하므로 기동 전에 하위 폴더를 만든다. */
    private void createDirectories(ConfigurableEnvironment env) {
        String baseDir = env.getProperty(BASE_DIR_PROPERTY);
        if (baseDir == null || baseDir.trim().isEmpty()) {
            return;
        }
        String[] dirs = {
            env.getProperty("aman.db-dir", baseDir + "/db"),
            env.getProperty("aman.log-dir", baseDir + "/logs"),
            env.getProperty("aman.image-dir", baseDir + "/data/images"),
            env.getProperty("aman.video-dir", baseDir + "/data/video"),
            env.getProperty("aman.backup.dir", baseDir + "/backup")
        };
        for (String dir : dirs) {
            File f = new File(dir);
            if (!f.exists() && !f.mkdirs()) {
                log.warn("디렉터리를 생성할 수 없습니다: {}", f.getAbsolutePath());
            }
        }
    }
}
