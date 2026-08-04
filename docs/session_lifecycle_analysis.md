# A-Man 세션 인증 속성(`AMAN_ERP_AUTHENTICATED`) 생명주기 분석서 (session_lifecycle_analysis.md)

이 문서는 A-Man 서버의 WAS(Tomcat) 세션에 저장되는 `AMAN_ERP_AUTHENTICATED=true` 값의 소멸 조건과 생명주기(Lifecycle)에 대해 분석한 보고서입니다.

---

## 1. Goal Description (목표 및 배경)
A-Man 도움말 시스템의 보안 세션 속성인 `AMAN_ERP_AUTHENTICATED`가 WAS 메모리에서 언제 소멸되는지 명확히 분석하여, 보안 취약점 예방 및 적절한 세션 관리 전략을 수립합니다.

---

## 2. 세션 속성(`AMAN_ERP_AUTHENTICATED`) 소멸 조건 (4가지)

`AMAN_ERP_AUTHENTICATED`는 A-Man 백엔드의 **`HttpSession` 객체 내에 세션 어트리뷰트(Attribute)**로 저장되므로, Java Servlet 스펙 및 Tomcat WAS의 세션 관리 규칙을 그대로 따릅니다. 구체적인 소멸 시점은 다음과 같이 4가지 경우입니다.

### ① 세션 만료 시간 초과 (Session Timeout) - [가장 일반적인 소멸 원인]
* **설명**: 사용자가 A-Man 도움말 화면을 열어둔 상태로 아무런 추가 요청(페이지 이동, 스크롤 트리거 등)을 보내지 않고 설정된 시간이 지나면 WAS가 세션을 자동으로 파기합니다.
* **소멸 시점**:
  - Spring Boot 및 Tomcat의 기본 세션 만료 시간인 **30분(30 minutes)** 동안 아무 활동이 없을 때 소멸합니다.
  - (A-Man 설정 파일에 명시되어 있지 않으므로 기본값 30분이 적용됨)

### ② 브라우저 종료 (Browser Closing) - [클라이언트 측 무효화]
* **설명**: 사용자가 브라우저(또는 해당 도움말 팝업 창 및 전체 브라우저)를 완전히 닫으면 브라우저 메모리에 유지되던 **`JSESSIONID` 세션 쿠키**가 파기됩니다.
* **소멸 시점**: 
  - 브라우저를 닫는 즉시 클라이언트 브라우저에서 쿠키가 제거되므로, 다시 브라우저를 켜고 접속할 때는 이전 세션에 접근할 수 없어 **사실상 즉시 소멸**하는 효과를 냅니다.
  - (단, WAS 서버 메모리 상에는 여전히 세션 객체가 남아있다가 설정된 Timeout 시간이 지나야 실제 메모리에서 파기됩니다.)

### ③ 프로그램에 의한 명시적 세션 파기 (Session Invalidation)
* **설명**: 백엔드 소스코드 내에서 `session.invalidate()` 메서드를 직접 호출하여 세션을 명시적으로 날리는 경우입니다.
* **소멸 시점**: 해당 API 호출이 완료되는 즉시 소멸합니다.
* **A-Man 현황**: 현재 A-Man 백엔드의 어드민 로그아웃 또는 세션 제어 API 호출 시 세션 파기 로직이 수행될 때 함께 소멸합니다.

### ④ WAS (Tomcat) 재기동 및 메모리 초기화
* **설명**: WAS 서버가 재배포, 서버 점검, 장애 등으로 인해 재기동(Restart)되거나 정지(Shutdown)되는 경우입니다.
* **소멸 시점**:
  - Tomcat 메모리에 올라가 있던 모든 세션 정보가 지워지므로 서버가 재시작되는 순간 모든 임직원의 `AMAN_ERP_AUTHENTICATED` 인증 속성이 소멸하여 재인증이 필요해집니다.

---

## 3. 세션 타임아웃 세부 제어안 (선택 제안)
필요에 따라 사외망 사용자가 도움말 창을 오랫동안 띄워두어 발생할 수 있는 보안 리스크를 최소화하기 위해 세션 유지 시간을 축소 조정할 수 있습니다.

* 설정 파일: [`backend/src/main/resources/application.properties`](file:///home/kdy987/work/aman/backend/src/main/resources/application.properties)
* 설정 예시 (예: 10분 설정):
  ```properties
  # 세션 타임아웃을 10분으로 변경
  server.servlet.session.timeout=10m
  ```
  
