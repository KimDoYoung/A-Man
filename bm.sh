#!/usr/bin/env bash
#============================================================================
# bm.sh - Backend 개발용 관리 스크립트 (A-Man)
#
# 사용법:  ./bm.sh [명령어]
# 예시:    ./bm.sh run
#============================================================================

set -euo pipefail

VERSION="0.0.2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
GRADLEW="$BACKEND_DIR/gradlew"

# ── 색상 ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── 유틸리티 함수 ─────────────────────────────────────────────────────────
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
header()  { echo -e "\n${CYAN}${BOLD}══ $* ══${NC}\n"; }

# 한글 등 멀티바이트(3byte/2col) 문자를 포함한 표시 너비 계산
visual_width() {
    local str="$1"
    local bytes=${#str}
    local chars
    chars=$(printf '%s' "$str" | wc -m)
    local cjk=$(( (bytes - chars) / 2 ))
    echo $(( chars + cjk ))
}

# 지정한 표시 너비로 우측 공백 패딩
pad_visual() {
    local str="$1"
    local width="$2"
    local vw
    vw=$(visual_width "$str")
    local pad=$(( width - vw ))
    [[ $pad -lt 0 ]] && pad=0
    printf '%s%*s' "$str" "$pad" ""
}

print_banner() {
    echo -e ""
    echo -e "${CYAN}${BOLD}   █████╗      ███╗   ███╗  █████╗  ███╗   ███╗${NC}"
    echo -e "${CYAN}${BOLD}  ██╔══██╗     ████╗ ████║ ██╔══██╗ ████╗ ████║${NC}"
    echo -e "${CYAN}${BOLD}  ███████║ ─── ██╔████╔██║ ███████║ ██╔████╔██║${NC}"
    echo -e "${CYAN}${BOLD}  ██╔══██║     ██║╚██╔╝██║ ██╔══██║ ██║╚██╔╝██║${NC}"
    echo -e "${CYAN}${BOLD}  ██║  ██║     ██║ ╚═╝ ██║ ██║  ██║ ██║ ╚═╝ ██║${NC}"
    echo -e "${CYAN}${BOLD}  ╚═╝  ╚═╝     ╚═╝     ╚═╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝${NC}"
    echo -e ""
    echo -e "  ${DIM}Backend Manager${NC}  ${BOLD}v${VERSION}${NC}  ${DIM}│${NC}  mode: ${YELLOW}${BOLD}${AMAN_MODE:-}${NC}"
    echo -e "  ${DIM}──────────────────────────────────────────────────────────${NC}"
    echo -e ""
}

resolve_mode() {
    export AMAN_MODE="${AMAN_MODE:-local}"
    info "개발 모드 자동 설정: ${AMAN_MODE}"
}

check_java() {
    if ! command -v java &>/dev/null; then
        error "Java가 설치되어 있지 않습니다. Java 1.8이 필요합니다."
        exit 1
    fi

    local java_ver
    java_ver=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}' | cut -d. -f1)
    if [[ "$java_ver" -eq 1 ]]; then
        java_ver=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}' | cut -d. -f2)
    fi

    if [[ "$java_ver" -ne 8 ]]; then
        warn "A-Man 백엔드는 Java 1.8(8) 환경을 완벽하게 지원합니다. (현재 버전: 1.$java_ver 또는 $java_ver)"
    fi
}

# ── 명령어 함수 ──────────────────────────────────────────────────────────
do_run() {
    header "Run - 개발 서버 실행 (mode: ${AMAN_MODE})"
    if [[ ! -f "$GRADLEW" ]]; then
        error "gradlew 파일을 찾을 수 없습니다."
        exit 1
    fi

    chmod +x "$GRADLEW"
    info "서버 시작 중... (Ctrl+C 로 종료)"
    info "Health check: curl http://localhost:8686/aman/health"
    echo ""
    "$GRADLEW" -p "$BACKEND_DIR" bootRun --args="--spring.profiles.active=${AMAN_MODE}"
}

do_stop() {
    header "Stop - 개발 서버 종료"
    local pid
    pid=$(lsof -t -i:8686 || true)
    if [[ -n "$pid" ]]; then
        info "포트 8686을 점유 중인 프로세스(PID: $pid)를 종료합니다."
        kill "$pid"
        sleep 2
        
        # 프로세스 종료 재확인
        if lsof -i:8686 &>/dev/null; then
            warn "프로세스가 아직 포트를 반환하지 않아 강제 종료(kill -9)를 진행합니다."
            kill -9 "$pid"
            sleep 1
        fi
        info "서버가 성공적으로 종료되었습니다."
    else
        warn "포트 8686을 사용하는 활성 프로세스가 없습니다."
    fi
}

do_compile() {
    header "Compile - 소스 컴파일"
    "$GRADLEW" -p "$BACKEND_DIR" classes
    info "컴파일 완료."
}

do_build() {
    header "Build - 전체 빌드 (컴파일 + 테스트 + JAR/WAR)"
    "$GRADLEW" -p "$BACKEND_DIR" clean build
    info "전체 빌드 완료."
}

do_war() {
    header "WAR - 배포용 WAR 파일 생성"
    "$GRADLEW" -p "$BACKEND_DIR" clean bootWar
    local war_path
    war_path=$(find "$BACKEND_DIR/build/libs" -name "*.war" | head -1)
    if [[ -n "$war_path" && -f "$war_path" ]]; then
        info "WAR 생성 완료: $war_path ($(du -h "$war_path" | cut -f1))"
    else
        error "WAR 파일이 생성되지 않았습니다."
        exit 1
    fi
}

do_test() {
    header "Test - 전체 테스트 실행"
    "$GRADLEW" -p "$BACKEND_DIR" test
    info "테스트 완료. 리포트: $BACKEND_DIR/build/reports/tests/test/index.html"
}

do_clean() {
    header "Clean - 빌드 캐시 삭제"
    "$GRADLEW" -p "$BACKEND_DIR" clean
    info "빌드 캐시가 삭제되었습니다."
}

do_checkstyle() {
    header "Checkstyle - 코드 스타일 검사"
    if "$GRADLEW" -p "$BACKEND_DIR" tasks | grep -q "checkstyleMain"; then
        "$GRADLEW" -p "$BACKEND_DIR" checkstyleMain --rerun-tasks 2>&1 | \
            grep -E "(warning|error|\[ant:checkstyle\]|\[WARN\])" | head -60 || true
        local report="$BACKEND_DIR/build/reports/checkstyle/main.html"
        [[ -f "$report" ]] && info "리포트: $report"
    else
        warn "checkstyle 태스크가 build.gradle에 정의되어 있지 않습니다."
    fi
}

do_spotbugs() {
    header "SpotBugs - 버그 패턴 정적 분석"
    if "$GRADLEW" -p "$BACKEND_DIR" tasks | grep -q "spotbugsMain"; then
        "$GRADLEW" -p "$BACKEND_DIR" spotbugsMain --rerun-tasks 2>&1 | \
            grep -E "(warning|error|BUG|SpotBugs)" | head -60 || true
        local report="$BACKEND_DIR/build/reports/spotbugs/main.html"
        [[ -f "$report" ]] && info "리포트: $report"
    else
        warn "spotbugs 태스크가 build.gradle에 정의되어 있지 않습니다."
    fi
}

do_lint() {
    header "Lint - 정적 분석 실행"
    do_checkstyle
    do_spotbugs
    info "Lint 완료."
}

do_log() {
    local base_dir="$SCRIPT_DIR/aman-base-dir"
    local prop_file="$BACKEND_DIR/src/main/resources/application-${AMAN_MODE}.properties"
    if [[ -f "$prop_file" ]]; then
        local extracted
        extracted=$(grep '^aman.base-dir=' "$prop_file" | cut -d '=' -f2- | sed "s/['\"]//g" || true)
        if [[ -n "$extracted" ]]; then
            base_dir="$extracted"
        fi
    fi

    local log_file="$base_dir/logs/A-Man.log"
    header "Log - 애플리케이션 로그 보기"
    if [[ ! -f "$log_file" ]]; then
        # 파일이 없을 시 다른 .log 파일도 탐색
        log_file=$(find "$base_dir/logs" -name "*.log" 2>/dev/null | head -1 || true)
    fi

    if [[ -z "$log_file" || ! -f "$log_file" ]]; then
        warn "로그 파일이 아직 없습니다: $base_dir/logs/A-Man.log"
        warn "서버를 먼저 실행해 주세요: ./bm.sh run"
        exit 1
    fi

    info "로그 파일: $log_file (Ctrl+C 로 종료)"
    echo ""
    tail -f "$log_file"
}

do_status() {
    header "Status - 애플리케이션 상태 확인"
    info "현재 모드: ${AMAN_MODE}"
    if pgrep -f "AmanApplication" > /dev/null; then
        info "애플리케이션이 실행 중입니다."
    else
        warn "애플리케이션이 실행되지 않고 있습니다."
    fi
}

print_menu() {
    local items=(
        "run:개발 서버 실행"
        "stop:개발 서버 종료"
        "compile:소스 컴파일"
        "build:전체 빌드"
        "war:WAR 파일 생성"
        "test:테스트 실행"
        "clean:빌드 캐시 삭제"
        "log:로그 보기"
        "status:상태 확인"
        "checkstyle:코드 스타일 검사"
        "spotbugs:버그 패턴 분석"
        "lint:전체 정적 분석"
    )

    echo -e "  ${BOLD}명령어${NC}"
    echo -e "  ${DIM}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${NC}"

    local total=${#items[@]}
    for ((i=0; i<total; i+=3)); do
        printf "  "
        for ((j=0; j<3 && i+j<total; j++)); do
            local idx=$((i+j))
            local num=$((idx+1))
            local cmd="${items[$idx]%%:*}"
            local desc="${items[$idx]#*:}"
            printf "${GREEN}${BOLD}%d)${NC} ${YELLOW}%-7s${NC} ${DIM}%s${NC}  " \
                "$num" "$cmd" "$(pad_visual "$desc" 14)"
        done
        printf "\n"
    done

    echo -e ""
    echo -e "  ${DIM}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${NC}"
    echo -e "  ${YELLOW}q)${NC} 종료"
    echo -e ""
}

# ── 메인 함수 ──────────────────────────────────────────────────────
main() {
    check_java
    resolve_mode

    if [[ $# -eq 0 ]]; then
        print_banner
        print_menu

        local cmds=("run" "stop" "compile" "build" "war" "test" "clean" "log" "status" "checkstyle" "spotbugs" "lint")

        read -rp "  번호를 입력하세요: " choice
        echo ""

        if [[ "$choice" == "q" || "$choice" == "Q" ]]; then
            info "종료합니다."
            exit 0
        fi

        if ! [[ "$choice" =~ ^[0-9]+$ ]] || [[ "$choice" -lt 1 || "$choice" -gt ${#cmds[@]} ]]; then
            error "잘못된 입력입니다: $choice"
            exit 1
        fi

        local cmd="${cmds[$((choice-1))]}"
    else
        local cmd="$1"
        shift
    fi

    case "$cmd" in
        run)        do_run ;;
        stop)       do_stop ;;
        compile)    do_compile ;;
        build)      do_build ;;
        war)        do_war ;;
        test)       do_test ;;
        clean)      do_clean ;;
        log)        do_log ;;
        status)     do_status ;;
        checkstyle) do_checkstyle ;;
        spotbugs)   do_spotbugs ;;
        lint)       do_lint ;;
        help)
            print_banner
            print_menu
            ;;
        *)
            error "알 수 없는 명령어: $cmd"
            exit 1
            ;;
    esac
}

main "$@"
