#!/usr/bin/env bash
#============================================================================
# deploy.sh - A-Man 통합 배포 스크립트 (docs/deploy-통합-설계.md)
#
#   ./deploy.sh <host> [war-name]     예) ./deploy.sh t3600 aman20
#   ./deploy.sh --list                서버 목록과 허용 WAR 이름
#
#   - 서버 설정: deploy/hosts/<host>.conf
#   - 배포 방식: deploy/types/<DEPLOY_TYPE>.sh
#   - war-name 생략 시 aman. 서버별 ALLOWED_WARS 에 있는 이름만 배포할 수 있다.
#============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
HOSTS_DIR="$DEPLOY_DIR/hosts"

# shellcheck source=deploy/lib.sh
source "$DEPLOY_DIR/lib.sh"

usage() {
    echo "사용법: $0 <host> [war-name]"
    echo "        $0 --list"
    echo ""
    echo "  host      deploy/hosts/<host>.conf 의 이름 (예: t3600, omen)"
    echo "  war-name  배포할 WAR 이름 (기본 aman). 서버별 허용 목록만 가능"
}

list_hosts() {
    local conf name
    printf "%-10s %-14s %-16s %s\n" "HOST" "TYPE" "허용 WAR" "설명"
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
case "${1:-}" in
    ""|-h|--help) usage; exit 0 ;;
    --list)       list_hosts; exit 0 ;;
esac
[ $# -le 2 ] || { usage; exit 1; }

HOST="$1"
INSTANCE="$(normalize_instance "${2:-aman}")"

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

# ── 3. 공통 검사 ──────────────────────────────────────────────────────────
check_java_version
VERSION="$(app_version)"
BASE_DIR="$(resolve_base_dir "$PROFILE" "$INSTANCE")"

header "A-Man 배포: ${HOST} / ${INSTANCE}.war (버전 ${VERSION})"
info "서버      : ${BOLD}${HOST_LABEL}${NC}"
info "프로필    : ${PROFILE}"
info "인스턴스  : ${BOLD}${INSTANCE}${NC} (접속 경로 /${INSTANCE}, 프론트 base /${INSTANCE}/)"
info "base-dir  : ${BASE_DIR}"

type_preflight
echo ""

# ── 4. 확인 ───────────────────────────────────────────────────────────────
if [ "$PRODUCTION" = true ]; then
    warn "${BOLD}운영 서버입니다.${NC} 진행하려면 서버 이름과 WAR 이름을 입력하세요."
    read -r -p "서버 이름 (${HOST}): " typed_host
    read -r -p "WAR 이름 (${INSTANCE}): " typed_war
    if [[ "$typed_host" != "$HOST" || "$(normalize_instance "$typed_war")" != "$INSTANCE" ]]; then
        info "입력이 일치하지 않아 취소되었습니다."
        exit 0
    fi
else
    ask_yes "${HOST} 에 ${INSTANCE}.war 를 빌드하여 배포하시겠습니까?" || { info "취소되었습니다."; exit 0; }
fi

type_prepare

# ── 5. 빌드 / 배포 ────────────────────────────────────────────────────────
build_war "$INSTANCE"
type_deploy

header "완료: ${HOST} / ${INSTANCE}.war (버전 ${VERSION})"
