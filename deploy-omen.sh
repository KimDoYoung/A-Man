#!/usr/bin/env bash
#============================================================================
# deploy-omen.sh - A-Man 프로젝트 OMEN Docker 배포 스크립트
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

# OMEN 도커 배포 대상 디렉토리 설정
DOCKER_COMPOSE_DIR="/data/docker"
TARGET_BASE_DIR="/data/docker/aman"
TARGET_WEBAPPS_DIR="$TARGET_BASE_DIR/webapps"
TARGET_WAR_FILE="$TARGET_WEBAPPS_DIR/aman.war"
TARGET_DB_DIR="$TARGET_BASE_DIR/db"
TARGET_DB_FILE="$TARGET_DB_DIR/aman.db"

# ── 옵션 인자 처리 ─────────────────────────────────────────────────────────
INIT_DB=false
for arg in "$@"; do
  case $arg in
    --init-db)
      INIT_DB=true
      shift
      ;;
  esac
done

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

header "A-Man OMEN Docker 배포 스크립트 (버전: $VERSION)"
info "배포 대상: ${BOLD}$TARGET_WAR_FILE${NC}"
if [ "$INIT_DB" = true ]; then
    warn "옵션 감지: 데이터베이스 초기화(--init-db)가 실행됩니다."
fi
echo ""

read -r -p "빌드 및 배포를 진행하시겠습니까? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    info "작업이 취소되었습니다."
    exit 0
fi

# ── 2. 배포 대상 디렉토리 확인 및 생성 ─────────────────────────────────────
header "Step 1: OMEN 호스트 디렉토리 준비"
mkdir -p "$TARGET_WEBAPPS_DIR" \
         "$TARGET_DB_DIR" \
         "$TARGET_BASE_DIR/logs" \
         "$TARGET_BASE_DIR/data/images" \
         "$TARGET_BASE_DIR/data/video" \
         "$TARGET_BASE_DIR/backup"
info "호스트 디렉토리 생성/확인 완료: $TARGET_BASE_DIR"

# DB 초기화 또는 생성 확인
if [ "$INIT_DB" = true ]; then
    warn "데이터베이스를 초기화합니다: $TARGET_DB_FILE"
    rm -f "$TARGET_DB_FILE"
    if [ -f "$PROJECT_ROOT/sqls/aman_ddl.sql" ]; then
        sqlite3 "$TARGET_DB_FILE" < "$PROJECT_ROOT/sqls/aman_ddl.sql"
        if [ -f "$PROJECT_ROOT/sqls/aman_test_data.sql" ]; then
            sqlite3 "$TARGET_DB_FILE" < "$PROJECT_ROOT/sqls/aman_test_data.sql"
        fi
        info "DB 스키마 및 초기 데이터 구성 완료."
    else
        warn "초기화용 SQL 파일($PROJECT_ROOT/sqls/aman_ddl.sql)을 찾을 수 없습니다."
    fi
elif [ ! -f "$TARGET_DB_FILE" ]; then
    warn "DB 파일이 존재하지 않습니다: $TARGET_DB_FILE"
    read -r -p "기본 DDL을 실행하여 신규 DB를 생성하시겠습니까? (y/N) " INIT_CONFIRM
    if [[ "$INIT_CONFIRM" == "y" || "$INIT_CONFIRM" == "Y" ]]; then
        if [ -f "$PROJECT_ROOT/sqls/aman_ddl.sql" ]; then
            sqlite3 "$TARGET_DB_FILE" < "$PROJECT_ROOT/sqls/aman_ddl.sql"
            if [ -f "$PROJECT_ROOT/sqls/aman_test_data.sql" ]; then
                sqlite3 "$TARGET_DB_FILE" < "$PROJECT_ROOT/sqls/aman_test_data.sql"
            fi
            info "신규 DB 생성 완료: $TARGET_DB_FILE"
        fi
    fi
fi

# ── 3. 프론트엔드 빌드 및 복사 ────────────────────────────────────────────────
header "Step 2: 프론트엔드 빌드 및 리소스 복사"

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

# ── 4. 백엔드 빌드 및 WAR 생성 ──────────────────────────────────────────────
header "Step 3: 백엔드 빌드 및 WAR 패키징"

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

info "WAR 파일 생성 성공: $WAR_FILE ($(du -h "$WAR_FILE" | cut -f1))"

# ── 5. 타겟 디렉토리로 복사 ─────────────────────────────────────────────────
header "Step 4: 도커 볼륨 경로로 aman.war 복사"

info "WAR 파일 복사 중 -> $TARGET_WAR_FILE"
cp -f "$WAR_FILE" "$TARGET_WAR_FILE"

header "빌드 및 배포 완료!"
info "요약 정보:"
echo -e "  - 생성된 WAR : ${BOLD}$WAR_FILE${NC}"
echo -e "  - 복사된 경로 : ${BOLD}$TARGET_WAR_FILE${NC}"
echo -e "  - SQLite DB  : ${BOLD}$TARGET_DB_FILE${NC}"
echo ""
info "컨테이너에 반영하려면 아래 명령어를 실행하세요:"
echo -e "  ${BOLD}cd $DOCKER_COMPOSE_DIR && docker compose restart aman-tomcat${NC}"
echo ""
read -r -p "지금 aman-tomcat 컨테이너를 재시작하시겠습니까? (y/N) " RESTART_CONFIRM
if [[ "$RESTART_CONFIRM" == "y" || "$RESTART_CONFIRM" == "Y" ]]; then
    info "aman-tomcat 컨테이너 재시작 중..."
    (cd "$DOCKER_COMPOSE_DIR" && docker compose restart aman-tomcat)
    info "재시작 완료! 로그 확인: docker compose logs -f aman-tomcat"
fi
