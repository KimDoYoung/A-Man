#!/usr/bin/env bash
#============================================================================
# deploy/lib.sh - deploy.sh 공통 함수 (docs/deploy-통합-설계.md)
#   deploy.sh에서 source 하여 사용한다. 단독 실행하지 않는다.
#============================================================================

# ── 색상 / 출력 ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
header()  { echo -e "\n${CYAN}${BOLD}══ $* ══${NC}\n"; }
die()     { error "$*"; exit 1; }

# y/Y 일 때만 0 반환
ask_yes() {
    local answer
    read -r -p "$1 (y/N) " answer
    [[ "$answer" == "y" || "$answer" == "Y" ]]
}

# ── 경로 ──────────────────────────────────────────────────────────────────
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
RESOURCES_DIR="$BACKEND_DIR/src/main/resources"
STATIC_DIR="$RESOURCES_DIR/static"

# ── 프로퍼티 읽기 ─────────────────────────────────────────────────────────
# read_prop <파일> <키> : 값이 없으면 빈 문자열 (set -e 환경에서도 실패로 종료되지 않음)
read_prop() {
    { grep "^$2=" "$1" 2>/dev/null || true; } | head -n 1 | cut -d '=' -f2- | tr -d '\r' | xargs
}

app_version() {
    local v
    v="$(read_prop "$RESOURCES_DIR/application.properties" 'spring.application.version')"
    echo "${v:-1.0.0}"
}

# ── Java 8 검사 ───────────────────────────────────────────────────────────
check_java_version() {
    command -v java &>/dev/null || die "Java 명령어를 찾을 수 없습니다. Java 8 (1.8) 설치가 필요합니다."

    local raw_ver ver_str major_ver=""
    raw_ver=$(java -version 2>&1 | head -n 1)
    ver_str=$(echo "$raw_ver" | sed -E 's/.*version "([^"]+)".*/\1/')
    if [[ "$ver_str" =~ ^1\.([0-9]+) ]]; then
        major_ver="${BASH_REMATCH[1]}"
    elif [[ "$ver_str" =~ ^([0-9]+) ]]; then
        major_ver="${BASH_REMATCH[1]}"
    fi

    if [[ "$major_ver" != "8" ]]; then
        echo ""
        error "Java 버전 오류: 작업을 중지합니다."
        warn "현재 감지된 Java 버전 : ${BOLD}${ver_str:-$raw_ver}${NC}"
        warn "요구되는 Java 버전   : ${BOLD}Java 8 (1.8)${NC}"
        warn "Java 8로 버전을 변경(JAVA_HOME/PATH 설정)한 후 다시 시도해 주세요."
        echo ""
        exit 1
    fi
}

# ── WAR 이름 / 인스턴스 ───────────────────────────────────────────────────
# "aman20" 또는 "aman20.war" → "aman20"
normalize_instance() {
    local name="${1:-aman}"
    echo "${name%.war}"
}

# is_allowed_war <인스턴스> "<허용 목록>"
is_allowed_war() {
    local w
    for w in $2; do
        [[ "$w" == "$1" ]] && return 0
    done
    return 1
}

# ── base-dir 계산 (InstanceEnvironmentListener와 같은 규칙) ─────────────────
#  - aman: application-<profile>.properties 의 aman.base-dir
#  - 그 외: aman.instances.<이름>.base-dir, 없으면 aman.base-dir의 형제 폴더
# resolve_base_dir <profile> <인스턴스>
resolve_base_dir() {
    local prop_file="$RESOURCES_DIR/application-$1.properties"
    local instance="$2"
    local default_base override

    [ -f "$prop_file" ] || die "프로필 설정 파일이 없습니다: $prop_file"
    default_base="$(read_prop "$prop_file" 'aman.base-dir')"
    [ -n "$default_base" ] || die "aman.base-dir 이 정의되어 있지 않습니다: $prop_file"

    if [[ "$instance" == "aman" ]]; then
        echo "$default_base"
        return
    fi
    override="$(read_prop "$prop_file" "aman.instances.${instance}.base-dir")"
    echo "${override:-$(dirname "$default_base")/${instance}}"
}

# ── 빌드 ──────────────────────────────────────────────────────────────────
# build_war <인스턴스> : 프론트(VITE_BASE=/<인스턴스>/) + 백엔드 WAR 빌드, 결과를 WAR_FILE에 설정
# npm/gradle이 표준입력을 소비하지 않도록 </dev/null 로 실행한다.
build_war() {
    local instance="$1"
    local vite_base="/${instance}/"

    header "빌드 1/2: 프론트엔드 (VITE_BASE=${vite_base})"
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
        warn "node_modules 폴더가 없어 패키지를 설치합니다 (npm install)..."
        npm install </dev/null
    fi
    VITE_BASE="$vite_base" npm run build </dev/null

    info "Spring Boot static 디렉토리 초기화 및 빌드 리소스 복사..."
    rm -rf "$STATIC_DIR"
    cp -r "$FRONTEND_DIR/dist" "$STATIC_DIR"

    header "빌드 2/2: 백엔드 WAR (gradlew clean bootWar)"
    cd "$BACKEND_DIR"
    chmod +x gradlew
    ./gradlew clean </dev/null
    ./gradlew bootWar -x test </dev/null

    WAR_FILE="$BACKEND_DIR/build/libs/aman.war"
    [ -f "$WAR_FILE" ] || die "WAR 파일 생성에 실패했습니다: $WAR_FILE"
    info "WAR 생성 완료: ${BOLD}$WAR_FILE${NC} ($(du -h "$WAR_FILE" | cut -f1))"
    cd "$PROJECT_ROOT"
}
