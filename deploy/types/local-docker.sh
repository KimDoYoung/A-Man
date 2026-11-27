#!/usr/bin/env bash
#============================================================================
# deploy/types/local-docker.sh - 로컬 docker Tomcat 배포 (t3600, omen)
#   이 PC의 docker 볼륨(webapps)에 WAR를 복사하고, 선택 시 컨테이너를 중지→교체→시작한다.
#
# 서버 설정(hosts/<host>.conf)에서 사용하는 변수
#   CONTAINER            컨테이너 이름 (docker stop/start/logs 대상)
#   WEBAPPS_DIR          호스트의 WAR 복사 경로
#   EXPECTED_HOSTNAME    이 PC의 호스트명 (다르면 경고 후 확인) - 선택
#   COMPOSE_FILE         compose 파일 경로 - COMPOSE_MOUNT_CHECK=true 일 때 사용
#   COMPOSE_MOUNT_CHECK  true: WAR를 개별 파일로 마운트하는 구성 (gxt-demo)
#                        → compose 마운트 누락 경고, 대상 WAR 경로가 폴더인지 검사
#   PREPARE_DIRS         true: base-dir 하위 폴더를 호스트 사용자로 미리 생성
#   ACCESS_URL           접속 주소 앞부분 (예: http://localhost:8081) - 선택
#   SETENV_FILE          컨테이너 setenv.sh 경로 - 선택
#   SETENV_PATTERN       setenv.sh에 있어야 할 프로필 설정 (grep -E 정규식). 없으면 경고 - 선택
#============================================================================

# 빌드 전 검사. 문제 있으면 중단.
type_preflight() {
    TARGET_WAR_FILE="$WEBAPPS_DIR/${INSTANCE}.war"
    info "복사 경로: ${BOLD}$TARGET_WAR_FILE${NC}"

    # 다른 PC에서 실행하면 그 PC의 폴더에 복사되므로 호스트명을 확인한다.
    if [ -n "${EXPECTED_HOSTNAME:-}" ]; then
        local current
        current="$(hostname)"
        if [[ "${current,,}" != "${EXPECTED_HOSTNAME,,}" ]]; then
            warn "이 PC의 호스트명(${BOLD}${current}${NC})이 ${HOST} 설정(${EXPECTED_HOSTNAME})과 다릅니다."
            if [ "${DRY_RUN:-false}" != true ]; then
                ask_yes "그래도 이 PC의 ${WEBAPPS_DIR} 에 배포하시겠습니까?" || { info "취소되었습니다."; exit 0; }
            fi
        fi
    fi

    # 컨테이너가 이 서버의 프로필로 기동되는지 확인 (경고만)
    if [ -n "${SETENV_FILE:-}" ] && [ -n "${SETENV_PATTERN:-}" ]; then
        if [ -f "$SETENV_FILE" ] && grep -Eq "$SETENV_PATTERN" "$SETENV_FILE"; then
            info "setenv.sh 프로필 설정 확인: ${SETENV_PATTERN}"
        else
            warn "$SETENV_FILE 에 프로필 설정(${SETENV_PATTERN})이 없습니다."
            warn "  → 다른 프로필로 기동되어 base-dir 등이 달라질 수 있습니다."
        fi
    fi

    if [ "${COMPOSE_MOUNT_CHECK:-false}" = true ]; then
        if [[ "$INSTANCE" != "aman" ]] && [ -f "$COMPOSE_FILE" ] && ! grep -q "webapps/${INSTANCE}.war" "$COMPOSE_FILE"; then
            warn "$COMPOSE_FILE 에 ${INSTANCE}.war 및 데이터 디렉터리 마운트가 없습니다. (docs/multi-instance-설계.md 3.5)"
            warn "마운트 없이 배포하면 컨테이너가 WAR를 보지 못하거나, 데이터가 컨테이너 내부에만 저장됩니다."
        fi
        # 호스트에 WAR 파일이 없는 상태로 컨테이너를 만들면 Docker가 같은 이름의 빈 폴더(root 소유)를 만든다.
        if [ -d "$TARGET_WAR_FILE" ]; then
            error "배포 대상이 파일이 아니라 폴더입니다: $TARGET_WAR_FILE"
            warn "WAR 파일이 없는 상태에서 컨테이너가 생성되어 Docker가 빈 폴더를 만든 것입니다. 아래 순서로 복구하세요."
            echo -e "  ${BOLD}cd $(dirname "$COMPOSE_FILE") && docker compose stop ${CONTAINER}${NC}"
            echo -e "  ${BOLD}sudo rmdir ${TARGET_WAR_FILE}${NC}"
            echo -e "  ${BOLD}./deploy.sh ${HOST} ${INSTANCE}${NC}"
            echo -e "  ${BOLD}cd $(dirname "$COMPOSE_FILE") && docker compose up -d --force-recreate ${CONTAINER}${NC}"
            exit 1
        fi
    fi
}

# --dry-run 시 실행 계획 출력 (변경 없음)
type_plan() {
    echo "  1. (재시작 선택 시) docker stop ${CONTAINER}, ${WEBAPPS_DIR}/${INSTANCE} 삭제"
    echo "  2. 복사: $(basename "$WAR_FILE") → ${TARGET_WAR_FILE}"
    echo "  3. (재시작 선택 시) docker start ${CONTAINER}, 기동 로그 대기"
    if [ "${PREPARE_DIRS:-false}" = true ]; then
        echo "  ※ 빌드 전 ${BASE_DIR} 하위 폴더(db, logs, data/images, data/video, backup) 생성"
    fi
}

# 확인 후, 빌드 전에 할 일. 추가 질문은 여기서 한다 (빌드 도중 표준입력 소비 문제 방지).
type_prepare() {
    if [ "${PREPARE_DIRS:-false}" = true ]; then
        # 컨테이너(root, umask 0027)가 먼저 만들면 root 소유 750이 되어 호스트에서 접근할 수 없다.
        info "base-dir 하위 폴더 준비: $BASE_DIR"
        local sub dir not_owned=()
        for sub in db logs data/images data/video backup; do
            dir="$BASE_DIR/$sub"
            if [ ! -d "$dir" ]; then
                mkdir -p "$dir" || die "폴더를 생성할 수 없습니다: $dir"
                info "  생성: $dir"
            elif [ ! -O "$dir" ]; then
                not_owned+=("$dir")
            fi
        done
        if [ ${#not_owned[@]} -gt 0 ]; then
            warn "현재 사용자($(id -un)) 소유가 아닌 폴더가 있습니다 (컨테이너가 root로 생성):"
            for dir in "${not_owned[@]}"; do warn "  $dir"; done
            warn "호스트에서 접근하려면: ${BOLD}sudo chown -R $(id -un):$(id -gn) ${BASE_DIR}${NC}"
        fi
    fi

    if ask_yes "배포 후 ${CONTAINER} 컨테이너를 재시작하시겠습니까? (중지→복사→시작)"; then
        DO_RESTART=true
    else
        DO_RESTART=false
    fi
}

# 빌드된 WAR_FILE을 배포
type_deploy() {
    # 실행 중인 Tomcat은 WAR가 바뀌는 즉시 autoDeploy로 재배포를 시작한다.
    # 그 도중에 exploded 디렉토리를 지우면 배포가 깨지므로, 먼저 중지한 뒤 교체한다.
    if [ "$DO_RESTART" = true ]; then
        header "배포 1/3: ${CONTAINER} 중지"
        docker stop "$CONTAINER"
    fi

    header "배포 2/3: ${INSTANCE}.war 복사"
    if [ ! -d "$WEBAPPS_DIR" ]; then
        info "타겟 디렉토리가 존재하지 않아 생성합니다: $WEBAPPS_DIR"
        mkdir -p "$WEBAPPS_DIR"
    fi
    if [ "$DO_RESTART" = true ]; then
        # 중지 상태에서 기존 exploded 디렉토리 제거 → 시작 시 새 WAR로 깨끗하게 전개
        info "기존 exploded 디렉토리 제거: $WEBAPPS_DIR/${INSTANCE}"
        rm -rf "${WEBAPPS_DIR:?}/${INSTANCE}"
    fi
    info "WAR 파일 복사 중 -> $TARGET_WAR_FILE"
    cp -f "$WAR_FILE" "$TARGET_WAR_FILE"

    if [ "$DO_RESTART" = true ]; then
        header "배포 3/3: ${CONTAINER} 시작"
        local start_ts started=false logs
        start_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)   # 이번 기동 이후 로그만 확인
        docker start "$CONTAINER"

        info "애플리케이션 기동 대기 중 (최대 120초)..."
        for _ in $(seq 1 40); do
            # pipefail 환경에서 grep -q 조기 종료(SIGPIPE)로 오판하지 않도록 변수에 담아 검사
            logs=$(docker logs --since "$start_ts" "$CONTAINER" 2>&1 || true)
            if [[ "$logs" == *"Server startup in"* ]]; then
                started=true
                break
            fi
            sleep 3
        done

        if [ "$started" = true ]; then
            info "기동 완료. 로그 확인: ${BOLD}docker logs -f ${CONTAINER}${NC}"
            if [ -n "${ACCESS_URL:-}" ]; then
                info "접속 주소: ${BOLD}${ACCESS_URL}/${INSTANCE}${NC}"
            fi
        else
            warn "120초 내에 기동 완료 로그를 확인하지 못했습니다. ${BOLD}docker logs -f ${CONTAINER}${NC} 로 확인하세요."
        fi
    else
        warn "실행 중인 Tomcat이 autoDeploy로 새 WAR를 자동 재배포합니다."
        info "깨끗하게 재배포하려면 다시 실행해 재시작을 선택하거나, 아래 명령어를 실행하세요:"
        echo -e "  ${BOLD}docker stop ${CONTAINER} && rm -rf ${WEBAPPS_DIR}/${INSTANCE} && docker start ${CONTAINER}${NC}"
    fi
}
