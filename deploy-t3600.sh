#!/usr/bin/env bash
#============================================================================
# build-war.sh - A-Man 프로젝트 로컬 WAR 빌드 스크립트
#============================================================================

# 에러 발생 시 즉시 중단 및 정의되지 않은 변수 사용 시 에러 처리
set -euo pipefail

# ── 색상 정의 ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 유틸리티 함수 ─────────────────────────────────────────────────────────
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
header()  { echo -e "\n${CYAN}${BOLD}══ $* ══${NC}\n"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
STATIC_DIR="$BACKEND_DIR/src/main/resources/static"
# t3600 도커 배포 대상 (gxt-demo 컨테이너의 webapps 볼륨)
CONTAINER_NAME="gxt-demo"
TARGET_WEBAPPS_DIR="/data/docker/gxt-demo/webapps"
TARGET_WAR_NAME="${1:-aman.war}"
if [[ "$TARGET_WAR_NAME" != *.war ]]; then
    TARGET_WAR_NAME="${TARGET_WAR_NAME}.war"
fi
TARGET_WAR_FILE="$TARGET_WEBAPPS_DIR/$TARGET_WAR_NAME"
# 멀티 인스턴스: WAR 이름(aman20.war)이 곧 컨텍스트 경로(/aman20) - docs/multi-instance-설계.md 3.5
INSTANCE_NAME="${TARGET_WAR_NAME%.war}"
VITE_BASE="/${INSTANCE_NAME}/"

# ── Java 버전 체크 (Java 8 필수) ──────────────────────────────────────────
check_java_version() {
    if ! command -v java &>/dev/null; then
        error "Java 명령어를 찾을 수 없습니다. Java 8 (1.8) 설치가 필요합니다."
        exit 1
    fi

    local raw_ver
    raw_ver=$(java -version 2>&1 | head -n 1)
    local ver_str
    ver_str=$(echo "$raw_ver" | sed -E 's/.*version "([^"]+)".*/\1/')

    local major_ver=""
    if [[ "$ver_str" =~ ^1\.([0-9]+) ]]; then
        major_ver="${BASH_REMATCH[1]}"
    elif [[ "$ver_str" =~ ^([0-9]+) ]]; then
        major_ver="${BASH_REMATCH[1]}"
    fi

    if [[ "$major_ver" != "8" ]]; then
        echo ""
        error "Java 버전 오류: 빌드 작업을 중지합니다."
        warn "현재 감지된 Java 버전 : ${BOLD}${ver_str:-$raw_ver}${NC}"
        warn "요구되는 Java 버전   : ${BOLD}Java 8 (1.8)${NC}"
        warn "A-Man 빌드는 반드시 Java 8 환경에서 실행해야 합니다."
        warn "Java 8로 버전을 변경(JAVA_HOME/PATH 설정)한 후 다시 시도해 주세요."
        echo ""
        exit 1
    fi
}

check_java_version

# ── 1. 버전 정보 추출 ──────────────────────────────────────────────────────
PROP_FILE="$BACKEND_DIR/src/main/resources/application.properties"
if [ ! -f "$PROP_FILE" ]; then
    error "설정 파일이 존재하지 않습니다: $PROP_FILE"
    exit 1
fi

VERSION=$(grep '^spring.application.version=' "$PROP_FILE" | cut -d '=' -f2- | tr -d '\r\n[:space:]')
VERSION=${VERSION:-1.0.0}

header "A-Man WAR 빌드 스크립트 (버전: $VERSION)"
info "최종 배포 대상 WAR 파일: ${BOLD}$TARGET_WAR_FILE${NC}"
info "인스턴스: ${BOLD}${INSTANCE_NAME}${NC} (프론트 base: ${VITE_BASE})"
COMPOSE_FILE="/data/docker/docker-compose.yml"
if [[ "$INSTANCE_NAME" != "aman" ]] && [ -f "$COMPOSE_FILE" ] && ! grep -q "webapps/${TARGET_WAR_NAME}" "$COMPOSE_FILE"; then
    warn "docker-compose.yml에 ${TARGET_WAR_NAME} 및 데이터 디렉터리 마운트가 없습니다. (docs/multi-instance-설계.md 3.5)"
    warn "마운트 없이 배포하면 컨테이너가 WAR를 보지 못하거나, 데이터가 컨테이너 내부에만 저장됩니다."
fi
# 호스트에 WAR 파일이 없는 상태로 컨테이너를 만들면 Docker가 같은 이름의 빈 폴더(root 소유)를 만든다.
if [ -d "$TARGET_WAR_FILE" ]; then
    error "배포 대상이 파일이 아니라 폴더입니다: $TARGET_WAR_FILE"
    warn "WAR 파일이 없는 상태에서 컨테이너가 생성되어 Docker가 빈 폴더를 만든 것입니다. 아래 순서로 복구하세요."
    echo -e "  ${BOLD}cd /data/docker && docker compose stop ${CONTAINER_NAME}${NC}"
    echo -e "  ${BOLD}sudo rmdir ${TARGET_WAR_FILE}${NC}"
    echo -e "  ${BOLD}$0 ${INSTANCE_NAME}${NC}"
    echo -e "  ${BOLD}cd /data/docker && docker compose up -d --force-recreate ${CONTAINER_NAME}${NC}"
    exit 1
fi
echo ""

read -r -p "최종 생성/복사할 파일이 '${TARGET_WAR_NAME}' 맞습니까? 빌드를 진행하시겠습니까? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    info "빌드 작업이 취소되었습니다."
    exit 0
fi

# 재시작 여부는 빌드 전에 미리 묻는다 (빌드 도중 npm/gradle이 표준입력을 소비하는 문제 방지)
read -r -p "배포 후 ${CONTAINER_NAME} 컨테이너를 재시작하시겠습니까? (중지→복사→시작) (y/N) " RESTART
if [[ "$RESTART" == "y" || "$RESTART" == "Y" ]]; then
    DO_RESTART=true
else
    DO_RESTART=false
fi

# ── 2. 프론트엔드 빌드 및 복사 ────────────────────────────────────────────────
header "Step 1: 프론트엔드 빌드 및 리소스 복사"

info "프론트엔드 디렉토리로 이동: $FRONTEND_DIR"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    warn "node_modules 폴더가 존재하지 않아 패키지를 설치합니다 (npm install)..."
    npm install </dev/null
fi

info "React 프로덕션 빌드 실행 중..."
info "VITE_BASE=${VITE_BASE} 로 빌드합니다."
VITE_BASE="$VITE_BASE" npm run build </dev/null

info "Spring Boot static 디렉토리 초기화 및 빌드 리소스 복사..."
rm -rf "$STATIC_DIR"
cp -r "$FRONTEND_DIR/dist" "$STATIC_DIR"
info "프론트엔드 빌드 결과물 복사 완료: $STATIC_DIR"

# ── 3. 백엔드 빌드 및 WAR 생성 ──────────────────────────────────────────────
header "Step 2: 백엔드 빌드 및 WAR 패키징"

info "백엔드 디렉토리로 이동: $BACKEND_DIR"
cd "$BACKEND_DIR"

info "기존 빌드 산출물 제거 (gradlew clean)..."
chmod +x gradlew
./gradlew clean </dev/null

info "배포용 WAR 생성 (gradlew bootWar)..."
./gradlew bootWar -x test </dev/null

WAR_FILE="$BACKEND_DIR/build/libs/aman.war"
if [ ! -f "$WAR_FILE" ]; then
    error "WAR 파일 생성에 실패했습니다: $WAR_FILE"
    exit 1
fi

header "빌드 성공!"
info "생성된 WAR 파일 경로:"
echo -e "  - ${BOLD}$WAR_FILE${NC} ($(du -h "$WAR_FILE" | cut -f1))"
echo ""
info "필요한 경우 해당 파일을 원격 서버의 Tomcat webapps 경로에 수동으로 복사하여 사용할 수 있습니다."

info "WAR 파일 생성 성공: $WAR_FILE ($(du -h "$WAR_FILE" | cut -f1))"

# ── 4. 컨테이너 중지 (재시작 선택 시) ─────────────────────────────────────────
# 실행 중인 Tomcat은 WAR가 바뀌는 즉시 autoDeploy로 재배포를 시작한다.
# 그 도중에 exploded 디렉토리를 지우면 배포가 깨지므로, 먼저 중지한 뒤 교체한다.
if [ "$DO_RESTART" = true ]; then
    header "Step 3: ${CONTAINER_NAME} 중지"
    docker stop "$CONTAINER_NAME"
fi

# ── 5. 타겟 디렉토리로 복사 ─────────────────────────────────────────────────
header "Step 4: 도커 볼륨 경로로 $TARGET_WAR_NAME 복사"

if [ ! -d "$TARGET_WEBAPPS_DIR" ]; then
    info "타겟 디렉토리가 존재하지 않아 생성합니다: $TARGET_WEBAPPS_DIR"
    mkdir -p "$TARGET_WEBAPPS_DIR"
fi

if [ "$DO_RESTART" = true ]; then
    # 중지 상태에서 기존 exploded 디렉토리 제거 → 시작 시 새 WAR로 깨끗하게 전개
    info "기존 exploded 디렉토리 제거: $TARGET_WEBAPPS_DIR/${TARGET_WAR_NAME%.war}"
    rm -rf "$TARGET_WEBAPPS_DIR/${TARGET_WAR_NAME%.war}"
fi

info "WAR 파일 복사 중 -> $TARGET_WAR_FILE"
cp -f "$WAR_FILE" "$TARGET_WAR_FILE"

header "빌드 및 복사 완료!"
info "요약 정보:"
echo -e "  - 생성된 WAR: ${BOLD}$WAR_FILE${NC}"
echo -e "  - 복사된 경로: ${BOLD}$TARGET_WAR_FILE${NC}"
echo ""
# ── 6. 컨테이너 시작 (재시작 선택 시) ─────────────────────────────────────────
if [ "$DO_RESTART" = true ]; then
    header "Step 5: ${CONTAINER_NAME} 시작"
    START_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)   # 이번 기동 이후 로그만 확인
    docker start "$CONTAINER_NAME"

    # Tomcat 기동 완료 대기 (최대 120초)
    info "애플리케이션 기동 대기 중..."
    STARTED=false
    for _ in $(seq 1 40); do
        # pipefail 환경에서 grep -q 조기 종료(SIGPIPE)로 오판하지 않도록 변수에 담아 검사
        LOGS=$(docker logs --since "$START_TS" "$CONTAINER_NAME" 2>&1 || true)
        if [[ "$LOGS" == *"Server startup in"* ]]; then
            STARTED=true
            break
        fi
        sleep 3
    done

    if [ "$STARTED" = true ]; then
        info "기동 완료. 로그 확인: ${BOLD}docker logs -f ${CONTAINER_NAME}${NC}"
    else
        warn "120초 내에 기동 완료 로그를 확인하지 못했습니다. ${BOLD}docker logs -f ${CONTAINER_NAME}${NC} 로 확인하세요."
    fi
else
    warn "실행 중인 Tomcat이 autoDeploy로 새 WAR를 자동 재배포합니다."
    info "깨끗하게 재배포하려면 스크립트를 다시 실행해 재시작을 선택하거나, 아래 명령어를 실행하세요:"
    echo -e "  ${BOLD}docker stop ${CONTAINER_NAME} && rm -rf ${TARGET_WEBAPPS_DIR}/${TARGET_WAR_NAME%.war} && docker start ${CONTAINER_NAME}${NC}"
fi
