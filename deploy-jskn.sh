#!/bin/bash
# A-Man 배포 스크립트 — ./deploy-jskn.sh
set -e

# 배포 환경 설정 (사용자 환경에 따라 변경 필요)
JSKN="jskn"
REMOTE_DATA="/data/docker/apps/aman/data"
PROJECT_ROOT="$(cd "$(dirname "$0")/." && pwd)"
STATIC_DIR="$PROJECT_ROOT/backend/src/main/resources/static"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# Java 버전 체크 (Java 8 필수)
check_java_version() {
  if ! command -v java &>/dev/null; then
    echo -e "${RED}[ERROR]${NC} Java 명령어를 찾을 수 없습니다. Java 8 (1.8) 설치가 필요합니다."
    exit 1
  fi

  local raw_ver
  raw_ver=$(java -version 2>&1 | head -n 1)
  local ver_str
  ver_str=$(echo "$raw_ver" | sed -E 's/.*version "([^"]+)".*/\1/')

  local major_ver=""
  if [[ "$ver_str" =~ ^1\.([0-9]+) ]]; then
    major_ver="${BASH_REMATCH[1]}"
  elif [[ "$ver_str" =~ ^([0-9]+) ]]; then
    major_ver="${BASH_REMATCH[1]}"
  fi

  if [[ "$major_ver" != "8" ]]; then
    echo ""
    echo -e "${RED}================================================================${NC}"
    echo -e "${RED}[ERROR] Java 버전 오류: 배포 작업을 중지합니다.${NC}"
    echo -e "${YELLOW}[WARN]  현재 감지된 Java 버전 : ${BOLD}${ver_str:-$raw_ver}${NC}"
    echo -e "${YELLOW}[WARN]  요구되는 Java 버전   : ${BOLD}Java 8 (1.8)${NC}"
    echo -e "${YELLOW}[WARN]  A-Man 배포 빌드는 반드시 Java 8 환경에서 실행해야 합니다.${NC}"
    echo -e "${YELLOW}[WARN]  Java 8로 버전을 변경(JAVA_HOME/PATH 설정)한 후 다시 시도해 주세요.${NC}"
    echo -e "${RED}================================================================${NC}"
    echo ""
    exit 1
  fi
}

check_java_version

# 기본값: DB 초기화 실행 안 함
INIT_DB=false

# CLI 인자 검사
for arg in "$@"; do
  case $arg in
    --init-db)
      INIT_DB=true
      shift
      ;;
  esac
done

echo "=== A-Man 배포 절차 ==="
echo ""
echo "  [1/5] 프론트엔드 빌드          (npm run build)"
echo "  [2/5] React dist → static 복사  ($STATIC_DIR)"
echo "  [3/5] 백엔드 WAR 빌드           (gradlew bootWar -x test)"
echo "  [4/5] Tomcat 빌드 폴더로 전송    ($JSKN:$REMOTE_DATA/)"
echo "  [5/5] 원격 서버 컨테이너 재빌드 (docker compose up -d --build aman)"
if [ "$INIT_DB" = true ]; then
  echo "        (* 옵션 감지: 원격 DB 초기화 및 전송 예정)"
fi
echo ""

read -r -p "배포를 진행하시겠습니까? (y/n) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "배포를 취소했습니다."
  exit 0
fi

# --init-db 인자가 들어온 경우에만 재확인 질문 수행
if [ "$INIT_DB" = true ]; then
  echo ""
  echo "⚠️⚠️⚠️ WARNING ⚠️⚠️⚠️"
  echo "원격 서버의 데이터베이스(aman.db)를 완전히 새로 생성하여 덮어씁니다."
  echo "기존에 저장된 모든 메뉴와 문서 데이터가 삭제됩니다!"
  read -r -p "정말 진행하시겠습니까? (y/N) " CONFIRM_DB
  if [[ "$CONFIRM_DB" != "y" && "$CONFIRM_DB" != "Y" ]]; then
    echo "DB 초기화를 취소하고 일반 WAR 배포만 진행합니다."
    INIT_DB=false
  fi
fi

echo ""
echo "=== A-Man 배포 시작 ==="

# 1. 프론트엔드 빌드
echo "[1/5] 프론트엔드 빌드..."
cd "$PROJECT_ROOT/frontend"
npm run build

# 2. dist → backend/src/main/resources/static 복사
echo "[2/5] React dist → Spring Boot static 복사..."
rm -rf "$STATIC_DIR"
cp -r "$PROJECT_ROOT/frontend/dist" "$STATIC_DIR"

# 3. 백엔드 WAR 빌드
echo "[3/5] 백엔드 WAR 빌드 (React 포함)..."
cd "$PROJECT_ROOT/backend"
./gradlew bootWar -x test

WAR_FILE=$(ls build/libs/*.war 2>/dev/null | head -1)
if [ -z "$WAR_FILE" ]; then
  echo "ERROR: WAR 파일을 찾을 수 없습니다."
  exit 1
fi
echo "  WAR: $WAR_FILE"

# 원격지의 빌드 데이터 폴더 생성 보장
echo "  원격 서버 배포용 데이터 디렉토리 생성 중..."
ssh "$JSKN" "mkdir -p $REMOTE_DATA"

# DB 초기화가 켜진 경우에만 로컬에서 신규 DB 생성 및 원격 디렉토리 생성
if [ "$INIT_DB" = true ]; then
  echo "  [옵션] 원격 데이터베이스 초기화용 임시 DB 생성 중..."
  TEMP_DB="/tmp/aman_init.db"
  rm -f "$TEMP_DB"
  
  sqlite3 "$TEMP_DB" < "$PROJECT_ROOT/sqls/aman_ddl.sql"
  sqlite3 "$TEMP_DB" < "$PROJECT_ROOT/sqls/aman_test_data.sql"
  
  echo "  로컬 임시 DB 생성 완료: $TEMP_DB"
  
  echo "  원격 서버 DB 디렉토리 구조 생성 중..."
  ssh "$JSKN" "mkdir -p /data/docker/apps/aman/db"
fi

# 4. Tomcat 빌드용 데이터(war, Dockerfile) 및 DB 전송
echo "[4/5] Tomcat 서버로 파일 전송..."
if [ "$INIT_DB" = true ]; then
  sftp "$JSKN" <<EOF
put $TEMP_DB /data/docker/apps/aman/db/aman.db
put $WAR_FILE $REMOTE_DATA/aman.war
put $PROJECT_ROOT/Dockerfile $REMOTE_DATA/Dockerfile
EOF
  rm -f "$TEMP_DB"
else
  sftp "$JSKN" <<EOF
put $WAR_FILE $REMOTE_DATA/aman.war
put $PROJECT_ROOT/Dockerfile $REMOTE_DATA/Dockerfile
EOF
fi

# 5. 원격 서버 컨테이너 재빌드 및 재시작
echo "[5/5] 원격 서버 Docker 컨테이너 재빌드 및 재시작..."
ssh "$JSKN" "cd /data/docker && docker compose up -d --build aman"

echo ""
echo "=== 배포가 성공적으로 완료되었습니다 ==="
echo "접속: https://jskn.iptime.org/aman"
echo "API:  https://jskn.iptime.org/aman/health"

