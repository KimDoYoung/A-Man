#!/bin/bash
# A-Man 배포 스크립트 — ./deploy-jskn.sh
set -e

# 배포 환경 설정 (사용자 환경에 따라 변경 필요)
JSKN="kdy987@jskn.iptime.org"
REMOTE_DATA="/data/docker/apps/aman/data"
PROJECT_ROOT="$(cd "$(dirname "$0")/." && pwd)"
STATIC_DIR="$PROJECT_ROOT/backend/src/main/resources/static"

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
echo "  [1/4] 프론트엔드 빌드          (npm run build)"
echo "  [2/4] React dist → static 복사  ($STATIC_DIR)"
echo "  [3/4] 백엔드 WAR 빌드           (gradlew bootWar -x test)"
echo "  [4/4] Tomcat 빌드 폴더로 전송    ($JSKN:$REMOTE_DATA/)"
echo "        (war 파일 및 Dockerfile 전송)"
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
echo "[1/4] 프론트엔드 빌드..."
cd "$PROJECT_ROOT/frontend"
npm run build

# 2. dist → backend/src/main/resources/static 복사
echo "[2/4] React dist → Spring Boot static 복사..."
rm -rf "$STATIC_DIR"
cp -r "$PROJECT_ROOT/frontend/dist" "$STATIC_DIR"

# 3. 백엔드 WAR 빌드
echo "[3/4] 백엔드 WAR 빌드 (React 포함)..."
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
ssh -p 2020 "$JSKN" "mkdir -p $REMOTE_DATA"

# DB 초기화가 켜진 경우에만 로컬에서 신규 DB 생성 및 원격 디렉토리 생성
if [ "$INIT_DB" = true ]; then
  echo "  [옵션] 원격 데이터베이스 초기화용 임시 DB 생성 중..."
  TEMP_DB="/tmp/aman_init.db"
  rm -f "$TEMP_DB"
  
  sqlite3 "$TEMP_DB" < "$PROJECT_ROOT/sqls/aman_ddl.sql"
  sqlite3 "$TEMP_DB" < "$PROJECT_ROOT/sqls/aman_test_data.sql"
  
  echo "  로컬 임시 DB 생성 완료: $TEMP_DB"
  
  echo "  원격 서버 DB 디렉토리 구조 생성 중..."
  ssh -p 2020 "$JSKN" "mkdir -p /data/docker/apps/aman/db"
fi

# 4. Tomcat 빌드용 데이터(war, Dockerfile) 및 DB 전송
echo "[4/4] Tomcat 서버로 파일 전송..."
if [ "$INIT_DB" = true ]; then
  sftp -P 2020 "$JSKN" <<EOF
put $TEMP_DB /data/docker/apps/aman/db/aman.db
put $WAR_FILE $REMOTE_DATA/aman.war
put $PROJECT_ROOT/Dockerfile $REMOTE_DATA/Dockerfile
EOF
  rm -f "$TEMP_DB"
else
  sftp -P 2020 "$JSKN" <<EOF
put $WAR_FILE $REMOTE_DATA/aman.war
put $PROJECT_ROOT/Dockerfile $REMOTE_DATA/Dockerfile
EOF
fi

echo ""
echo "=== 배포 완료 ==="
echo "접속: https://jskn.iptime.org/aman"
echo "API:  https://jskn.iptime.org/aman/health"

#echo "접속: https://aview.k-fs.co.kr:7171/aman"
#echo "API:  https://aview.k-fs.co.kr:7171/aman/health"
