#!/usr/bin/env bash
#============================================================================
# deploy.sh - A-Man 통합 배포 스크립트 (docs/deploy-통합-설계.md)
#
#   ./deploy.sh <host> [war-name] [--dry-run] [--rebuild]
#   ./deploy.sh --list                서버 목록과 허용 WAR 이름
#
#   - 서버 설정: deploy/hosts/<host>.conf
#   - 배포 방식: deploy/types/<DEPLOY_TYPE>.sh
#   - war-name 생략 시 aman. 서버별 ALLOWED_WARS 에 있는 이름만 배포할 수 있다.
#   - 빌드 결과물은 deploy/artifacts/ 에 보관하고, 같은 커밋이면 재빌드 없이 재사용한다.
#     (다른 서버에서 검증한 WAR를 그대로 배포)
#
#   --dry-run  검사와 실행 계획만 출력. 빌드·폴더 생성·복사·재시작을 하지 않는다.
#   --rebuild  보관된 결과물이 있어도 새로 빌드한다.
#============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
HOSTS_DIR="$DEPLOY_DIR/hosts"

# shellcheck source=deploy/lib.sh
source "$DEPLOY_DIR/lib.sh"

# 사용법 짧게 (인자 오류 시)
usage() {
    echo "사용법: ./deploy.sh <서버> [WAR이름] [--dry-run] [--rebuild]"
    echo "자세한 설명: ./deploy.sh --help"
}

# 자세한 도움말 (--help) - 며칠 지나 다시 봐도 바로 쓸 수 있도록 작성
show_help() {
    cat <<EOF
${BOLD}A-Man 통합 배포 스크립트 (deploy.sh)${NC}

  프론트엔드와 백엔드를 빌드해 WAR를 만들고, 지정한 서버에 배포합니다.
  WAR 이름이 곧 접속 경로입니다:  aman.war → /aman,  aman20.war → /aman20
  (aman, aman20 은 서로 완전히 독립된 문서 시스템. DB·이미지·로그 폴더가 따로)

${BOLD}사용법${NC}
  ./deploy.sh <서버> [WAR이름] [옵션]

  <서버>     배포할 서버 이름. 아래 "서버 목록" 중 하나
  [WAR이름]  aman 또는 aman20 등. 생략하면 aman
             서버마다 허용된 이름만 배포됩니다 (오타로 엉뚱한 WAR가 생기는 것 방지)

${BOLD}옵션${NC}
  --dry-run  ${BOLD}연습 실행.${NC} 검사하고 "무엇을 할지"만 보여줍니다.
             빌드·폴더 생성·복사·재시작을 하지 않으므로 아무것도 바뀌지 않습니다.
             처음 쓰는 서버나 운영 서버는 먼저 이걸로 확인하세요.
  --rebuild  보관된 빌드 결과물이 있어도 무시하고 새로 빌드합니다.
  --list     서버 목록만 출력합니다.
  -h, --help 이 도움말을 출력합니다.

${BOLD}예시${NC}
  ./deploy.sh t3600                  t3600에 aman.war 배포
  ./deploy.sh t3600 aman20           t3600에 aman20.war 배포
  ./deploy.sh t3600 aman20 --dry-run 배포하지 않고 계획만 확인
  ./deploy.sh t3600 aman20 --rebuild 무조건 새로 빌드해서 배포
  ./deploy.sh --list                 서버 목록 보기

${BOLD}실행하면 이 순서로 진행됩니다${NC}
  1. 서버 설정 읽기, WAR 이름 허용 여부 확인
  2. 요약 출력: 서버, 인스턴스, 데이터 폴더(base-dir), 소스 브랜치·커밋, 빌드할지/재사용할지
  3. 배포 확인 질문 (y/N)  ※ 운영 서버는 서버 이름과 WAR 이름을 직접 입력해야 진행
  4. 서버별 추가 질문 (예: 컨테이너 재시작 여부)
  5. 빌드 (필요할 때만) → 결과물 보관 → WAR 검증
  6. 배포 → 배포 기록 남김

${BOLD}빌드 결과물 재사용${NC}
  빌드한 WAR는 deploy/artifacts/<WAR이름>-<버전>-<커밋>.war 로 보관됩니다.
  같은 커밋으로 다시 배포하면 새로 빌드하지 않고 그 파일을 그대로 씁니다.
  → 개발 서버에서 확인한 바로 그 WAR가 운영 서버로 갑니다.
  frontend/, backend/ 에 커밋 안 된 변경이 있으면 이름에 -dirty 가 붙고 항상 새로 빌드합니다.

${BOLD}배포 전 WAR 검증 (하나라도 실패하면 중단)${NC}
  - 프론트 경로가 /<WAR이름>/ 인지   (aman20용 WAR를 aman에 올리는 실수 방지)
  - WAR 안의 버전 = 소스 버전 (backend/src/main/resources/application.properties)
  - Java 8 클래스인지 (운영 Tomcat은 Java 8)
  - 크기가 직전 결과물과 크게 다르면 경고

${BOLD}운영 서버 규칙 (서버 설정의 PRODUCTION=true)${NC}
  - main 브랜치에서만, 커밋 안 된 변경이 없을 때만 배포됩니다.
  - 확인할 때 서버 이름과 WAR 이름을 직접 타이핑해야 합니다.

${BOLD}서버 목록${NC}  (deploy/hosts/<서버>.conf)
EOF
    list_hosts | sed 's/^/  /'
    cat <<EOF

${BOLD}관련 파일·명령${NC}
  deploy/hosts/<서버>.conf          서버 설정 (허용 WAR 이름은 ALLOWED_WARS 에서 변경)
  deploy/artifacts/                 보관된 빌드 결과물 (WAR이름별 최근 5개)
  deploy/artifacts/deploy-history.log  배포 기록 (언제, 어느 서버에, 어떤 WAR를)
  docs/deploy-통합-설계.md          이 스크립트의 설계 문서
  docs/multi-instance-설계.md       aman / aman20 멀티 인스턴스 설계

  새 인스턴스(예: aman20)에 초기 데이터(메뉴·admin·자산) 넣기:
    AMAN_MODE=<프로필> AMAN_INSTANCE=aman20 ./db.sh runfile sqls/aman_test_data.sql
    (실행 전 자동 백업. 기존 사용자·문서·자산·메뉴는 지워지고 초기 데이터로 바뀜)
    ※ 예전 deploy-jskn.sh / deploy-dell6820.sh 의 --init-db 는 deploy.sh 에 없습니다.
      배포와 DB 초기화를 섞지 않기 위해서이며, DB 초기화는 위 db.sh 명령으로 따로 합니다.

${BOLD}배포 방식 (서버 설정의 DEPLOY_TYPE)${NC}
  local-docker   이 PC의 docker 볼륨에 WAR 복사 → (선택) 컨테이너 중지·시작
                 → 반드시 그 서버 PC에서 실행 (호스트명이 다르면 경고)
  remote-docker  원격에 WAR·Dockerfile 업로드 → 원격에서 docker compose up -d --build
EOF
}

list_hosts() {
    local conf name
    printf "%-10s %-14s %-16s %s\n" "HOST" "TYPE" "WARS" "DESCRIPTION"
    for conf in "$HOSTS_DIR"/*.conf; do
        [ -e "$conf" ] || continue
        name="$(basename "$conf" .conf)"
        (
            # shellcheck disable=SC1090
            source "$conf"
            printf "%-10s %-14s %-16s %s\n" "$name" "${DEPLOY_TYPE:-?}" "${ALLOWED_WARS:-?}" "${HOST_LABEL:-}"
        )
    done
}

# ── 1. 인자 ───────────────────────────────────────────────────────────────
DRY_RUN=false
REBUILD=false
POSITIONAL=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) show_help; exit 0 ;;
        --list)    list_hosts; exit 0 ;;
        --dry-run) DRY_RUN=true ;;
        --rebuild) REBUILD=true ;;
        -*)        error "알 수 없는 옵션: $arg"; usage; exit 1 ;;
        *)         POSITIONAL+=("$arg") ;;
    esac
done
if [ ${#POSITIONAL[@]} -lt 1 ] || [ ${#POSITIONAL[@]} -gt 2 ]; then
    usage
    exit 1
fi

HOST="${POSITIONAL[0]}"
INSTANCE="$(normalize_instance "${POSITIONAL[1]:-aman}")"

# ── 2. 서버 설정 로드 ─────────────────────────────────────────────────────
HOST_CONF="$HOSTS_DIR/${HOST}.conf"
if [ ! -f "$HOST_CONF" ]; then
    error "알 수 없는 서버입니다: ${HOST} ($HOST_CONF 없음)"
    echo ""
    list_hosts
    exit 1
fi
# shellcheck disable=SC1090
source "$HOST_CONF"

for var in HOST_LABEL DEPLOY_TYPE PROFILE PRODUCTION ALLOWED_WARS; do
    [ -n "${!var:-}" ] || die "$HOST_CONF 에 ${var} 가 정의되어 있지 않습니다."
done

if ! is_allowed_war "$INSTANCE" "$ALLOWED_WARS"; then
    die "${HOST} 에는 '${INSTANCE}.war' 를 배포할 수 없습니다. 허용: ${ALLOWED_WARS} (변경은 $HOST_CONF)"
fi

TYPE_SCRIPT="$DEPLOY_DIR/types/${DEPLOY_TYPE}.sh"
[ -f "$TYPE_SCRIPT" ] || die "지원하지 않는 배포 방식입니다: ${DEPLOY_TYPE} ($TYPE_SCRIPT 없음)"
# shellcheck disable=SC1090
source "$TYPE_SCRIPT"

# ── 3. 공통 정보 / 검사 ───────────────────────────────────────────────────
VERSION="$(app_version)"
BASE_DIR="$(resolve_base_dir "$PROFILE" "$INSTANCE")"
load_git_info

# 운영 서버: main 브랜치의 커밋된 소스만 배포 (docs/deploy-통합-설계.md 4장)
if [ "$PRODUCTION" = true ]; then
    [ "$GIT_BRANCH" = "main" ] || die "운영 서버(${HOST})는 main 브랜치에서만 배포할 수 있습니다. (현재: ${GIT_BRANCH})"
    [ "$GIT_DIRTY" = false ] || die "운영 서버(${HOST})는 커밋되지 않은 변경(frontend/, backend/)이 있으면 배포할 수 없습니다."
fi

ARTIFACT="$(artifact_path "$INSTANCE" "$VERSION" "$GIT_COMMIT" "$GIT_DIRTY")"
# 커밋된 소스의 결과물만 재사용한다 (-dirty 는 항상 새로 빌드)
BUILD_NEEDED=true
if [ "$REBUILD" = false ] && [ "$GIT_DIRTY" = false ] && artifact_reusable "$ARTIFACT"; then
    BUILD_NEEDED=false
fi

header "A-Man 배포: ${HOST} / ${INSTANCE}.war (버전 ${VERSION})$([ "$DRY_RUN" = true ] && echo ' [dry-run]')"
info "서버      : ${BOLD}${HOST_LABEL}${NC}"
info "프로필    : ${PROFILE}"
info "인스턴스  : ${BOLD}${INSTANCE}${NC} (접속 경로 /${INSTANCE}, 프론트 base /${INSTANCE}/)"
info "base-dir  : ${BASE_DIR}"
info "소스      : ${GIT_BRANCH} @ ${GIT_COMMIT}$([ "$GIT_DIRTY" = true ] && echo " ${YELLOW}(커밋 안 된 변경 있음)${NC}")"
if [ "$BUILD_NEEDED" = true ]; then
    info "결과물    : 새로 빌드 → $(basename "$ARTIFACT")"
else
    info "결과물    : ${BOLD}보관된 결과물 재사용${NC} → $(basename "$ARTIFACT") ($(info_value "${ARTIFACT%.war}.info" built_at) 빌드)"
fi

type_preflight
echo ""

# ── 4. dry-run: 계획만 출력하고 종료 ──────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
    WAR_FILE="$ARTIFACT"
    if [ "$BUILD_NEEDED" = false ]; then
        verify_war "$ARTIFACT" "$INSTANCE" "$VERSION" || die "보관된 결과물 검증 실패. --rebuild 로 다시 빌드하세요."
    fi
    header "실행 계획 (dry-run, 실제 변경 없음)"
    if [ "$BUILD_NEEDED" = true ]; then
        echo "  0. 빌드: VITE_BASE=/${INSTANCE}/ → $(basename "$ARTIFACT"), 검증"
    fi
    type_plan
    echo ""
    info "dry-run 완료. 실제 배포는 --dry-run 없이 실행하세요."
    exit 0
fi

# ── 5. 확인 ───────────────────────────────────────────────────────────────
if [ "$PRODUCTION" = true ]; then
    warn "${BOLD}운영 서버입니다.${NC} 진행하려면 서버 이름과 WAR 이름을 입력하세요."
    read -r -p "서버 이름 (${HOST}): " typed_host
    read -r -p "WAR 이름 (${INSTANCE}): " typed_war
    if [[ "$typed_host" != "$HOST" || "$(normalize_instance "$typed_war")" != "$INSTANCE" ]]; then
        info "입력이 일치하지 않아 취소되었습니다."
        exit 0
    fi
else
    ask_yes "${HOST} 에 ${INSTANCE}.war 를 배포하시겠습니까?" || { info "취소되었습니다."; exit 0; }
fi

type_prepare

# ── 6. 빌드 / 검증 ────────────────────────────────────────────────────────
if [ "$BUILD_NEEDED" = true ]; then
    check_java_version
    build_war "$INSTANCE"
    save_artifact "$WAR_FILE" "$ARTIFACT" "$INSTANCE"
fi
WAR_FILE="$ARTIFACT"
if ! verify_war "$WAR_FILE" "$INSTANCE" "$VERSION"; then
    # 잘못된 결과물이 재사용되지 않도록 삭제
    rm -f "$ARTIFACT" "${ARTIFACT%.war}.info"
    die "WAR 검증에 실패하여 배포를 중단합니다. (결과물 삭제됨)"
fi
[ "$BUILD_NEEDED" = true ] && prune_artifacts "$INSTANCE"

# ── 7. 배포 ───────────────────────────────────────────────────────────────
type_deploy
record_deploy "$HOST" "$INSTANCE" "$WAR_FILE"

header "완료: ${HOST} / ${INSTANCE}.war (버전 ${VERSION}, ${GIT_COMMIT})"
