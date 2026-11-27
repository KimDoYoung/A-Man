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
- sqls : aman_ddl.sql(테이블 및 index DDL), aman_test_data.sql(초기 데이터: 메뉴·admin·자산)
- deploy : deploy.sh 의 공통 라이브러리(lib.sh), 배포 방식(types/), 서버 설정(hosts/), 빌드 결과물(artifacts/, git 제외)
- tools : 마크다운 변환 비교 도구

## 명령어들 (쉘 스크립트)

모두 프로젝트 루트에서 실행한다. 자세한 사용법은 각 스크립트의 `--help` 또는 인자 없이 실행.

| 스크립트 | 용도 | 자주 쓰는 예 |
|---|---|---|
| `bm.sh` | 백엔드(Spring Boot) 개발 관리 | `./bm.sh compile`, `./bm.sh lint`, `./bm.sh test`, `./bm.sh run` |
| `fm.sh` | 프론트엔드(React) 개발 관리 | `./fm.sh dev`, `./fm.sh lint`, `./fm.sh build` |
| `db.sh` | 로컬 SQLite DB 조회·초기화 | `./db.sh list`, `AMAN_MODE=t3600 AMAN_INSTANCE=aman20 ./db.sh runfile sqls/aman_test_data.sql` |
| `deploy.sh` | 빌드 + 서버 배포 (모든 서버 공통) | `./deploy.sh t3600 aman20`, `./deploy.sh 119 aman --dry-run`, `./deploy.sh --help` |
| `zip-upload-test.sh` | zip-upload API 호출 시험 | `./zip-upload-test.sh http://localhost:8686/aman 1234.zip` |
| `tools/run-md-tests.sh` | 백엔드(Java)·프론트(TS) 마크다운→HTML 변환 결과 비교 | `./tools/run-md-tests.sh` |
| `deploy-119.sh` | (git 제외) 예전 119 배포 스크립트. `deploy.sh 119` 실배포 검증 후 삭제 예정 | — |

### bm.sh (백엔드)
- `run` / `stop` / `status` / `log` : 개발 서버 실행·종료·상태·로그 (`AMAN_MODE` 기본 local)
- `compile` / `build` / `war` / `test` / `clean`
- `checkstyle` / `spotbugs` / `lint`(둘 다) : 정적 분석
- `generate-help` : 문서 사용자 도움말 HTML 생성

### fm.sh (프론트엔드)
- `dev`(=`run`) / `build` / `preview` / `test` / `install` / `lint` / `clean`

### db.sh (DB)
- 대상 DB: `AMAN_MODE`(프로필, 기본 local)의 base-dir + `AMAN_INSTANCE`(기본 aman)
  - 예) `AMAN_MODE=t3600 AMAN_INSTANCE=aman20` → `/data/asseterp/aman20/db/aman.db`
- `list` / `desc <테이블>` / `select <테이블>` / `run "<SQL>"` : 조회·SQL 실행
- `runfile <SQL파일>` : SQL 파일 실행 (실행 전 자동 백업). 새 인스턴스 초기 데이터(메뉴·admin·자산) 넣기에 사용
  - `sqls/aman_test_data.sql` 은 기존 사용자·문서·자산·메뉴를 **지우고** 초기 데이터로 바꾼다
- `backup` / `init`(DB 새로 생성) / `delete`
- `fetch` / `logs` : jskn 서버의 aman DB·로그 가져오기 (aman 인스턴스만)

### deploy.sh (배포)
- `./deploy.sh <서버> [WAR이름] [--dry-run] [--rebuild]` , `./deploy.sh --list`
- 서버: `t3600`, `omen`, `dell6820` (로컬 docker), `jskn` (원격 docker), `119` (운영 Tomcat)
  - 서버 설정: `deploy/hosts/<서버>.conf` (허용 WAR 이름 `ALLOWED_WARS`). `119.conf`는 git 제외, 견본 `119.conf.example`
- WAR 이름 = 접속 경로 = 독립 인스턴스: `aman.war` → `/aman`, `aman20.war` → `/aman20`
- 빌드 결과물은 `deploy/artifacts/`에 보관, 같은 커밋이면 재사용 (개발 서버에서 확인한 WAR 그대로 운영에 배포)
- **119(운영)**: main 브랜치·커밋 안 된 변경 없음일 때만, 서버 이름·WAR 이름 직접 입력. 먼저 `--dry-run`
- 설계: `docs/deploy-통합-설계.md`, 멀티 인스턴스: `docs/multi-instance-설계.md`


## API

  • 시큐리티 설정: SecurityConfig.java
  • 리소스 라우팅 설정: WebMvcConfig.java
  • 문서 관리 컨트롤러: ContentController.java
  • 회원 관리 컨트롤러: UserController.java
  • 인증 관리 컨트롤러: AuthController.java

## 업그레이드

- application.properties에 버젼이 있음.
- history.json 에 짧게 기술

## 배포

- `deploy.sh` 사용 (위 "명령어들" 참조, `./deploy.sh --help`)
- 119(aview 운영) 권장 순서
  1. 개발 서버(t3600)에 같은 커밋으로 배포해서 확인
  2. main 에 병합, 커밋 안 된 변경 없음
  3. `./deploy.sh 119 <aman|aman20> --dry-run` → 경로·서버 상태 확인
  4. `./deploy.sh 119 <aman|aman20>`
- 사고 시 수동 롤백: 서버의 `<base-dir>/<WAR이름>-<이전버전>.war` 를 webapps 에 임시 이름으로 복사 후 `mv`
  (`./deploy.sh --help` 의 remote-tomcat 설명 참조)

## zip-upload

- `POST /<컨텍스트>/zip-upload` (multipart `file=<aka>.zip`) : aka 문서의 제목·본문을 ZIP 내용으로 대체
- 허용 IP 에서만 동작 (`aman.zip-upload.*`), 시험은 `zip-upload-test.sh`
- 설계: `docs/zip-upload-설계.md`

## 백업

- 백업은 springboot 자체의 스케줄러에 의해서 동작한다.
- application-<profile>.properties에 스케줄정보 기술
- docs/백업.md 참조
- admin 사용자에 '백업관리' 메뉴 제공