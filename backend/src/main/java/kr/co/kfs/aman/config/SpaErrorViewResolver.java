package kr.co.kfs.aman.config;

import org.springframework.boot.autoconfigure.web.servlet.error.ErrorViewResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

@Component
public class SpaErrorViewResolver implements ErrorViewResolver {

    @Override
    public ModelAndView resolveErrorView(HttpServletRequest request, HttpStatus status, Map<String, Object> model) {
        if (status == HttpStatus.NOT_FOUND) {
            String accept = request.getHeader("Accept");
            String requestedWith = request.getHeader("X-Requested-With");

            // API 요청(JSON 또는 AJAX)인 경우 404 JSON 응답 유지
            if ((accept != null && accept.contains("application/json")) || "XMLHttpRequest".equals(requestedWith)) {
                return null;
            }

            String servletPath = request.getServletPath();
            if (servletPath != null && servletPath.contains(".")) {
                // 확장자가 있는 정적 리소스 요청(.js, .css, .png 등)은 포워딩 제외
                return null;
            }

            // 웹 브라우저의 SPA 경로 탐색 및 새로고침 요청은 index.html로 포워딩하여 200 OK 처리
            return new ModelAndView("forward:/index.html", HttpStatus.OK);
        }
        return null;
    }
}
