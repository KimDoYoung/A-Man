#!/usr/bin/env bash
#============================================================================
# deploy-omen.sh - A-Man WAR 빌드 후 omen 호스트의 aman-tomcat 컨테이너에 배포
#   - docker-compose: /data/docker/docker-compose.yml (서비스: aman-tomcat)
#   - 컨테이너 환경: AMAN_MODE=omen → application-omen.properties 사용
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
# omen 도커 배포 대상 (aman-tomcat 볼륨: /data/docker/aman/webapps → /usr/local/tomcat/webapps)
DOCKER_COMPOSE_DIR="/data/docker"
CONTAINER_NAME="aman-tomcat"
TARGET_WEBAPPS_DIR="/data/docker/aman/webapps"
TARGET_WAR_NAME="${1:-aman.war}"
if [[ "$TARGET_WAR_NAME" != *.war ]]; then
    TARGET_WAR_NAME="${TARGET_WAR_NAME}.war"
fi
TARGET_WAR_FILE="$TARGET_WEBAPPS_DIR/$TARGET_WAR_NAME"

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

# ── omen 프로파일 존재 확인 ───────────────────────────────────────────────
if [ ! -f "$BACKEND_DIR/src/main/resources/application-omen.properties" ]; then
    error "application-omen.properties 파일이 없습니다. (AMAN_MODE=omen 으로 기동됨)"
    exit 1
fi

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
echo ""

read -r -p "최종 생성/복사할 파일이 '${TARGET_WAR_NAME}' 맞습니까? 빌드를 진행하시겠습니까? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    info "빌드 작업이 취소되었습니다."
    exit 0
fi

# ── 2. 프론트엔드 빌드 및 복사 ────────────────────────────────────────────────
header "Step 1: 프론트엔드 빌드 및 리소스 복사"

info "프론트엔드 디렉토리로 이동: $FRONTEND_DIR"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    warn "node_modules 폴더가 존재하지 않아 패키지를 설치합니다 (npm install)..."
    npm install
fi

info "React 프로덕션 빌드 실행 중..."
npm run build

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
./gradlew clean

info "배포용 WAR 생성 (gradlew bootWar)..."
./gradlew bootWar -x test

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

# ── 4. 타겟 디렉토리로 복사 ─────────────────────────────────────────────────
header "Step 3: aman-tomcat 볼륨 경로로 $TARGET_WAR_NAME 복사"

if [ ! -d "$TARGET_WEBAPPS_DIR" ]; then
    info "타겟 디렉토리가 존재하지 않아 생성합니다: $TARGET_WEBAPPS_DIR"
    mkdir -p "$TARGET_WEBAPPS_DIR"
fi

# 기존 WAR 백업 (덮어쓰기 전)
if [ -f "$TARGET_WAR_FILE" ]; then
    BACKUP_FILE="${TARGET_WAR_FILE}.bak"   # 직전 1개만 유지 (Tomcat은 .war만 배포)
    info "기존 WAR 백업 -> $BACKUP_FILE"
    mv -f "$TARGET_WAR_FILE" "$BACKUP_FILE"
fi

info "WAR 파일 복사 중 -> $TARGET_WAR_FILE"
cp -f "$WAR_FILE" "$TARGET_WAR_FILE"

header "빌드 및 복사 완료!"
info "요약 정보:"
echo -e "  - 생성된 WAR: ${BOLD}$WAR_FILE${NC}"
echo -e "  - 복사된 경로: ${BOLD}$TARGET_WAR_FILE${NC}"
echo ""
# ── 5. 컨테이너 재시작 (선택) ────────────────────────────────────────────────
read -r -p "${CONTAINER_NAME} 컨테이너를 지금 재시작하시겠습니까? (y/N) " RESTART
if [[ "$RESTART" == "y" || "$RESTART" == "Y" ]]; then
    header "Step 4: ${CONTAINER_NAME} 재시작"
    cd "$DOCKER_COMPOSE_DIR"
    # 기존 exploded 디렉토리 제거 → 새 WAR로 깨끗하게 재전개
    rm -rf "$TARGET_WEBAPPS_DIR/${TARGET_WAR_NAME%.war}"
    docker compose restart "$CONTAINER_NAME"
    info "재시작 완료. 로그 확인: ${BOLD}docker logs -f ${CONTAINER_NAME}${NC}"
    info "접속 주소: ${BOLD}http://omen:8686/${TARGET_WAR_NAME%.war}${NC}"
else
    info "${CONTAINER_NAME} 컨테이너에 반영하려면 아래 명령어를 실행하세요:"
    echo -e "  ${BOLD}cd ${DOCKER_COMPOSE_DIR} && docker compose restart ${CONTAINER_NAME}${NC}"
fi
