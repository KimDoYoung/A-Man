#!/usr/bin/env bash
#============================================================================
# sync-users-119.sh - 로컬 DB의 users 테이블을 119 서버 DB로 동기화하는 스크립트
#============================================================================

set -euo pipefail

LOCAL_DB="/home/kdy987/work/aman/aman-base-dir/db/aman.db"
REMOTE_USER="asseterp"
REMOTE_HOST="183.96.184.119"
REMOTE_DB="/data/asseterp/aman/db/aman.db"

# ── 1. 로컬 DB 존재 확인 ──────────────────────────────────────────────────
if [ ! -f "$LOCAL_DB" ]; then
    echo "[ERROR] 로컬 DB 파일이 존재하지 않습니다: $LOCAL_DB"
    exit 1
fi

# ── 2. 로컬 users 테이블 데이터 추출 ────────────────────────────────────────
echo "1. 로컬 users 데이터 추출 중..."
SQL_DATA=$(sqlite3 "$LOCAL_DB" ".mode insert users" "SELECT * FROM users;")

if [ -z "$SQL_DATA" ]; then
    echo "[WARN] 로컬 users 테이블에 데이터가 없습니다."
    exit 0
fi

# ── 3. 원격지 DB 동기화 실행 (SSH + sqlite3) ──────────────────────────────
echo "2. 119 원격 서버의 users 테이블 데이터 동기화 중..."
echo "SSH 접속 비밀번호를 요구하는 경우 비밀번호를 입력해주세요."
echo ""

# SSH 표준 입력을 통해 원격 sqlite3에 쿼리 주입
ssh "${REMOTE_USER}@${REMOTE_HOST}" "sqlite3 ${REMOTE_DB}" <<EOF
DELETE FROM users;
${SQL_DATA}
.quit
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "=== users 테이블 동기화 성공! ==="
    echo "  - 로컬 DB: $LOCAL_DB"
    echo "  - 원격 DB: $REMOTE_USER@$REMOTE_HOST:$REMOTE_DB"
else
    echo ""
    echo "[ERROR] 동기화 도중 오류가 발생했습니다."
    exit 1
fi
