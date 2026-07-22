# A-Man

## 개요

- 프로젝트명 : A-Man
- 개발시작 : 2026.06.22~
- AssetERP를 위한 매뉴얼 시스템 
- 일반 사용자들에게 AssetERP에 대한 매뉴얼을 웹페이지로 제공
- 문서 사용자들(한국펀드서비스 직원)이 매뉴얼 작성 가능

## 기술 스택

- backend : springboot 2.x
- frontend : react
- db : sqlite
- 최종 결과물 : aman.war로 tomcat8.5에 배포
- docs/설계.md 참조

## folder 구조

- backend : 백엔드 소스
- frontend : 프런트앤드 소스
- docs : 문서
- sqls : aman.sql(테이블 및 index DDL) 

## 명령어들

- bm.sh : backend run, lint 등 
- fm.sh : frontend run, lint 등
- db.sh : db조회 등
  - db.sh init 로 초기화 데이터를 만들 수 있다.
  - 이때 sqls/aman_ddl.sql과 aman_test_data.sql을 수행한다.
- deploy-jskn.sh : jskn서버에서 war생성 및 서버에 배포
  - http://jskn.iptime.org/aman 으로 접속



## API

  • 시큐리티 설정: SecurityConfig.java
  • 리소스 라우팅 설정: WebMvcConfig.java
  • 문서 관리 컨트롤러: ContentController.java
  • 회원 관리 컨트롤러: UserController.java
  • 인증 관리 컨트롤러: AuthController.java


## 배포

- deploy-119.sh (git에 없음)
  - aview 서버에 배포 스크립트
  - aview 서버에 접속, tomcat/webapps에 aman.war로 복사

## 백업

- 백업은 
