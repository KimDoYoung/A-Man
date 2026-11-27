# API설계 

## AuthController : /auth

- 쿠키베이스 jwt 인증

1. post /login
2. post /logout
3. post /refresh

인증을 담당하는 `/auth` 컨트롤러의 설계 역시 **업계 표준(Best Practice)에 완벽히 부합하는 정석적인 구조**입니다. JWT(JSON Web Token) 기반의 Access Token과 Refresh Token 메커니즘을 사용할 때 가장 흔하고 안전하게 쓰이는 형태입니다.

몇 가지 세부적인 검토 사항과 실무적인 팁을 정리해 드립니다.

---

## 🛠️ Auth API 설계 검토 및 피드백

### 1. `POST /login`

* **검토:** 아주 좋습니다. 로그인 정보(아이디/비밀번호 등)는 민감한 데이터이므로, URL에 노출되지 않도록 **`POST` 메서드의 Request Body**에 담아 보내야 합니다.
* **보안 팁:** 로그인 성공 시 토큰을 발급할 때, **Access Token은 JSON Response**로 반환하더라도 Refresh Token은 `HttpOnly`, `Secure`, `SameSite=Strict` 옵션이 걸린 쿠키(Cookie)에 담아 반환하는 것이 클라이언트 측 스크립트 해킹(XSS)으로부터 안전합니다.

### 2. `POST /logout`

* **검토:** 적절합니다. 로그아웃은 단순히 클라이언트가 토큰을 버리는 것을 넘어, 서버 측에서도 해당 세션이나 Refresh Token을 만료(블랙리스트 처리 또는 DB 삭제)시키는 **상태 변경 작업**이 수반되므로 `POST`가 올바른 선택입니다.

### 3. `POST /refresh`

* **검토:** 완벽합니다. Access Token이 만료되었을 때, 기존의 Refresh Token을 검증하여 새로운 Access Token(필요 시 새로운 Refresh Token까지)을 재발급하는 엔드포인트입니다. 이 역시 새로운 자원(토큰 세트)을 생성해 내는 과정이므로 `POST`가 시만틱하게 맞습니다.

---

## 📋 Auth API 명세서 요약 (Markdown Table)

앞서 작성한 `/user` 명세와 함께 매끄럽게 연결되도록 구성한 표입니다.

| HTTP 메서드 | 엔드포인트 | 필요한 인증/토큰 | 주요 기능 및 처리 로직 |
| --- | --- | --- | --- |
| **`POST`** | `/auth/login` | 없음 | **로그인 및 토큰 발급**<br>

<br>• 인증 성공 시 Access Token 및 Refresh Token 생성 및 반환 |
| **`POST`** | `/auth/logout` | Refresh Token 필요 | **로그아웃 처리**<br>

<br>• 서버 DB 또는 Redis에서 해당 Refresh Token 삭제/만료 처리 |
| **`POST`** | `/auth/refresh` | Refresh Token 필요 | **토큰 재발급 (Refresh)**<br>

<br>• 만료된 Access Token을 대신해, 유효한 Refresh Token 확인 후 새 토큰 발급 |

---

## 💡 실무 구현 시 핵심 체크리스트 (토큰 메커니즘 순서)

1. **Access Token 만료 시간:** 보통 **15분 ~ 1시간** 정도로 짧게 유지합니다.
2. **Refresh Token 만료 시간:** 보통 **7일 ~ 14일** 정도로 길게 유지하며, 무상태(Stateless) JWT라 하더라도 로그아웃 및 강제 만료 제어를 위해 서버측 저장소(DB 또는 Redis)에 기록하여 검증하는 것이 안전합니다.
3. **RTR (Refresh Token Rotation) 도입 고려:** `/auth/refresh` 요청이 들어올 때마다 Access Token뿐만 아니라 **Refresh Token도 매번 새로 갱신**해 주는 기법입니다. 탈취된 Refresh Token의 악용을 원천 차단할 수 있어 최근 많이 선호되는 방식입니다.


UserController : /user

### 📋 최종 추천 API 명세서 (RESTful 반영)

| HTTP 메서드 | 엔드포인트 | 접근 권한 (Role) | 주요 기능 및 처리 로직 |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/user` | `admin` | **신규 사용자 생성**<br>• 관리자 전용 신규 계정 생성 기능 |
| **`GET`** | `/user` | `admin` | **전체 사용자 목록 조회**<br>• 시스템에 등록된 모든 사용자 리스트 반환 (페이징/검색 권한) |
| **`GET`** | `/user/{user_id}` | 본인 또는 `admin` | **특정 사용자 상세 조회**<br>• 요청자 본인의 정보이거나 관리자일 때만 접근 허용 |
| **`PATCH`** | `/user/{user_id}` | 본인 또는 `admin` | **사용자 정보 수정 (권한별 차등)**<br>• `admin`: 모든 필드 수정 가능<br>• `user` (본인): `password`, `email` 필드만 수정 허용 (그 외 필드는 무시 또는 403 에러) |
| **`DELETE`** | `/user/{user_id}` | 本인 또는 `admin` | **사용자 삭제 (Soft Delete)**<br>• 실제 Row를 삭제하지 않고 데이터베이스의 `is_active` 상태를 `false`로 변경 |


---


## 일반사용자용 /docs

- 아무런 보안체크가 없이 free pass

- get /docs/{page_id} : pages에서 id의 내용을 get
- get /docs/folders?filter=    : folders 테이블에서 가져온다.
- get /docs/folders/sub/{folder_id} : 하위 폴더 리스트를 가져온다. sub의 sub는 가져오지 않는다.

### HTTP 메서드,엔드포인트,보안 / 인증,주요 기능 및 처리 로직
GET,/docs/{page_id},Free Pass (없음),특정 페이지 본문 조회• pages 테이블에서 마크다운 본문 및 상세 정보 조회
GET,/docs/folders,Free Pass (없음),전체 폴더 조회 및 필터링• folders 목록 반환• ?filter=검색어 지원
GET,/docs/folders/{folder_id}/sub,Free Pass (없음),직속 하위 폴더 목록 조회 (1단계만)• parent_id = folder_id인 폴더만 조회 (자식의 자식은 제외)

## 문서사용자용  /content

- post : pages 테이블에 upsert, id의 존재 여부에 따라서 upsert수행
- get : /{page_id} 
- delete : /{page_id} 삭제
- post :/image : image data를 image folder하위에 yyyy/mm/dd로 폴더를 만든 후 그 안에 png 포맷으로 저장한 후 url을 리턴해 준다.
  - 파일명은 uuid에서 '-'를 빼고 .png를 붙인다.
    data/
    └── images/
        └── 2026/
            └── 06/
                └── 23/
                    └── 4a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.png 
  - url : baseurl/images/2026/06/23/4a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.png 
  
### HTTP 메서드,엔드포인트,접근 권한,주요 기능 및 처리 로직
POST,/content,문서 작성자/Admin,"페이지 Upsert• Request Body에 id가 포함되어 있고 매칭되는 데이터가 있으면 Update, 없으면 Insert 수행"
GET,/content/{page_id},문서 작성자/Admin,편집용 페이지 상세 조회• 공개용(/docs/{id})과 별개로 편집기 로드 등을 위한 상세 데이터 조회
DELETE,/content/{page_id},문서 작성자/Admin,페이지 영구 삭제 (Hard Delete)• /user와 달리 문서나 미디어는 공간 확보 및 완전 제외를 위해 실제 Row를 삭제하는 경우가 많음
POST,/content/image,문서 작성자/Admin,이미지 업로드 및 URL 반환• multipart/form-data 수신• PNG 변환 후 날짜별 경로 저장 및 정제된 URL 리턴

## 자원들

- /images 하위는 모두 free pass
