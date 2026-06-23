#!/bin/bash

#----------------------------------------------------
# 1. 환경 설정 및 DB 경로 설정
#----------------------------------------------------
PROFILE=${AMAN_MODE:-local}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 백엔드 Properties 설정 파일에서 BASE_DIR 추출 시도
BASE_DIR=""
PROP_FILE="$SCRIPT_DIR/backend/src/main/resources/application-${PROFILE}.properties"
if [ -f "$PROP_FILE" ]; then
    BASE_DIR=$(grep '^aman.base-dir=' "$PROP_FILE" | cut -d '=' -f2- | sed "s/['\"]//g" || true)
fi

# application-*.properties가 없거나 정의되지 않은 경우 기본 application.properties 탐색
if [ -z "$BASE_DIR" ] && [ -f "$SCRIPT_DIR/backend/src/main/resources/application.properties" ]; then
    BASE_DIR=$(grep '^aman.base-dir=' "$SCRIPT_DIR/backend/src/main/resources/application.properties" | cut -d '=' -f2- | sed "s/['\"]//g" || true)
fi

# 여전히 정의되지 않은 경우 기본값 설정
BASE_DIR=${BASE_DIR:-$SCRIPT_DIR/aman-base-dir}
DB_FILE="$BASE_DIR/db/aman.db"

#----------------------------------------------------
# 2. 유틸리티 함수
#----------------------------------------------------

show_header() {
    echo "---------------------------------------------"
    echo "profile : $PROFILE"
    echo "db-file : $DB_FILE"
    echo "---------------------------------------------"
}

get_tables() {
    sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
}

# 테이블을 목록으로 보여주고 번호로 선택받는 함수
pick_table() {
    local tables=($(get_tables))
    if [ ${#tables[@]} -eq 0 ]; then
        echo "오류: 테이블이 존재하지 않습니다."
        return 1
    fi

    echo ""
    echo "[테이블 목록]"
    for i in "${!tables[@]}"; do
        printf "%2d. %s\n" $((i+1)) "${tables[$i]}"
    done
    echo ""
    
    read -p "선택할 테이블 번호를 입력하세요: " idx
    if [[ "$idx" =~ ^[0-9]+$ ]] && [ "$idx" -ge 1 ] && [ "$idx" -le ${#tables[@]} ]; then
        SELECTED_TABLE="${tables[$((idx-1))]}"
        return 0
    else
        echo "잘못된 번호입니다."
        return 1
    fi
}

#----------------------------------------------------
# 3. 핵심 기능 함수 정의
#----------------------------------------------------

list_tables() {
    if [ ! -f "$DB_FILE" ]; then
        echo "오류: DB 파일이 존재하지 않습니다 ($DB_FILE)"
        return
    fi
    echo "[테이블 목록 및 데이터 건수]"
    local tables=$(get_tables)
    if [ -z "$tables" ]; then
        echo "테이블이 없습니다."
    else
        for table in $tables; do
            count=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM $table;")
            printf "  - %-20s : %d\n" "$table" "$count"
        done
    fi
}

desc_table() {
    if [ ! -f "$DB_FILE" ]; then
        echo "오류: DB 파일이 존재하지 않습니다 ($DB_FILE)"
        return
    fi
    if [ -z "$1" ]; then
        pick_table || return
        table=$SELECTED_TABLE
    else
        table=$1
    fi
    [ -z "$table" ] && return
    echo ""
    echo "[$table 테이블 구조]"
    sqlite3 "$DB_FILE" ".schema $table"
}

select_table() {
    if [ ! -f "$DB_FILE" ]; then
        echo "오류: DB 파일이 존재하지 않습니다 ($DB_FILE)"
        return
    fi
    if [ -z "$1" ]; then
        pick_table || return
        table=$SELECTED_TABLE
    else
        table=$1
    fi
    [ -z "$table" ] && return
    echo ""
    echo "[$table 데이터 조회 (최대 100건)]"
    sqlite3 -header -column "$DB_FILE" "SELECT * FROM $table LIMIT 100;"
}

run_sql() {
    if [ ! -f "$DB_FILE" ]; then
        echo "오류: DB 파일이 존재하지 않습니다 ($DB_FILE)"
        return
    fi
    if [ -z "$1" ]; then
        read -p "수행할 SQL을 입력하세요: " sql
    else
        sql=$1
    fi
    [ -z "$sql" ] && return
    echo ""
    echo "[SQL 수행 결과]"
    sqlite3 -header -column "$DB_FILE" "$sql"
}

delete_db() {
    if [ ! -f "$DB_FILE" ]; then
        echo "오류: 삭제할 DB 파일이 없습니다 ($DB_FILE)"
        return
    fi
    echo "!!! 주의: 데이터베이스 파일($DB_FILE)을 삭제합니다 !!!"
    read -p "정말 삭제하시겠습니까? (y/N): " confirm
    if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        rm -f "$DB_FILE"
        echo "데이터베이스 파일이 삭제되었습니다."
    else
        echo "취소되었습니다."
    fi
}

backup_db() {
    if [ ! -f "$DB_FILE" ]; then
        echo "오류: 백업할 데이터베이스 파일이 존재하지 않습니다 ($DB_FILE)"
        return 1
    fi

    local db_dir
    db_dir=$(dirname "$DB_FILE")
    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$db_dir/aman_${timestamp}.db"

    echo "데이터베이스 백업 중..."
    cp "$DB_FILE" "$backup_file"

    if [ $? -eq 0 ] && [ -f "$backup_file" ]; then
        echo "백업 완료: $backup_file ($(ls -lh "$backup_file" | awk '{print $5}'))"
        return 0
    else
        echo "오류: 백업 복사에 실패했습니다."
        return 1
    fi
}

init_db() {
    local ddl_script="$SCRIPT_DIR/sqls/aman_ddl.sql"
    if [ ! -f "$ddl_script" ]; then
        echo "오류: DDL 스크립트 파일이 존재하지 않습니다 ($ddl_script)"
        return
    fi

    echo "!!! 경고: 기존 데이터베이스 파일($DB_FILE)을 백업한 후 삭제하고 새로 초기화합니다 !!!"
    read -p "진행하시겠습니까? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "초기화 작업이 취소되었습니다."
        return
    fi

    # 1. 기존 DB 백업 후 제거
    if [ -f "$DB_FILE" ]; then
        backup_db
        if [ $? -ne 0 ]; then
            echo "오류: 데이터베이스 백업에 실패하여 초기화 프로세스를 중단합니다."
            return
        fi
        rm -f "$DB_FILE"
        echo "기존 DB 파일 삭제 완료."
    fi

    # 2. 상위 폴더 존재 여부 확인 및 생성
    local db_dir
    db_dir=$(dirname "$DB_FILE")
    mkdir -p "$db_dir"

    # 3. DDL 스크립트를 SQLite3를 사용해 주입
    echo "DDL 실행 중... ($ddl_script)"
    sqlite3 "$DB_FILE" < "$ddl_script"

    if [ $? -eq 0 ] && [ -f "$DB_FILE" ]; then
        echo "데이터베이스가 성공적으로 생성 및 스키마 초기화 완료되었습니다."
        ls -lh "$DB_FILE"
    else
        echo "오류: 데이터베이스 파일 생성 또는 스키마 생성에 실패했습니다."
    fi
}

fetch_server_db() {
    local remote_host="aview.k-fs.co.kr"
    local remote_db="/data/docker/apps/aman/db/aman.db"
    local local_tmp="/tmp/aman.db"

    echo "서버($remote_host)에서 DB를 가져옵니다..."
    
    # 로컬 임시 파일 삭제
    if [ -f "$local_tmp" ]; then
        echo "기존 $local_tmp 삭제 중..."
        rm -f "$local_tmp"
    fi

    # SFTP로 파일 가져오기
    sftp "$remote_host" <<EOF
get $remote_db $local_tmp
quit
EOF

    if [ $? -eq 0 ] && [ -f "$local_tmp" ]; then
        echo "DB 가져오기 성공: $local_tmp"
        ls -lh "$local_tmp"
    else
        echo "오류: DB 가져오기에 실패했습니다."
    fi
}

fetch_server_logs() {
    local remote_host="aview.k-fs.co.kr"
    local remote_log_dir="/data/docker/apps/aman/logs"
    local local_tmp_dir="/tmp/aman_logs"

    echo "서버($remote_host)에서 로그를 가져옵니다..."

    mkdir -p "$local_tmp_dir"

    sftp "$remote_host" <<EOF
lcd $local_tmp_dir
cd $remote_log_dir
mget A-Man.log*
quit
EOF

    if [ $? -eq 0 ]; then
        echo "로그 가져오기 성공: $local_tmp_dir"
        ls -lh "$local_tmp_dir"
    else
        echo "오류: 로그 가져오기에 실패했습니다."
    fi
}

#----------------------------------------------------
# 4. 실행 로직 (CLI 인자 처리 또는 단일 메뉴 실행 후 종료)
#----------------------------------------------------

if [ $# -gt 0 ]; then
    # 인자가 있는 경우 CLI 모드로 동작
    case "$1" in
        list)   list_tables ;;
        desc)   desc_table "$2" ;;
        select) select_table "$2" ;;
        run)    run_sql "$2" ;;
        delete) delete_db ;;
        backup) backup_db ;;
        init)   init_db ;;
        fetch)  fetch_server_db ;;
        logs)   fetch_server_logs ;;
        *)      echo "사용법: $0 {list|desc|select|run|delete|backup|init|fetch|logs}" ;;
    esac
    exit 0
fi

# 인자가 없는 경우 대화형 메뉴 (단일 실행 후 종료)
show_header
echo "1. 테이블 목록 (db.sh list)"
echo "2. 테이블 desc (db.sh desc)"
echo "3. 테이블 select (db.sh select)"
echo "4. sql 실행 (db.sh run)"
echo "5. 서버 DB 가져오기 (db.sh fetch)"
echo "6. 서버 logs 가져오기 (db.sh logs)"
echo "7. 데이터베이스 초기화 및 생성 (db.sh init)"
echo "8. 데이터베이스 백업 (db.sh backup)"
echo "---------------------------------------------"
echo "99. db 삭제"
echo "q. 종료"
echo "---------------------------------------------"
read -p "선택: " choice

case "$choice" in
    1) list_tables ;;
    2) desc_table ;;
    3) select_table ;;
    4) run_sql ;;
    5) fetch_server_db ;;
    6) fetch_server_logs ;;
    7) init_db ;;
    8) backup_db ;;
    99) delete_db ;;
    q|Q) exit 0 ;;
    *) echo "잘못된 선택입니다." ;;
esac

exit 0
