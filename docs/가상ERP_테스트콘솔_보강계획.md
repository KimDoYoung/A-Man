# 가상 ERP 테스트 콘솔 보강 계획서 (가상ERP_테스트콘솔_보강계획.md)

이 계획서는 `aman-mock` 가상 ERP 테스트 페이지를 사용자 친화적인 대시보드 형태로 전면 개편하고, 실시간 토큰 확인, IP 확인, 세션 클리어 등 세부 기능 검증을 돕는 유틸리티를 추가하는 개발 계획을 명시합니다.

---

## 1. 보강 목표

1. **실시간 클라이언트 IP 정보 출력**: A-Man 백엔드에서 인식하는 접속자의 실제 IP(IPv4 또는 IPv6)를 획득하여 대시보드상에 실시간으로 표시합니다.
2. **토큰 URL 실시간 계산 및 조회**: 도움말 버튼 클릭 시 즉시 리다이렉트되지 않고, 생성된 보안 토큰 주소(`redirectUrl`)를 화면에 미리 보여주고 간편하게 복사할 수 있는 기능을 추가합니다.
3. **무상태 세션 초기화(로그아웃) 기능**: 세션을 수동으로 제거하기 위해 브라우저를 닫을 필요 없이, 클릭 한 번으로 A-Man 백엔드의 임시 인증 세션(`JSESSIONID`)을 강제 파괴하는 원클릭 세션 해제 기능을 제공합니다.
4. **검증 가이드라인 및 시나리오 시각화**: 화면상에서 직관적으로 검증 방법을 안내하여 보안성 테스트를 손쉽게 유도합니다.

---

## 2. 변경 내용 및 적용 상세

### [Component: A-Man Backend API]

#### [MODIFY] [`DocsController.java`](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/DocsController.java)
* 두 개의 디버그성 유틸리티 API 엔드포인트를 추가합니다:
  * `/docs/security/ip` : 클라이언트 IP 확인용
  * `/docs/security/logout` : 테스트 세션 강제 초기화용

```java
    @GetMapping("/security/ip")
    public ResponseEntity<?> getClientIp(HttpServletRequest request) {
        String ip = kr.co.kfs.aman.util.SecurityUtil.getClientIp(request);
        return ResponseEntity.ok(java.util.Collections.singletonMap("ip", ip));
    }

    @GetMapping("/security/logout")
    public ResponseEntity<?> forceLogout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok(java.util.Collections.singletonMap("success", true));
    }
```

* `ErpTokenValidationFilter`에서 `/security/ip` 및 `/security/logout`도 토큰 검증 예외 처리가 되도록 `/security/` 패턴을 안전하게 바이패스 설정합니다.

---

### [Component: Mock ERP]

#### [MODIFY] [`user_manual.jsp`](file:///home/kdy987/tomcat/apache-tomcat-8.5.100/webapps/aman-mock/user_manual.jsp) (및 `/home/kdy987/work/aman/mock-erp/user_manual.jsp`)
* `format=json` 파라미터가 들어올 경우 302 리다이렉트를 수행하지 않고, 계산된 `redirectUrl`을 JSON 포맷으로 직접 응답하도록 수정합니다.

```jsp
    String format = request.getParameter("format");
    if ("json".equalsIgnoreCase(format)) {
        response.setContentType("application/json; charset=UTF-8");
        out.println("{\"redirectUrl\": \"" + redirectUrl + "\"}");
        return;
    }
    
    response.sendRedirect(redirectUrl);
```

#### [MODIFY] [`index.html`](file:///home/kdy987/tomcat/apache-tomcat-8.5.100/webapps/aman-mock/index.html) (및 `/home/kdy987/work/aman/mock-erp/index.html`)
* 세련되고 입체적인 프리미엄 어두운 대시보드 스타일의 HTML을 구현합니다.
* 비동기 API 호출(`fetch`)을 통해 접속자 IP, 토큰 계산 URL을 로드합니다.
* **토큰 생성 및 복사**, **A-Man 세션 초기화(로그아웃)**, **새 팝업창 렌더링** 등의 원터치 제어반을 구현합니다.

---

## 3. 검증 계획

1. **IP 출력 검증**: `localhost:8080/aman-mock/index.html` 구동 시 본인의 로컬 IP가 `::1` 혹은 `127.0.0.1`로 정상 조회되는지 확인.
2. **토큰 URL 생성 및 복사**: "토큰 생성" 클릭 시 텍스트박스에 토큰 주소가 노출되고, 복사 기능이 정상 작동하는지 확인.
3. **세션 초기화 테스트**: 세션을 맺은 후 "세션 초기화" 버튼 클릭 시 즉시 403 Forbidden 상태로 격리되는지 검증.
