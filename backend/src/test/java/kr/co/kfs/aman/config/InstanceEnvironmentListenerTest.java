package kr.co.kfs.aman.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 멀티 인스턴스 base-dir 결정 규칙 검증 (docs/multi-instance-설계.md 3.1) */
class InstanceEnvironmentListenerTest {

    @TempDir
    File tempDir;

    private StandardEnvironment prepare(String contextPath, Map<String, Object> props) {
        StandardEnvironment env = new StandardEnvironment();
        // 프로필 설정 파일과 동일하게 파생 키는 ${aman.base-dir}를 참조
        props.put("aman.db-dir", "${aman.base-dir}/db");
        props.put("aman.db-name", "${aman.db-dir}/aman.db");
        props.put("spring.datasource.url", "jdbc:sqlite:${aman.db-name}");
        props.put("aman.backup.dir", "${aman.base-dir}/backup");
        env.getPropertySources().addLast(new MapPropertySource("profile", props));
        new InstanceEnvironmentListener(contextPath).onApplicationEvent(
                new ApplicationEnvironmentPreparedEvent(new SpringApplication(), new String[0], env));
        return env;
    }

    @Test
    void instanceName() {
        assertEquals("aman", InstanceEnvironmentListener.toInstanceName(null));
        assertEquals("aman", InstanceEnvironmentListener.toInstanceName(""));
        assertEquals("aman", InstanceEnvironmentListener.toInstanceName("/aman"));
        assertEquals("aman20", InstanceEnvironmentListener.toInstanceName("/aman20"));
    }

    @Test
    void defaultInstanceKeepsBaseDir() {
        String base = new File(tempDir, "aman").getPath();
        Map<String, Object> props = new HashMap<>();
        props.put("aman.base-dir", base);
        StandardEnvironment env = prepare("/aman", props);

        assertEquals("aman", env.getProperty("aman.instance"));
        assertEquals(base, env.getProperty("aman.base-dir"));
        assertEquals("jdbc:sqlite:" + base + "/db/aman.db", env.getProperty("spring.datasource.url"));
    }

    @Test
    void otherInstanceUsesSiblingDir() {
        Map<String, Object> props = new HashMap<>();
        props.put("aman.base-dir", new File(tempDir, "aman").getPath());
        StandardEnvironment env = prepare("/aman20", props);

        String expected = new File(tempDir, "aman20").getPath();
        assertEquals("aman20", env.getProperty("aman.instance"));
        assertEquals(expected, env.getProperty("aman.base-dir"));
        assertEquals("jdbc:sqlite:" + expected + "/db/aman.db", env.getProperty("spring.datasource.url"));
        assertTrue(new File(expected, "db").isDirectory());
        assertTrue(new File(expected, "backup").isDirectory());
    }

    @Test
    void explicitOverride() {
        String custom = new File(tempDir, "custom20").getPath();
        Map<String, Object> props = new HashMap<>();
        props.put("aman.base-dir", new File(tempDir, "aman").getPath());
        props.put("aman.instances.aman20.base-dir", custom);
        StandardEnvironment env = prepare("/aman20", props);

        assertEquals(custom, env.getProperty("aman.base-dir"));
        assertTrue(new File(custom, "db").isDirectory());
    }
}
