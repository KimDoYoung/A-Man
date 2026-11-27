#!/usr/bin/env bash
#============================================================================
# deploy/types/remote-docker.sh - 원격 docker 이미지 재빌드 배포 (jskn)
#   WAR와 Dockerfile을 원격 build context 폴더에 업로드하고,
#   원격에서 docker compose up -d --build <서비스> 로 이미지를 다시 만들어 기동한다.
#
# 서버 설정(hosts/<host>.conf)에서 사용하는 변수
#   REMOTE               ssh 접속 대상 (별칭 또는 user@host)
#   REMOTE_DATA          원격 build context 폴더 (WAR, Dockerfile 업로드 위치)
#   REMOTE_COMPOSE_DIR   원격 docker-compose.yml 이 있는 폴더
#   COMPOSE_SERVICE      재빌드할 compose 서비스 이름
#   DOCKERFILE           업로드할 Dockerfile (프로젝트 루트 기준)
#   ACCESS_URL           접속 주소 앞부분 - 선택
#============================================================================

type_preflight() {
    DOCKERFILE_PATH="$PROJECT_ROOT/${DOCKERFILE:-Dockerfile}"
    [ -f "$DOCKERFILE_PATH" ] || die "Dockerfile 이 없습니다: $DOCKERFILE_PATH"
    # Dockerfile 이 업로드할 WAR 이름을 COPY 하는지 확인 (다르면 이미지에 반영되지 않음)
    if ! grep -Eq "^[[:space:]]*COPY[[:space:]]+${INSTANCE}\.war[[:space:]]" "$DOCKERFILE_PATH"; then
        die "Dockerfile 에 'COPY ${INSTANCE}.war ...' 가 없습니다: $DOCKERFILE_PATH"
    fi

    info "원격 서버: ${BOLD}${REMOTE}${NC}"
    info "업로드   : ${REMOTE_DATA}/${INSTANCE}.war, ${REMOTE_DATA}/$(basename "$DOCKERFILE_PATH")"
    info "재빌드   : (원격) cd ${REMOTE_COMPOSE_DIR} && docker compose up -d --build ${COMPOSE_SERVICE}"

    ssh_init "$REMOTE"
    # 접속 확인 (비밀번호 방식이면 여기서 1회 입력, 이후 연결 공유)
    if remote_ssh "true"; then
        info "원격 접속 확인"
    else
        die "원격 서버(${REMOTE})에 접속할 수 없습니다."
    fi
}

type_plan() {
    echo "  1. (원격) mkdir -p ${REMOTE_DATA}"
    echo "  2. 업로드: $(basename "$WAR_FILE") → ${REMOTE}:${REMOTE_DATA}/${INSTANCE}.war"
    echo "  3. 업로드: $(basename "$DOCKERFILE_PATH") → ${REMOTE}:${REMOTE_DATA}/$(basename "$DOCKERFILE_PATH")"
    echo "  4. (원격) cd ${REMOTE_COMPOSE_DIR} && docker compose up -d --build ${COMPOSE_SERVICE}"
}

type_prepare() {
    :   # 빌드 전 추가 질문 없음
}

type_deploy() {
    header "배포 1/3: 원격 폴더 준비"
    remote_ssh "mkdir -p '${REMOTE_DATA}'" || die "원격 폴더를 만들 수 없습니다: ${REMOTE_DATA}"

    header "배포 2/3: WAR, Dockerfile 업로드"
    remote_put "$WAR_FILE" "${REMOTE_DATA}/${INSTANCE}.war" || die "WAR 업로드에 실패했습니다."
    remote_put "$DOCKERFILE_PATH" "${REMOTE_DATA}/$(basename "$DOCKERFILE_PATH")" || die "Dockerfile 업로드에 실패했습니다."
    info "업로드 완료"

    header "배포 3/3: 원격 컨테이너 재빌드 및 재시작"
    remote_ssh "cd '${REMOTE_COMPOSE_DIR}' && docker compose up -d --build '${COMPOSE_SERVICE}'" \
        || die "원격 docker compose 실행에 실패했습니다. 서버에서 직접 확인하세요."

    if [ -n "${ACCESS_URL:-}" ]; then
        info "접속 주소: ${BOLD}${ACCESS_URL}/${INSTANCE}${NC}  (상태 확인: ${ACCESS_URL}/${INSTANCE}/health)"
    fi
}
