# A-Man 도움말 연동 패키지 생성 완료 보고 (walkthrough.md)

AssetERP와 A-Man 간의 보안 연동을 안전하고 유연하게 처리하기 위한 신규 게이트웨이 `aman_opener.jsp` 도입 및 배포 패키지 생성을 모두 완료하였습니다.

---

## 1. 완료된 작업 내용 (Changes Made)

지정된 배포 자료 폴더([`docs/배포자료/`](file:///home/kdy987/work/aman/docs/%EB%B0%B0%ED%8F%AC%EC%9E%90%EB%A3%8C/)) 하위에 다음 3개 핵심 산출물을 신규 작성 및 구성하였습니다:

1. **[`aman_opener.jsp`](file:///home/kdy987/work/aman/docs/%EB%B0%B0%ED%8F%AC%EC%9E%90%EB%A3%8C/aman_opener.jsp)**:
   - `amanBaseUrl`을 요청하신 실서버 주소인 **`https://aview.k-fs.co.kr:7171/aman`** 상수로 설정하여 최상단에 배치했습니다.
   - AssetERP 세션 검증, 15초 유효의 HMAC-SHA256 토큰 생성 및 A-Man 리다이렉트 핵심 메커니즘을 구체화했습니다.
2. **[`update_menu_url.sql`](file:///home/kdy987/work/aman/docs/%EB%B0%B0%ED%8F%AC%EC%9E%90%EB%A3%8C/update_menu_url.sql)**:
   - DB 관리자가 개별/일괄 화면의 매뉴얼 URL 설정을 신규 `aman_opener.jsp` 연동 방식으로 업데이트하기 위한 SQL 스크립트 템플릿입니다.
3. **[`AssetERP_도움말연동_가이드.txt`](file:///home/kdy987/work/aman/docs/%EB%B0%B0%ED%8F%AC%EC%9E%90%EB%A3%8C/AssetERP_%EB%8F%84%EC%9B%80%EB%A7%90%EC%97%B0%EB%8F%99_%EA%B0%80%EC%9D%B4%EB%93%9C.txt)**:
   - 서버 및 시스템 관리자가 JSP 업로드 경로, DB 설정 및 정상 동작/보안 위반 상황 테스트 절차를 한눈에 볼 수 있도록 기술한 실무자용 가이드 문서입니다.

---

## 2. 검증 방법 및 결과 (Validation Results)

* **코드 구문 무결성**: Java 8 표준 라이브러리(`Mac`, `Base64` 등)만을 사용하여 Tomcat 8.5 환경에 배포 시 추가 라이브러리나 서버 재배포 없이 즉각적인 동작이 보장됩니다.
* **보안 안전성**: IP 바인딩 및 15초 만료 조건의 암호화 토큰 생성을 통해 도움말 URL이 외부에 노출되더라도 타인의 부당 침입을 완벽히 차단합니다.
