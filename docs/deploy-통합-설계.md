# 배포 스크립트 통합 설계 (deploy-통합-설계.md)

서버별로 나뉜 배포 스크립트 5개를 `deploy.sh <host> [war-name]` 하나로 통합한다.
**최우선 목표는 119(운영) 배포에서 실수가 나지 않게 하는 것**이다.

브랜치: `feat/deploy-unify` (feat/multi-instance 기반)
관련: [multi-instance-설계.md](multi-instance-설계.md)

---

## 1. 현재 상태

| 스크립트 | 서버 | 프로필 | 방식 | 인스턴스(VITE_BASE) | git |
|---|---|---|---|---|---|
| `deploy-119.sh` | **119 (운영)** | `test` | 원격 Tomcat 8.5 (ssh/sftp) | 없음 (`aman` 고정) | **제외** (.gitignore) |
| `deploy-t3600.sh` | t3600 | `t3600` | 로컬 docker (gxt-demo) | 있음 | O |
| `deploy-omen.sh` | omen | `omen` | 로컬 docker (aman-tomcat) | 있음 | O |
| `deploy-dell6820.sh` | dell6820 | `dell6820` | 로컬 docker (gxt-demo) | 없음 | O |
| `deploy-jskn.sh` | jskn | `jskn` | 원격 docker 빌드 (sftp + `compose up --build`) | 없음 | O |

문제
- 약 1,100줄 중 절반 이상이 중복 (Java 8 검사, 버전 추출, 프론트 빌드, bootWar).
  → 이번 `VITE_BASE`처럼 한 가지를 바꾸려면 5곳을 고쳐야 하고, 실제로 3곳은 누락된 상태.
- 스크립트마다 매번 새로 빌드 → **t3600에서 검증한 WAR와 119에 올라가는 WAR가 다를 수 있다.**
- 119 배포 시 브랜치·미커밋 변경 검사 없음, 잘못된 WAR 이름 방지 없음.

---

## 2. 사용법 (목표)

```bash
./deploy.sh <host> [war-name] [옵션]

./deploy.sh t3600              # t3600에 aman.war
./deploy.sh t3600 aman20       # t3600에 aman20.war
./deploy.sh 119 aman20 --dry-run   # 실제 변경 없이 계획만 출력
./deploy.sh 119 aman20         # 119(운영)에 aman20.war
./deploy.sh --list             # 서버 목록과 허용 WAR 이름
```

- `war-name` 생략 시 `aman`. `.war` 확장자는 붙여도 되고 안 붙여도 된다.
- **서버마다 허용된 WAR 이름만 배포 가능** (`ALLOWED_WARS`). 그 외 이름은 즉시 거부.
  늘려야 하면 서버 설정 파일을 수정한다.

---

## 3. 구조

```
deploy.sh                      # 진입점: 인자 해석 → 설정 로드 → 검사 → 빌드 → 배포
deploy/
  lib.sh                       # 공통 함수 (출력, Java 검사, 버전, base-dir 계산, 빌드, WAR 검증)
  types/
    local-docker.sh            # t3600, omen, dell6820
    remote-tomcat.sh           # 119
    remote-docker.sh           # jskn
  hosts/
    t3600.conf
    omen.conf
    dell6820.conf
    jskn.conf
    119.conf                   # .gitignore (기존 deploy-119.sh 정책 유지)
    119.conf.example           # git 포함, 접속 정보만 비운 견본
```

### 3.1 서버 설정 파일 (`deploy/hosts/<host>.conf`)

bash 변수만 정의한다.

```bash
# 119.conf (예시)
HOST_LABEL="119 운영"
DEPLOY_TYPE="remote-tomcat"
PROFILE="test"                       # application-test.properties → base-dir 계산
PRODUCTION=true                      # 운영 안전장치 활성화 (4장)
ALLOWED_WARS="aman aman20"

REMOTE_USER="asseterp"
REMOTE_HOST="183.96.184.119"
REMOTE_WEBAPPS="/data/asseterp/tomcat/webapps"
```

```bash
# t3600.conf (예시)
HOST_LABEL="t3600 개발"
DEPLOY_TYPE="local-docker"
PROFILE="t3600"
PRODUCTION=false
ALLOWED_WARS="aman aman20"

COMPOSE_DIR="/data/docker"
CONTAINER="gxt-demo"
WEBAPPS_DIR="/data/docker/gxt-demo/webapps"
```

### 3.2 base-dir 계산 (공통)

앱의 `InstanceEnvironmentListener`와 같은 규칙. `deploy-t3600.sh`에 구현된 로직을 `lib.sh`로 옮긴다.

- `aman` → `application-<PROFILE>.properties`의 `aman.base-dir`
- 그 외 → `aman.instances.<이름>.base-dir`, 없으면 `aman.base-dir`의 형제 폴더

| 서버 | aman | aman20 |
|---|---|---|
| 119 (`test`) | `/data/asseterp/aman` | `/data/asseterp/aman20` |
| t3600 | `/data/asseterp/aman` | `/data/asseterp/aman20` |
| omen | `/data/docker/aman` | `/data/docker/aman20` |

### 3.3 빌드 산출물 분리 — "검증한 WAR를 그대로 배포"

빌드 결과를 이름 붙여 보관하고 배포는 그 파일로 한다.

```
build/dist/aman20-1.5.9-<커밋7자리>.war
build/dist/aman20-1.5.9-<커밋7자리>.info    # 커밋, 브랜치, VITE_BASE, 빌드 시각, 빌드 PC
```

- 같은 커밋·같은 인스턴스의 산출물이 이미 있으면 **재빌드하지 않고 재사용**한다.
  → t3600에 올려 확인한 바로 그 파일이 119에 올라간다.
- 미커밋 변경이 있는 상태의 빌드는 `-dirty`가 붙고, 운영 서버에는 배포할 수 없다.

### 3.4 WAR 검증 (배포 전, 공통)

| 검사 | 방법 | 실패 시 |
|---|---|---|
| 프론트 경로 | WAR 안 `static/index.html`의 asset 경로가 `/<인스턴스>/` | 중단 |
| 버전 | WAR 안 `application.properties`의 버전 = 소스 버전 | 중단 |
| Java 8 | WAR 안 `AmanApplication.class`의 class 버전 = 52 | 중단 |
| 크기 | 0이 아님, 이전 산출물과 크게 다르지 않음 | 경고 |

---

## 4. 운영(119) 안전장치 (`PRODUCTION=true`)

| # | 장치 | 내용 |
|---|---|---|
| 1 | 허용 WAR 이름 | `aman`, `aman20` 외 거부 |
| 2 | 소스 상태 검사 | 브랜치가 `main`이 아니거나 미커밋 변경이 있으면 중단 |
| 3 | 산출물 재사용 | 3.3 — 다른 서버에서 검증한 WAR를 그대로 사용 |
| 4 | WAR 검증 | 3.4 |
| 5 | 입력 확인 강화 | y/N 대신 **서버 이름 `119`와 WAR 이름을 직접 입력**해야 진행 |
| 6 | `--dry-run` | 업로드·교체 없이 대상 서버, 경로, WAR, 버전, 커밋만 출력 |
| 7 | 덮어쓰기 경고 | 서버에 같은 버전 파일(`aman20-1.5.9.war`)이 있으면 경고 후 재확인 |
| 8 | 배포 기록 | 로컬 `build/dist/deploy-history.log`에 일시, 서버, WAR, 버전, 커밋 기록 |

### 4.1 119 배포 절차 (remote-tomcat)

기존 `deploy-119.sh`의 방식을 그대로 유지한다. 인스턴스 이름만 일반화한다.

1. ssh 연결 공유 (비밀번호 1회 입력) — 기존 방식 유지
2. 원격 base-dir과 하위 폴더 준비 (`mkdir -p`, aman20 최초 배포 대비)
3. sftp 업로드: `<base-dir>/<인스턴스>-<버전>.war`
   - aman: `/data/asseterp/aman/aman-1.5.9.war` (기존과 동일)
   - aman20: `/data/asseterp/aman20/aman20-1.5.9.war`
4. webapps 반영 확인 질문 후, 임시 파일로 복사한 뒤 `mv`로 원자적 교체 → `<인스턴스>.war`
   (Tomcat은 `.war`가 아닌 임시 파일을 무시하므로 불완전한 WAR가 배포되지 않음)
5. 완료 안내: catalina.out 확인 명령, 접속 URL

### 4.2 롤백 (구현하지 않음 — 수동)

스크립트에 롤백 기능은 넣지 않는다. 사고 시 서버에 남아 있는 이전 버전 WAR로 손으로 교체한다.

```bash
# 예: 119의 aman20을 1.5.8로 되돌리기 (aman이면 경로·이름의 aman20 → aman)
cp /data/asseterp/aman20/aman20-1.5.8.war /data/asseterp/tomcat/webapps/.aman20.war.tmp
mv -f /data/asseterp/tomcat/webapps/.aman20.war.tmp /data/asseterp/tomcat/webapps/aman20.war
```

- 프로그램만 되돌아가며 DB 스키마·데이터는 그대로다. DB까지 필요하면 앱 백업(`backup/`)으로 별도 복구.
- 다른 인스턴스의 WAR를 쓰면 안 된다 (프론트 경로가 WAR에 고정됨).

### 4.3 aman20 최초 배포 시 주의

- 초기 admin 계정(`admin/1111`)이 자동 생성된다 → **배포 직후 비밀번호 변경 필수.** 스크립트가 최초 배포를 감지(원격 DB 파일 없음)하면 강하게 경고한다.
- 앞단 프록시가 `/aman/`만 전달하도록 되어 있다면 `/aman20/` 경로 추가 필요 (스크립트 범위 밖, 5장).

---

## 5. 확인 필요 / 범위 밖

| 항목 | 상태 |
|---|---|
| 119 프로필 | `test` 확정 |
| 119 앞단 프록시(nginx 등)에 `/aman20/` 전달 설정 필요 여부 | **미확인** |
| ERP `aman_opener.jsp`·메뉴 URL의 `/aman20` 대응 | 범위 밖 (ERP 측) |
| 운영 초기 admin 비밀번호 정책 (`aman.init.admin-password` 지정 여부) | 미결정 |
| `db.sh`를 `<host> <인스턴스>` 형태로 통합 | 미결정 (이번 범위 밖으로 두고 추후) |

---

## 6. 진행 단계

| 단계 | 내용 | 119 영향 |
|---|---|---|
| 1 | `deploy.sh`, `lib.sh`, `local-docker` 구현 → t3600, omen 이전 | 없음 |
| 2 | 산출물 분리(3.3)·WAR 검증(3.4)·`--dry-run` | 없음 |
| 3 | `remote-docker`(jskn), dell6820 이전 | 없음 |
| 4 | `remote-tomcat` 구현, `119.conf` 작성, **`--dry-run` 결과를 기존 `deploy-119.sh`와 대조** | 없음 |
| 5 | 119 실배포 1회 (aman, 같은 버전 재배포로 검증) → aman20 최초 배포 | **있음** |
| 6 | 기존 `deploy-*.sh` 제거 (`deploy-119.sh`는 5단계 성공 후) | — |

- 1~4단계 동안 기존 스크립트는 그대로 둔다. 언제든 이전 방식으로 배포 가능.
- 5단계 전에 **t3600 aman에서 기존 로그인 세션 유지 확인** (멀티 인스턴스의 쿠키 path 변경 영향).

---

## 7. 진행 현황

### 1단계 (2026-11-27) — t3600, omen

- 추가: `deploy.sh`, `deploy/lib.sh`, `deploy/types/local-docker.sh`, `deploy/hosts/{t3600,omen}.conf`
- 기존 `deploy-t3600.sh`, `deploy-omen.sh`의 동작을 그대로 옮김
  (Java 8 검사 → 확인 → 폴더 준비·재시작 질문 → `VITE_BASE` 빌드 → 중지 → exploded 삭제 → 복사 → 시작 → 기동 로그 대기)
- 변경점
  - omen: `docker compose stop/start` → `docker stop/start` (t3600과 통일, 컨테이너 이름 `aman-tomcat` 기준)
  - 서버 설정의 `EXPECTED_HOSTNAME`과 이 PC 호스트명이 다르면 경고 후 확인 (다른 PC 폴더에 잘못 복사 방지)
  - `PRODUCTION=true` 서버는 y/N 대신 서버 이름·WAR 이름 직접 입력 (4장 5번 선반영)
- 검증: 문법, `--list`, 허용 외 WAR 거부, 확인 단계까지 실제 실행, `build_war aman20` 실제 빌드(WAR 내 `/aman20/` 경로 확인),
  임시 경로 + 가짜 docker로 복사·재시작 경로 확인
- 기존 `deploy-t3600.sh`, `deploy-omen.sh`는 유지 (6단계에서 제거)
