#!/bin/bash
set -e

# Resolve scripting and root paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "=========================================================="
echo " 마크다운-HTML 파서 동일성 검증 테스트 시작"
echo " backend 자바로 md->html과 frontend ts로 md->html이 동일하게 동작하는지 테스트함"
echo " test-source.md를 소스로 사용함. 결과는 results 폴더에 생성"
echo "=========================================================="

# 1. Create results folder (기존 결과 폴더를 비우고 새로 생성)
rm -rf "$SCRIPT_DIR/results"
mkdir -p "$SCRIPT_DIR/results"


# 2. Ensure tools dependencies are installed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "[초기화] 테스트 도구용 npm 의존성 패키지 설치 중..."
    (cd "$SCRIPT_DIR" && npm install)
else
    echo "[초기화] 테스트 도구 의존성 검증 완료: OK"
fi

# 3. Compile backend Java source code to ensure MarkdownParserCLI is built
echo "[초기화] Java 백엔드 소스코드 컴파일 중..."
(cd "$ROOT_DIR/backend" && ./gradlew compileJava)

# 4. Run the comparison test script
echo "[테스트] 마크다운 변환 비교 러너 실행 중..."
node "$SCRIPT_DIR/compare-markdown-rendering.mjs"

