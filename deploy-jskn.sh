#!/bin/bash
# A-Man 배포 스크립트 — ./deploy.sh
set -e

# 배포 환경 설정 (사용자 환경에 따라 변경 필요)
JSKN="kdy987@jskn.iptime.org"
REMOTE_WEBAPPS="/data/docker/apps/tomcat/webapps"
PROJECT_ROOT="$(cd "$(dirname "$0")/." && pwd)"
STATIC_DIR="$PROJECT_ROOT/backend/src/main/resources/static"

echo "=== A-Man 배포 절차 ==="
echo ""
echo "  [1/4] 프론트엔드 빌드          (npm run build)"
echo "  [2/4] React dist → static 복사  ($STATIC_DIR)"
echo "  [3/4] 백엔드 WAR 빌드           (gradlew war -x test)"
echo "  [4/4] Tomcat으로 전송           ($JSKN:$REMOTE_WEBAPPS/aman.war)"
echo ""
read -r -p "배포를 진행하시겠습니까? (y/n) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "배포를 취소했습니다."
  exit 0
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
./gradlew war -x test

WAR_FILE=$(ls build/libs/*.war 2>/dev/null | head -1)
if [ -z "$WAR_FILE" ]; then
  echo "ERROR: WAR 파일을 찾을 수 없습니다."
  exit 1
fi
echo "  WAR: $WAR_FILE"

# 4. Tomcat webapps로 전송 (이름을 aman.war로 전송)
echo "[4/4] Tomcat 서버로 전송..."
sftp -P 2020 "$JSKN" <<EOF
put $WAR_FILE $REMOTE_WEBAPPS/aman.war
EOF

echo ""
echo "=== 배포 완료 ==="
echo "접속: https://jskn.iptime.org/aman"
echo "API:  https://jskn.iptime.org/aman/health"

#echo "접속: https://aview.k-fs.co.kr:7171/aman"
#echo "API:  https://aview.k-fs.co.kr:7171/aman/health"
