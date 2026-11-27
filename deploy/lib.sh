#!/usr/bin/env bash
#============================================================================
# deploy/lib.sh - deploy.sh 공통 함수 (docs/deploy-통합-설계.md)
#   deploy.sh에서 source 하여 사용한다. 단독 실행하지 않는다.
#============================================================================

# ── 색상 / 출력 ───────────────────────────────────────────────────────────
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
NC=$'\033[0m'

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

# ── 소스 상태 (git) ───────────────────────────────────────────────────────
# GIT_COMMIT(7자리), GIT_BRANCH, GIT_DIRTY(true/false) 설정
# 빌드에 영향을 주는 frontend/, backend/ 아래의 변경(추적 파일 수정 + 추적 안 된 파일)만 본다.
load_git_info() {
    GIT_COMMIT="$(git -C "$PROJECT_ROOT" rev-parse --short=7 HEAD)"
    GIT_BRANCH="$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)"
    if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain -- frontend backend)" ]; then
        GIT_DIRTY=true
    else
        GIT_DIRTY=false
    fi
}

# ── 빌드 결과물 보관 (docs/deploy-통합-설계.md 3.3) ─────────────────────────
#   deploy/artifacts/<인스턴스>-<버전>-<커밋>[-dirty].war  + .info
#   backend/build 는 gradlew clean 으로 지워지므로 별도 폴더에 보관한다.
ARTIFACT_DIR="$PROJECT_ROOT/deploy/artifacts"
ARTIFACT_KEEP=5   # 인스턴스별 보관 개수

# artifact_path <인스턴스> <버전> <커밋> <dirty>
artifact_path() {
    local suffix=""
    [ "$4" = true ] && suffix="-dirty"
    echo "$ARTIFACT_DIR/$1-$2-$3${suffix}.war"
}

# info_value <info 파일> <키>
info_value() {
    { grep "^$2=" "$1" 2>/dev/null || true; } | head -n 1 | cut -d '=' -f2-
}

# 보관된 결과물이 재사용 가능한지 (파일과 info 존재, sha256 일치)
artifact_reusable() {
    local war="$1" info="${1%.war}.info" expected actual
    [ -f "$war" ] && [ -f "$info" ] || return 1
    expected="$(info_value "$info" sha256)"
    actual="$(sha256sum "$war" | cut -d ' ' -f1)"
    [ -n "$expected" ] && [ "$expected" = "$actual" ]
}

# save_artifact <빌드된 WAR> <대상 경로> <인스턴스> : WAR 복사 + info 작성
save_artifact() {
    local src="$1" dest="$2" instance="$3" info="${2%.war}.info"
    mkdir -p "$ARTIFACT_DIR"
    cp -f "$src" "$dest"
    {
        echo "instance=$instance"
        echo "version=$VERSION"
        echo "commit=$GIT_COMMIT"
        echo "branch=$GIT_BRANCH"
        echo "dirty=$GIT_DIRTY"
        echo "vite_base=/$instance/"
        echo "built_at=$(date '+%Y-%m-%d %H:%M:%S')"
        echo "built_host=$(hostname)"
        echo "sha256=$(sha256sum "$dest" | cut -d ' ' -f1)"
    } > "$info"
    info "결과물 보관: ${BOLD}$dest${NC}"
}

# prune_artifacts <인스턴스> : 인스턴스별로 최근 ARTIFACT_KEEP개만 남긴다.
prune_artifacts() {
    local f
    # shellcheck disable=SC2012
    ls -1t "$ARTIFACT_DIR/$1"-[0-9]*.war 2>/dev/null | tail -n +$((ARTIFACT_KEEP + 1)) | while read -r f; do
        rm -f "$f" "${f%.war}.info"
        info "오래된 결과물 삭제: $(basename "$f")"
    done
}

# ── WAR 검증 (docs/deploy-통합-설계.md 3.4) ─────────────────────────────────
# verify_war <WAR> <인스턴스> <버전> : 실패 항목이 있으면 1 반환
verify_war() {
    local war="$1" instance="$2" version="$3" ok=true
    local index war_version major size prev prev_size

    info "WAR 검증: $(basename "$war")"

    index="$(unzip -p "$war" WEB-INF/classes/static/index.html 2>/dev/null || true)"
    if [[ "$index" == *"src=\"/${instance}/"* ]]; then
        info "  [OK] 프론트 경로 /${instance}/"
    else
        error "  [실패] 프론트 경로가 /${instance}/ 가 아닙니다 (static/index.html)"
        ok=false
    fi

    war_version="$(unzip -p "$war" WEB-INF/classes/application.properties 2>/dev/null \
        | { grep '^spring.application.version=' || true; } | cut -d '=' -f2- | tr -d '\r[:space:]')"
    if [ "$war_version" = "$version" ]; then
        info "  [OK] 버전 $version"
    else
        error "  [실패] WAR 버전(${war_version:-없음})이 소스 버전($version)과 다릅니다"
        ok=false
    fi

    # class 파일 8번째 바이트 = major version (Java 8 = 52)
    major="$(unzip -p "$war" WEB-INF/classes/kr/co/kfs/aman/AmanApplication.class 2>/dev/null \
        | head -c 8 | od -An -tu1 | awk '{print $8}')"
    if [ "$major" = "52" ]; then
        info "  [OK] Java 8 클래스 (major 52)"
    else
        error "  [실패] Java 8 클래스가 아닙니다 (major ${major:-없음})"
        ok=false
    fi

    size="$(stat -c %s "$war")"
    # shellcheck disable=SC2012
    prev="$(ls -1t "$ARTIFACT_DIR/$instance"-[0-9]*.war 2>/dev/null | { grep -v "^$war\$" || true; } | head -n 1)"
    if [ "$size" -le 0 ]; then
        error "  [실패] WAR 크기가 0입니다"
        ok=false
    elif [ -n "$prev" ]; then
        prev_size="$(stat -c %s "$prev")"
        if [ "$size" -lt $((prev_size / 2)) ] || [ "$size" -gt $((prev_size * 2)) ]; then
            warn "  [확인] 크기 $((size / 1024 / 1024))MB, 직전 결과물 $((prev_size / 1024 / 1024))MB 와 차이가 큽니다"
        else
            info "  [OK] 크기 $((size / 1024 / 1024))MB"
        fi
    else
        info "  [OK] 크기 $((size / 1024 / 1024))MB"
    fi

    [ "$ok" = true ]
}

# ── 배포 기록 ─────────────────────────────────────────────────────────────
# record_deploy <host> <인스턴스> <WAR>
record_deploy() {
    mkdir -p "$ARTIFACT_DIR"
    echo "$(date '+%Y-%m-%d %H:%M:%S')  host=$1  war=$2.war  version=$VERSION  commit=$GIT_COMMIT  dirty=$GIT_DIRTY  file=$(basename "$3")  by=$(id -un)@$(hostname)" \
        >> "$ARTIFACT_DIR/deploy-history.log"
}

# ── 원격 접속 (ssh/sftp 연결 공유) ────────────────────────────────────────
# 비밀번호 방식 서버도 비밀번호를 1회만 입력하도록 ControlMaster로 연결을 공유한다.
#   ssh_init <user@host 또는 ssh 별칭>  → 이후 remote_ssh, remote_put 사용
#   종료 시 자동으로 연결을 닫는다 (trap EXIT)
ssh_init() {
    SSH_TARGET="$1"
    SSH_CTL_DIR="$(mktemp -d)"
    SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=$SSH_CTL_DIR/%r@%h:%p" -o ControlPersist=300)
    trap ssh_cleanup EXIT
}

ssh_cleanup() {
    if [ -n "${SSH_CTL_DIR:-}" ]; then
        ssh "${SSH_OPTS[@]}" -O exit "$SSH_TARGET" &>/dev/null || true
        rm -rf "$SSH_CTL_DIR"
    fi
}

# remote_ssh "<원격 명령>" : 원격 명령 실행 (실패 시 0이 아닌 값 반환)
remote_ssh() {
    ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "$1"
}

# remote_put <로컬 파일> <원격 경로> : sftp 업로드. 실패 시 0이 아닌 값 반환
#   -b - : 배치 모드에서 put 실패를 종료 코드로 알림
#   BatchMode=no : 배치 모드에서도 비밀번호 프롬프트 유지
remote_put() {
    sftp "${SSH_OPTS[@]}" -o BatchMode=no -b - "$SSH_TARGET" <<SFTP_EOF
put "$1" "$2"
SFTP_EOF
}
