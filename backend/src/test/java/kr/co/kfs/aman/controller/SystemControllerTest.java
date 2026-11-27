package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.config.SystemSettings;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** /health 의 인스턴스 구분 표시 값 (docs/multi-instance-설계.md 3.7) */
class SystemControllerTest {

    private Map<String, Object> health(String instance, MockEnvironment env) {
        SystemSettings settings = mock(SystemSettings.class);
        when(settings.getOrDefault(anyString(), anyString())).thenAnswer(inv -> inv.getArgument(1));
        SystemController c = new SystemController(settings, env);
        ReflectionTestUtils.setField(c, "instance", instance);
        return c.health();
    }

    @Test
    void defaultInstanceKeepsAmanLabelAndNoColor() {
        Map<String, Object> h = health("aman", new MockEnvironment());
        assertEquals("aman", h.get("instance"));
        assertEquals("A-Man", h.get("instanceLabel"));
        assertNull(h.get("topbarColor"));
    }

    @Test
    void otherInstanceUsesConfiguredLabelAndColor() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("aman.instances.aman20.label", " 테스트용 ")
                .withProperty("aman.instances.aman20.topbar-color", "#9a3412");
        Map<String, Object> h = health("aman20", env);
        assertEquals("테스트용", h.get("instanceLabel"));
        assertEquals("#9a3412", h.get("topbarColor"));
    }

    @Test
    void labelDefaultsToInstanceName() {
        assertEquals("aman20", health("aman20", new MockEnvironment()).get("instanceLabel"));
    }

    @Test
    void invalidColorIsIgnored() {
        String[] bad = {"red", "#12", "#12345", "#9a3412;background:url(x)", "expression(alert(1))", ""};
        for (String c : bad) {
            MockEnvironment env = new MockEnvironment().withProperty("aman.instances.aman20.topbar-color", c);
            assertNull(health("aman20", env).get("topbarColor"), c);
        }
        for (String c : new String[] {"#abc", "#9A3412", "#9a3412cc"}) {
            MockEnvironment env = new MockEnvironment().withProperty("aman.instances.aman20.topbar-color", c);
            assertEquals(c, health("aman20", env).get("topbarColor"));
        }
    }
}
