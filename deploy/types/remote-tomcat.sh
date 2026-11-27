#!/usr/bin/env bash
#============================================================================
# deploy/types/remote-tomcat.sh - 원격 Tomcat 직접 배포 (119 운영)
#   기존 deploy-119.sh 의 절차를 그대로 따르고, 인스턴스 이름만 일반화했다.
#     1. sftp 업로드 : <base-dir>/<인스턴스>-<버전>.war   (서버에 버전별로 남음 → 수동 롤백용)
#     2. webapps 반영: 임시 파일(.<인스턴스>.war.tmp)로 복사 후 mv 로 원자적 교체
#                     (Tomcat은 .war 가 아닌 임시 파일을 무시 → 복사 중인 불완전한 WAR 배포 방지)
#     3. Tomcat autoDeploy 가 /<인스턴스> 를 재배포
#
# 서버 설정(hosts/<host>.conf)에서 사용하는 변수
#   REMOTE_USER, REMOTE_HOST   ssh/sftp 접속 정보 (비밀번호 1회 입력, 연결 공유)
#   REMOTE_WEBAPPS             Tomcat webapps 경로
#   REMOTE_CATALINA_OUT        catalina.out 경로 (재배포 완료 확인용) - 선택
#   ACCESS_URL                 접속 주소 앞부분 - 선택
#
# 수동 롤백 (스크립트에 기능 없음, docs/deploy-통합-설계.md 4.2)
#   cp <base-dir>/<인스턴스>-<이전버전>.war <webapps>/.<인스턴스>.war.tmp
#   mv -f <webapps>/.<인스턴스>.war.tmp <webapps>/<인스턴스>.war
#============================================================================

# 원격 상태값 읽기: remote_state <키>
remote_state() {
    { echo "$REMOTE_STATE" | grep "^$1=" || true; } | head -n 1 | cut -d '=' -f2-
}

type_preflight() {
    REMOTE_UPLOAD="$BASE_DIR/${INSTANCE}-${VERSION}.war"
    REMOTE_DEPLOY="$REMOTE_WEBAPPS/${INSTANCE}.war"
    REMOTE_TMP="$REMOTE_WEBAPPS/.${INSTANCE}.war.tmp"

    info "원격 서버: ${BOLD}${REMOTE_USER}@${REMOTE_HOST}${NC}"
    info "업로드   : ${REMOTE_UPLOAD}"
    info "반영     : ${REMOTE_DEPLOY}  (임시 파일 복사 후 mv 로 교체)"

    ssh_init "${REMOTE_USER}@${REMOTE_HOST}"
    info "원격 서버에 접속합니다. 비밀번호를 물으면 입력하세요 (1회, 이후 연결 공유)."
    remote_ssh "true" || die "원격 서버(${REMOTE_HOST})에 접속할 수 없습니다."

    # 원격 상태 조회 (읽기만 함)
    REMOTE_STATE="$(remote_ssh "
        b='$BASE_DIR'; w='$REMOTE_WEBAPPS'
        [ -d \"\$w\" ] && echo webapps=1 || echo webapps=0
        [ -d \"\$b\" ] && echo base=1 || echo base=0
        [ -f \"\$b/db/aman.db\" ] && echo db=1 || echo db=0
        [ -f '$REMOTE_UPLOAD' ] && echo upload_exists=1 || echo upload_exists=0
        [ -f '$REMOTE_DEPLOY' ] && echo \"current=\$(ls -l --time-style=+%Y-%m-%d_%H:%M '$REMOTE_DEPLOY' | awk '{print \$5\" bytes, \"\$6}')\"
        echo \"whoami=\$(whoami)\"
        [ -d \"\$w\" ] && echo \"webapps_owner=\$(stat -c %U \"\$w\")\"
        command -v sha256sum >/dev/null && echo sha256=1 || echo sha256=0
    ")" || die "원격 상태를 조회할 수 없습니다."

    [ "$(remote_state webapps)" = 1 ] || die "원격 webapps 경로가 없습니다: ${REMOTE_WEBAPPS}"

    local current
    current="$(remote_state current)"
    if [ -n "$current" ]; then
        info "현재 배포: ${INSTANCE}.war (${current})"
    else
        warn "현재 배포된 ${INSTANCE}.war 가 없습니다 → ${BOLD}/${INSTANCE} 첫 배포${NC}"
    fi

    UPLOAD_EXISTS=false
    if [ "$(remote_state upload_exists)" = 1 ]; then
        UPLOAD_EXISTS=true
        warn "서버에 같은 버전 파일이 이미 있습니다: ${REMOTE_UPLOAD} (진행하면 덮어씀)"
        warn "  → 버전을 올리지 않았다면 backend/src/main/resources/application.properties 의 버전을 확인하세요."
    fi

    FIRST_DEPLOY=false
    if [ "$(remote_state db)" != 1 ]; then
        FIRST_DEPLOY=true
        warn "${BOLD}${BASE_DIR}/db/aman.db 가 없습니다 → 이 인스턴스의 첫 배포입니다.${NC}"
        warn "  - 기동 시 빈 DB가 만들어지고 초기 관리자 ${BOLD}admin / 1111${NC} 이 자동 생성됩니다 → 즉시 비밀번호 변경"
        warn "  - 메뉴·자산 초기 데이터는 자동으로 들어가지 않습니다 (배포 후 안내 참조)"
        warn "  - 앞단 프록시(nginx 등)가 /${INSTANCE}/ 를 Tomcat으로 전달하는지 확인하세요"
    fi

    # base-dir을 ssh 계정이 만들면 Tomcat 실행 계정이 하위 폴더를 못 만들 수 있다.
    local me owner
    me="$(remote_state whoami)"
    owner="$(remote_state webapps_owner)"
    if [ "$(remote_state base)" != 1 ] && [ -n "$owner" ] && [ "$me" != "$owner" ]; then
        warn "${BASE_DIR} 를 ${me} 계정으로 만들게 되는데, webapps 소유자는 ${owner} 입니다."
        warn "  → Tomcat이 ${owner} 로 실행된다면 폴더 권한을 확인하세요."
    fi
}

type_plan() {
    local n=1
    if [ "$(remote_state base)" != 1 ]; then
        echo "  $n. (원격) mkdir -p ${BASE_DIR}"; n=$((n + 1))
    fi
    echo "  $n. 업로드: $(basename "$WAR_FILE") → ${REMOTE_UPLOAD}$([ "$UPLOAD_EXISTS" = true ] && echo '  ※ 덮어씀')"; n=$((n + 1))
    echo "  $n. (원격) 업로드 파일 sha256 대조"; n=$((n + 1))
    echo "  $n. 확인 질문 후 (원격) cp ${REMOTE_UPLOAD} ${REMOTE_TMP}"
    echo "     && mv -f ${REMOTE_TMP} ${REMOTE_DEPLOY}"; n=$((n + 1))
    echo "  $n. ${REMOTE_CATALINA_OUT:-catalina.out} 에서 재배포 완료 로그 대기"
}

type_prepare() {
    if [ "$UPLOAD_EXISTS" = true ]; then
        ask_yes "서버의 ${INSTANCE}-${VERSION}.war 를 덮어쓰시겠습니까?" || { info "취소되었습니다."; exit 0; }
    fi
}

type_deploy() {
    header "배포 1/3: 119 서버로 업로드"
    if [ "$(remote_state base)" != 1 ]; then
        remote_ssh "mkdir -p '$BASE_DIR'" || die "원격 폴더를 만들 수 없습니다: $BASE_DIR"
        info "원격 폴더 생성: $BASE_DIR"
    fi
    # 임시 이름(.part)으로 올리고, 대조가 끝난 뒤에 정식 이름으로 바꾼다.
    # → 전송이 깨져도 서버에 남은 같은 이름의 정상 WAR(수동 롤백용)를 덮어쓰지 않는다.
    local part="${REMOTE_UPLOAD}.part"
    remote_put "$WAR_FILE" "$part" || die "업로드에 실패했습니다."

    # 업로드된 파일이 로컬 결과물과 같은지 확인 (전송 중 손상 방지)
    if [ "$(remote_state sha256)" = 1 ]; then
        local local_sum remote_sum
        local_sum="$(sha256sum "$WAR_FILE" | cut -d ' ' -f1)"
        remote_sum="$(remote_ssh "sha256sum '$part' | cut -d ' ' -f1")" || die "원격 sha256 확인에 실패했습니다."
        if [ "$local_sum" != "$remote_sum" ]; then
            remote_ssh "rm -f '$part'" || true
            die "업로드 파일이 손상되었습니다 (sha256 불일치). 업로드 파일을 지웠고 webapps 에는 반영하지 않았습니다."
        fi
    else
        warn "원격에 sha256sum 이 없어 업로드 파일 대조를 건너뜁니다."
    fi
    remote_ssh "mv -f '$part' '$REMOTE_UPLOAD'" || die "업로드 파일 이름 변경에 실패했습니다: $part"
    info "업로드 완료$([ "$(remote_state sha256)" = 1 ] && echo ', sha256 일치'): $REMOTE_UPLOAD"

    header "배포 2/3: Tomcat webapps 에 ${INSTANCE}.war 로 반영"
    warn "운영 Tomcat의 /${INSTANCE} 가 ${INSTANCE}-${VERSION}.war 로 교체(자동 재배포)됩니다."
    if ! ask_yes "지금 webapps/${INSTANCE}.war 로 반영하시겠습니까?"; then
        DEPLOY_STATUS="uploaded-only"
        warn "webapps 반영을 건너뜁니다. 나중에 수동으로 반영하려면 서버에서:"
        echo "  cp '$REMOTE_UPLOAD' '$REMOTE_TMP' && mv -f '$REMOTE_TMP' '$REMOTE_DEPLOY'"
        return 0
    fi

    local log_lines=0
    if [ -n "${REMOTE_CATALINA_OUT:-}" ]; then
        log_lines="$(remote_ssh "[ -f '$REMOTE_CATALINA_OUT' ] && wc -l < '$REMOTE_CATALINA_OUT' || echo 0")" || log_lines=0
    fi

    remote_ssh "
        set -e
        cp '$REMOTE_UPLOAD' '$REMOTE_TMP'
        mv -f '$REMOTE_TMP' '$REMOTE_DEPLOY'
        ls -l '$REMOTE_DEPLOY'
    " || die "webapps 반영 중 오류가 발생했습니다. 서버에서 직접 확인하세요."

    header "배포 3/3: 재배포 완료 대기"
    if [ -n "${REMOTE_CATALINA_OUT:-}" ]; then
        local done_line="" i
        info "${REMOTE_CATALINA_OUT} 확인 중 (최대 180초)..."
        for i in $(seq 1 36); do
            done_line="$(remote_ssh "tail -n +$((log_lines + 1)) '$REMOTE_CATALINA_OUT' 2>/dev/null | grep -E '/${INSTANCE}\\.war\\] has finished' | tail -n 1" || true)"
            [ -n "$done_line" ] && break
            sleep 5
        done
        if [ -n "$done_line" ]; then
            info "재배포 완료: ${done_line}"
        else
            warn "180초 안에 완료 로그를 찾지 못했습니다. 서버에서 확인하세요:"
            echo "  tail -f ${REMOTE_CATALINA_OUT}"
        fi
    fi

    if [ -n "${ACCESS_URL:-}" ]; then
        info "접속 주소: ${BOLD}${ACCESS_URL}/${INSTANCE}${NC}"
    fi

    if [ "$FIRST_DEPLOY" = true ]; then
        echo ""
        warn "${BOLD}첫 배포 후 할 일${NC}"
        warn "  1. admin / 1111 로 로그인 → 즉시 비밀번호 변경"
        warn "  2. 메뉴·자산 초기 데이터가 필요하면 서버에서 sqls/aman_test_data.sql 실행 (기존 데이터는 지워짐)"
        warn "  3. 앞단 프록시가 /${INSTANCE}/ 를 전달하는지 접속해서 확인"
    fi
}
