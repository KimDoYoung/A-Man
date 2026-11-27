# zip-upload 설계 (zip-upload-설계.md)

`1234.zip`을 업로드하면 aka가 `1234`인 문서를 ZIP 내용으로 **대체**하는 API.
로그인 없이 호출하며, **허용된 IP에서만** 동작한다.

브랜치: `feat/upload-zip`
관련: [multi-instance-설계.md](multi-instance-설계.md) (인스턴스별 `/aman/zip-upload`, `/aman20/zip-upload`)

---

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 문서 식별 | **ZIP 파일 이름 = aka** (`1234.zip` → aka `1234`). 기존 '내보내기'가 `<aka>.zip`을 만드는 것과 같은 규칙 |
| aka 문서가 없을 때 | **오류** (새 문서를 만들지 않음. 새 문서는 화면에서 생성) |
| 문서 상태 | **기존 상태 유지** (발행 문서는 대체 즉시 사용자에게 반영) |
| 잠긴 문서 | **거부** (편집 중인 사람의 작업 보호). 잠금은 자동 만료가 없으므로 응답에 잠근 사람·시각을 알려줌 |
| 인증 | **IP 제한만** (로그인·키 없음) |

---

## 2. API

```
POST /<컨텍스트>/zip-upload        (예: /aman/zip-upload, /aman20/zip-upload)
Content-Type: multipart/form-data
  file = 1234.zip
```

```bash
curl -F "file=@1234.zip" http://localhost:8686/aman/zip-upload
```

### 2.1 ZIP 구조 ('내보내기' 결과와 같음)

```
1234.zip
 ├── <제목>.md          # 마크다운 1개 (최상위 우선, 없으면 하위 폴더에서 탐색)
 └── images/...         # 본문이 참조하는 이미지 (선택)
```

- 중첩 ZIP(Notion 내보내기 등)은 기존 '가져오기'처럼 최대 5단계까지 풀어 탐색한다.
- 제목: 본문의 첫 `# 제목`(H1), 없으면 md 파일 이름. ('가져오기'와 같은 규칙)

### 2.2 응답

| HTTP | 경우 | 본문 (JSON) |
|---|---|---|
| 200 | 대체 성공 | `{"result":"replaced","aka":"1234","pageId":12,"title":"…","status":"PUBLISHED","images":3,"imageUrlBase":"https://…/aman/images/"}` |
| 400 | 파일 없음·이름이 `.zip` 아님·aka 형식 오류·md 없음·압축 해제 실패·제한 초과 | `{"error":"…"}` |
| 403 | 허용되지 않은 IP, 또는 기능 꺼짐 | `{"error":"…","ip":"…"}` |
| 404 | aka 문서 없음 | `{"error":"…","aka":"1234"}` |
| 409 | 문서가 잠겨 있음 | `{"error":"…","lockUser":"…","lockTime":"…"}` |
| 500 | 서버 오류 | `{"error":"…"}` |

- aka 형식: `[A-Za-z0-9_-]{1,64}` (경로 조작 문자 차단)

---

## 3. IP 제한

### 3.1 설정 (`application-<profile>.properties`)

```properties
# zip-upload 허용 여부 (기본 false: 꺼져 있으면 모든 요청 403)
aman.zip-upload.enabled=true
# 허용 IP (쉼표 구분). '.' 또는 ':' 로 끝나면 접두어 일치 (예: 192.168.0.)
aman.zip-upload.allowed-ips=127.0.0.1,::1,0:0:0:0:0:0:0:1
# 앞단 프록시 IP (쉼표 구분, 기본 없음). 여기서 온 요청만 X-Forwarded-For 를 믿는다
aman.zip-upload.trusted-proxies=
```

- 같은 Tomcat의 aman, aman20은 같은 프로필을 쓰므로 **허용 IP도 같다.**

### 3.2 클라이언트 IP 판정

- 기본: `request.getRemoteAddr()`만 사용한다.
- **`X-Forwarded-For`는 믿지 않는다.** 기존 `SecurityUtil.getClientIp`는 이 헤더를 그대로 믿어서
  누구나 `X-Forwarded-For: 127.0.0.1` 헤더만 붙이면 통과할 수 있으므로 zip-upload에는 쓰지 않는다.
- 앞단 프록시가 있다면 `trusted-proxies`에 그 IP를 넣는다.
  remoteAddr가 신뢰 프록시일 때만 `X-Forwarded-For`의 **마지막** 값(프록시가 직접 본 IP)을 사용한다.

### 3.3 구현 위치

- `/zip-upload`에만 적용되는 서블릿 필터 (`ZipUploadIpFilter`, FilterRegistrationBean).
- 컨트롤러·multipart 처리 이전에 차단되므로, 거부된 요청의 파일은 서버에 저장되지 않는다.
- `/zip-upload`는 `/admin` 아래가 아니므로 JWT 검사 대상이 아니다 (SecurityConfig의 permitAll).
- 허용·거부 모두 로그에 남긴다 (IP, 파일 이름, 결과).

---

## 4. 처리 흐름

1. (필터) 기능 켜짐 + IP 허용 확인 → 아니면 403
2. 파일 이름에서 aka 추출·형식 검사 → 400
3. aka 문서 조회 → 없으면 404, 잠겨 있으면 409
4. ZIP 해제 → md 탐색 → 이미지 저장 → 본문 이미지 경로 변경 → 제목 추출 (기존 '가져오기' 로직 재사용)
5. 문서의 제목·본문 갱신 (폴더, 순서, aka, 상태, 잠금 정보는 그대로)
6. 매뉴얼 HTML 캐시 비움 (`manualHtml`)
7. 200 응답

### 4.1 이미지 경로 — 절대 URL

본문 md를 복사해서 다른 사람에게 줘도 이미지가 보이도록 **절대 URL**로 저장한다.
(기존 '가져오기'·이미지 업로드도 절대 URL)

```properties
# 외부 공개 주소. 이미지 URL = <이 값><컨텍스트>/images/yyyy/MM/dd/<uuid>.<ext>
aman.public-base-url=https://aview.k-fs.co.kr:7171
```

- 설정이 있으면 그 값을 쓴다 → 누가 어디서 호출하든 같은 주소.
- 비어 있으면 '가져오기'처럼 **요청 주소**(`scheme://host:port`) 기준.
  - 서버 스크립트가 `curl localhost:...`로 호출하면 본문에 `http://localhost:...`가 들어가
    사용자 화면·외부에서 이미지가 깨진다 → **화면 밖에서 호출하는 서버는 반드시 설정.**
- 응답의 `imageUrlBase`로 실제 사용한 값을 확인할 수 있다.
- 이번 설정은 zip-upload에만 적용. '가져오기'·이미지 업로드는 기존 동작 그대로 (추후 같은 설정 적용 검토).
- 대체 전 문서가 쓰던 이미지 파일은 지우지 않는다 (다른 문서가 같은 파일을 참조할 수 있음).

### 4.2 코드 구조

- 기존 `ContentController.importPageFromZip`의 ZIP 해제·md 탐색·이미지 저장·경로 변경 로직을
  `service/ZipImportService`로 옮기고, '가져오기'와 zip-upload가 함께 쓴다.
  - '가져오기'의 동작(새 DRAFT 문서 생성, 절대 URL)은 그대로.
- 압축 해제 제한 추가 (zip bomb 방지, 두 기능 공통): 해제 후 총 크기 500MB, 항목 수 5,000개
- 새 파일: `controller/ZipUploadController`, `config/ZipUploadIpFilter`(+ 등록), `service/ZipImportService`

---

## 5. 테스트

- 단위: IP 판정 (정확 일치, 접두어, IPv6, 신뢰 프록시일 때만 XFF, XFF 위조 거부, 기능 꺼짐)
- 단위: aka 추출·형식 검사
- 통합(MockMvc): 허용 IP 대체 성공 / 비허용 403 / 없는 aka 404 / 잠김 409 / md 없음 400 / 상태 유지 / 공개 주소 절대 URL

---

## 6. 진행 현황

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 설계 문서 | 완료 |
| 2 | `ZipImportService` 분리 ('가져오기' 동작 유지) | 완료 |
| 3 | `ZipUploadIpFilter` + `ZipUploadConfig` + 프로필 설정 | 완료 |
| 4 | `ZipUploadController` | 완료 |
| 5 | 테스트, lint | 완료 |

- 테스트: `ZipUploadIpFilterTest`(4), `ZipUploadControllerTest`(9, H2 메모리 DB + 임시 base-dir)
  - 대체 성공(상태·순서 유지, 공개 주소 절대 URL 이미지, 파일 저장) / 공개 주소 없을 때 요청 주소 기준 / 없는 aka 404 / 잠김 409 / md 없음 400 /
    잘못된 파일 이름 400 / 비허용 IP 403(X-Forwarded-For 위조 포함) / 파일 이름→aka / **'가져오기' 회귀**
- 프로필 설정: `local`만 `enabled=true`, 나머지(t3600, test=119, omen, dell6820, jskn)는 `false`
- `aman.public-base-url`: 외부 공개가 의미 있는 **119(test), jskn 프로필에만** 둔다. jskn=`https://jskn.iptime.org`, 119=미정.
  로컬 PC의 서버(local, t3600, omen, dell6820)는 설정하지 않음 → 요청 주소 기준

## 7. 서버별로 켤 때 주의

- **docker 컨테이너(t3600, omen, dell6820, jskn)**: 호스트에서 `curl localhost:<포트>/aman/zip-upload`로 호출해도
  컨테이너 안의 Tomcat에는 **docker 게이트웨이 IP**(예: `172.17.0.1`, compose 네트워크면 `172.x.0.1`)로 보인다.
  → 403 응답의 `"ip"` 값을 확인해서 `allowed-ips`에 넣는다.
- **nginx 등 프록시 뒤(jskn, 119?)**: Tomcat에는 프록시 IP로 보인다.
  → 프록시 IP를 `trusted-proxies`에, 실제 호출 PC IP를 `allowed-ips`에 넣는다.
  (프록시가 `X-Forwarded-For`를 `$proxy_add_x_forwarded_for`로 붙여야 함)
- 같은 Tomcat의 aman, aman20은 같은 프로필이라 허용 IP도 같다.
