#!/usr/bin/env bash
#============================================================================
# zip-upload-test.sh - zip-upload API 호출 시험 스크립트 (docs/zip-upload-설계.md)
#
#   ./zip-upload-test.sh <base-url> <zip파일> [-k]
#   예) ./zip-upload-test.sh http://localhost:8686/aman 1234.zip
#
#   자세한 설명: ./zip-upload-test.sh --help
#============================================================================

set -euo pipefail

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
NC=$'\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# 서버의 ZipUploadController.AKA_PATTERN 과 같은 규칙
AKA_REGEX='^[A-Za-z0-9_-]{1,64}$'

usage() {
    echo "사용법: ./zip-upload-test.sh <base-url> <zip파일> [-k]"
    echo "자세한 설명: ./zip-upload-test.sh --help"
}

show_help() {
    cat <<EOF
${BOLD}zip-upload 시험 스크립트 (zip-upload-test.sh)${NC}

  <aka>.zip 파일을 A-Man 의 zip-upload API 로 올려서,
  aka 가 같은 문서의 제목·본문을 ZIP 내용으로 바꿉니다. (새 문서는 만들지 않음)
  올리기 전에 ZIP 내용을 미리 보여주고, 결과(HTTP 코드와 JSON)를 풀어서 설명합니다.

${BOLD}사용법${NC}
  ./zip-upload-test.sh <base-url> <zip파일> [-k]

  <base-url>  A-Man 주소 (컨텍스트까지). 끝의 / 나 /zip-upload 는 붙여도 됩니다.
              예) http://localhost:8686/aman    (로컬 bootRun)
                  http://localhost:8081/aman20  (t3600 docker)
                  https://aview.k-fs.co.kr:7171/aman  (119)
  <zip파일>   올릴 파일. ${BOLD}파일 이름이 곧 aka${NC} 입니다 (1234.zip → aka 1234).
              영문·숫자·_·- 만 가능. 문서편집의 '내보내기'로 받은 ZIP 을 그대로 쓰면 됩니다.
  -k          https 인증서 검사를 하지 않음 (사설 인증서 서버 시험용)

${BOLD}예시${NC}
  ./zip-upload-test.sh http://localhost:8686/aman 1234.zip
  ./zip-upload-test.sh http://localhost:8081/aman20 ~/Downloads/page-1c6f71874632.zip
  ./zip-upload-test.sh https://aview.k-fs.co.kr:7171/aman 1110.zip

${BOLD}ZIP 구조 ('내보내기' 결과와 같음)${NC}
  <제목>.md      마크다운 1개 (본문의 첫 '# 제목' 이 새 제목이 됨)
  images/...     본문이 참조하는 이미지 (선택)

${BOLD}결과 코드${NC}
  200  대체 성공 (문서 상태·폴더·순서는 그대로, 제목·본문만 바뀜)
  400  파일 이름 형식 오류, ZIP 안에 .md 없음, 압축 해제 실패 등
  403  허용되지 않은 IP 이거나 기능이 꺼져 있음 → 응답의 ip 를 서버 설정에 추가
  404  그 aka 문서가 없음 (화면에서 먼저 문서를 만들고 aka 를 지정)
  409  누군가 편집 중(잠금)인 문서 → 화면에서 잠금 해제 후 다시 시도
  500  서버 내부 오류 → 서버 로그(A-Man.log) 확인

${BOLD}서버 설정 (backend/src/main/resources/application-<프로필>.properties)${NC}
  aman.zip-upload.enabled=true              기능 켜기 (기본 false)
  aman.zip-upload.allowed-ips=127.0.0.1,... 허용 IP ('.' 로 끝나면 접두어 일치)
  aman.zip-upload.trusted-proxies=          앞단 프록시 IP (있을 때만)
  aman.public-base-url=https://...          이미지 절대 URL 앞부분 (119, jskn)
  ※ docker 서버는 호스트에서 호출해도 게이트웨이 IP(172.x)로 보입니다.
    먼저 한 번 호출해서 403 응답의 ip 값을 확인하세요.

${BOLD}종료 코드${NC}
  0 = 200 성공,  1 = 그 외 (스크립트에서 성공 여부 판단에 사용)
EOF
}

# ── 인자 ──────────────────────────────────────────────────────────────────
INSECURE=()
POSITIONAL=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) show_help; exit 0 ;;
        -k|--insecure) INSECURE=(-k) ;;
        -*) error "알 수 없는 옵션: $arg"; usage; exit 1 ;;
        *) POSITIONAL+=("$arg") ;;
    esac
done
if [ ${#POSITIONAL[@]} -ne 2 ]; then
    usage
    exit 1
fi

BASE_URL="${POSITIONAL[0]}"
ZIP_FILE="${POSITIONAL[1]}"

command -v curl &>/dev/null || { error "curl 이 필요합니다."; exit 1; }

# base-url 정리: 끝의 / 와 /zip-upload 제거 후 다시 붙임
BASE_URL="${BASE_URL%/}"
BASE_URL="${BASE_URL%/zip-upload}"
BASE_URL="${BASE_URL%/}"
if [[ ! "$BASE_URL" =~ ^https?:// ]]; then
    error "base-url 은 http:// 또는 https:// 로 시작해야 합니다: $BASE_URL"
    exit 1
fi
URL="$BASE_URL/zip-upload"

# ── ZIP 파일 검사 ─────────────────────────────────────────────────────────
[ -f "$ZIP_FILE" ] || { error "파일이 없습니다: $ZIP_FILE"; exit 1; }
FILE_NAME="$(basename "$ZIP_FILE")"
if [[ ! "${FILE_NAME,,}" == *.zip ]]; then
    error "파일 이름이 .zip 으로 끝나야 합니다: $FILE_NAME"
    exit 1
fi
AKA="${FILE_NAME%.*}"
if [[ ! "$AKA" =~ $AKA_REGEX ]]; then
    error "파일 이름(aka)은 영문·숫자·_·- 만 가능합니다 (최대 64자): $FILE_NAME"
    exit 1
fi

echo ""
echo -e "${CYAN}${BOLD}══ zip-upload 시험 ══${NC}"
info "주소     : ${BOLD}$URL${NC}"
info "파일     : $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"
info "대상 aka : ${BOLD}$AKA${NC}"

# ZIP 내용 미리보기 (unzip 이 있을 때)
if command -v unzip &>/dev/null; then
    if LISTING="$(unzip -Z1 "$ZIP_FILE" 2>/dev/null)"; then
        md_count="$(echo "$LISTING" | { grep -ci '\.md$' || true; })"
        img_count="$(echo "$LISTING" | { grep -ciE '\.(png|jpe?g|gif|webp|svg|bmp)$' || true; })"
        info "ZIP 내용 : md ${md_count}개, 이미지 ${img_count}개, 전체 $(echo "$LISTING" | grep -c .)개"
        echo "$LISTING" | { grep -i '\.md$' || true; } | head -n 3 | sed 's/^/             - /'
        if [ "$md_count" = 0 ]; then
            warn "ZIP 안에 .md 파일이 보이지 않습니다 (중첩 ZIP 이면 서버가 풀어서 찾습니다)"
        fi
    else
        warn "ZIP 파일을 읽을 수 없습니다 (손상되었거나 ZIP 이 아닐 수 있음). 그대로 올려봅니다."
    fi
fi
echo ""

# ── 호출 ──────────────────────────────────────────────────────────────────
RES_FILE="$(mktemp)"
trap 'rm -f "$RES_FILE"' EXIT

info "업로드 중..."
set +e
HTTP_CODE="$(curl -sS "${INSECURE[@]}" --max-time 300 -o "$RES_FILE" -w '%{http_code}' \
    -F "file=@${ZIP_FILE};type=application/zip" "$URL")"
CURL_RC=$?
set -e

if [ $CURL_RC -ne 0 ]; then
    error "서버에 연결하지 못했습니다 (curl 종료 코드 $CURL_RC)."
    warn "주소가 맞는지, 서버가 실행 중인지 확인하세요: $URL"
    [ $CURL_RC -eq 60 ] && warn "인증서 오류입니다. 사설 인증서라면 -k 옵션을 붙이세요."
    exit 1
fi

# JSON 값 하나 꺼내기 (python3 가 있으면 사용)
json_get() {
    if command -v python3 &>/dev/null; then
        python3 -c 'import json,sys
try:
    v=json.load(open(sys.argv[1])).get(sys.argv[2])
    print("" if v is None else v)
except Exception:
    pass' "$RES_FILE" "$1"
    fi
}

echo ""
echo -e "${BOLD}HTTP ${HTTP_CODE}${NC}"
if command -v python3 &>/dev/null && python3 -m json.tool "$RES_FILE" &>/dev/null; then
    python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])), ensure_ascii=False, indent=2))' "$RES_FILE"
else
    cat "$RES_FILE"; echo ""
fi
echo ""

# ── 결과 해석 ─────────────────────────────────────────────────────────────
case "$HTTP_CODE" in
    200)
        info "${BOLD}성공${NC}: aka $AKA 문서를 대체했습니다. 제목: $(json_get title), 상태: $(json_get status), 이미지 $(json_get images)개"
        info "이미지 주소 앞부분: $(json_get imageUrlBase)"
        info "확인: ${BASE_URL}/manual/${AKA}  (발행(PUBLISHED) 문서만 보임)"
        exit 0
        ;;
    400) error "요청 오류: $(json_get error)" ;;
    403)
        error "거부됨: $(json_get error)"
        warn "서버가 본 호출자 IP: ${BOLD}$(json_get ip)${NC}"
        warn "→ 서버 프로필의 aman.zip-upload.enabled=true 와 allowed-ips 에 이 IP 가 있는지 확인하세요."
        ;;
    404)
        if [ -n "$(json_get aka)" ]; then
            error "문서 없음: $(json_get error)"
            warn "→ 화면에서 문서를 만들고 aka 를 '$AKA' 로 지정한 뒤 다시 시도하세요."
        else
            # zip-upload 의 JSON 응답이 아님 → API 가 없는 주소
            error "zip-upload API 를 찾을 수 없습니다. base-url 의 컨텍스트(/aman, /aman20)와 서버 버전을 확인하세요."
        fi
        ;;
    409)
        error "잠긴 문서: $(json_get error)"
        warn "→ 잠근 사람: $(json_get lockUser), 잠근 시각: $(json_get lockTime). 화면(페이지 관리)에서 잠금 해제 후 다시 시도."
        ;;
    413) error "파일이 너무 큽니다 (서버 업로드 한도 200MB)." ;;
    405) error "zip-upload API 가 없는 주소일 수 있습니다. base-url 의 컨텍스트(/aman, /aman20)를 확인하세요." ;;
    5*) error "서버 오류: $(json_get error) → 서버 로그(A-Man.log)를 확인하세요." ;;
    *)  error "예상하지 못한 응답입니다 (HTTP $HTTP_CODE)." ;;
esac
exit 1
