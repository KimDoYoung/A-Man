# 페이지 잠금(Lock) 기능 개발 계획서 (Page Lock Implementation Plan)

이 문서는 A-Man (AssetERP 도움말/매뉴얼 시스템)의 페이지 편집 화면에서 발생할 수 있는 동시성 편집 문제(Overwrite)를 해결하고, 중요 문서의 무단 수정을 방지하기 위해 사용자가 직접 잠금/해제하는 **페이지 잠금(Lock)** 기능의 설계 및 구현 계획서입니다.

---

## 1. 개요 및 설계 결정

### 1.1 테이블 설계
- 잠금 기능은 이력 관리 없이 현재의 일시적인 잠금 상태만을 관리하므로, `pages` 테이블에 직접 잠금 정보를 기록하는 방식을 채택합니다.
- `pages` 테이블에 추가될 컬럼:
  - `lock_user`: 잠근 사용자의 ID (username). NULL이면 잠금 해제 상태.
  - `lock_time`: 잠금 설정 일시.
  - `lock_role`: 잠근 사용자의 역할 권한 (admin / user).

### 1.2 요구사항 반영
- **명시적 잠금 제어**: 편집 진입 시의 자동 잠금이나 30분 시간 제한 만료 등의 자동화 로직은 **구현하지 않습니다**. 사용자가 UI상의 버튼을 통해 직접 명시적으로 잠금 설정/해제를 수행합니다.
- **영향 범위**: 잠금은 **저장(Save)** 및 **삭제(Delete)** 작업 시에만 강제 검사 및 적용됩니다.
- **관리자 검토 기능 및 권한 우위 (Lock Override)**: 
  - 관리자가 문서를 검토한 후 잠금(`lock_role = 'admin'`)을 걸어두면 일반 사용자는 잠금을 해제할 수 없으며, 내용 수정 및 저장 또한 불가능해집니다.
  - 일반 사용자 A가 잠근 상태(`lock_role = 'user'`)에서 편집 중이더라도, **관리자(Admin)는 이 잠금을 덮어쓰고(Override) 즉시 관리자 잠금으로 변경할 수 있습니다.** 관리자가 잠금을 덮어쓰면 일반 사용자 A는 더 이상 저장할 수 없습니다.

---

## 2. 상세 기능 흐름 및 시나리오 검증

### 시나리오 1: A가 페이지를 잠근 경우
- **상태**: `pages.lock_user = 'A'`, `lock_role = 'user'`, `lock_time = '현재'`
- **A의 화면**:
  - 녹색 잠금 안내 배너 표시: `"내가 이 페이지를 잠갔습니다. (잠금일시: ...)"`
  - 에디터가 **편집 가능**하며, "잠금 해제" 버튼이 제공됩니다.
- **B(일반 문서작성자)의 화면**:
  - 적색 경고 배너 표시: `"이 페이지는 A님에 의해 잠겨 있습니다. (잠금일시: ...)"`
  - 에디터와 툴바가 **읽기 전용(Read-Only)** 상태로 전환되고, "저장하기" 및 "삭제하기" 버튼이 **비활성화(Disabled)** 됩니다.
  - 잠금 해제 버튼이 나타나지 않아 해제할 수 없습니다.
- **B(Admin, 관리자)의 화면**:
  - 에디터는 기본적으로 읽기 전용 상태가 되나, 관리자 권한이므로 **"잠금 강제 해제(Force Unlock)"** 및 **"관리자 잠금으로 변경 (Override Lock)"** 버튼이 제공됩니다. (또는 "페이지 잠그기" 클릭 시 즉시 덮어쓰기 수행)

### 시나리오 2: A가 잠그지 않고 편집 중인데, 그 사이에 B가 잠갔을 때
- **상태**: A는 편집 창을 열고 작성 중(잠금 안 함). B가 동일 페이지에 먼저 진입하여 잠금을 설정함.
- **A의 저장 동작**:
  - A가 "저장하기"를 클릭하면 서버에서 DB 상태를 조회해 `lock_user`가 `'B'`임을 인지합니다.
  - 서버는 저장을 거부하고 `400 Bad Request` 에러를 반환합니다: `"이 페이지는 B님에 의해 잠겨 있으므로 저장할 수 없습니다."`
  - A의 브라우저에서 경고 팝업이 노출되며 저장이 무산됩니다. (내용 유실 방지)

### 시나리오 3: A가 잠그고 편집 중인데, Admin이 잠금을 강제 해제했을 때
- **상태**: A가 잠금 설정 (`lock_user = 'A'`). Admin이 잠금을 강제 해제함 (`lock_user = null`).
- **A의 저장 동작**:
  - A가 "저장하기"를 클릭하면 서버로 `lockUser: 'A'` 파라미터가 전송됩니다.
  - 서버에서 DB 상태를 확인하니 잠금 정보가 `null`입니다.
  - **저장은 정상 처리**하되, 성공 응답에 `warning: "LOCK_RELEASED_BY_ADMIN"`를 반환합니다.
  - A의 화면에서 메시지가 표시됩니다: `"관리자에 의해 잠금이 해제되었습니다. 문서가 저장되었습니다."`

### 시나리오 4: Admin이 페이지를 잠근 경우
- **상태**: `pages.lock_user = 'admin1'`, `lock_role = 'admin'`
- **일반 문서작성자의 화면**:
  - 적색 경고 배너 표시: `"이 페이지는 관리자 admin1님에 의해 잠겨 있습니다."`
  - 에디터는 읽기 전용 상태가 되며, 잠금 해제 버튼은 비노출됩니다. 저장/삭제도 모두 차단됩니다.
- **다른 Admin의 화면**:
  - 잠금 정보 배너가 노출되고 **"잠금 해제"** 버튼이 활성화되어 해제가 가능합니다.

---

## 3. 제안된 코드 변경 사항

### 3.1 데이터베이스 DDL 변경 (`sqls/aman_ddl.sql`)
```diff
 CREATE TABLE pages (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     folder_id   INTEGER NOT NULL,                   -- 소속된 폴더 ID
     title       TEXT NOT NULL,                      -- 페이지 제목
     content     TEXT NOT NULL,                      -- 마크다운(md) 문장 본문 원본 전체
     sort_order  INTEGER DEFAULT 0,                  -- 폴더 내에서 페이지 노출 순서
     aka         TEXT NOT NULL UNIQUE,               -- 페이지 별칭
     status      TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')), -- DRAFT(초안), PUBLISHED(발행)
+    lock_user   TEXT DEFAULT NULL,                  -- 잠근 사용자 ID (username)
+    lock_time   DATETIME DEFAULT NULL,              -- 잠금 일시
+    lock_role   TEXT DEFAULT NULL,                  -- 잠근 사용자의 권한 (admin / user)
     created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
     
     FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
 );
```

### 3.2 백엔드 (Java) 변경 사항

#### [MODIFY] `Page.java`
```java
    // 잠금 필드 추가
    @Column(name = "lock_user")
    private String lockUser;

    @Column(name = "lock_time")
    private LocalDateTime lockTime;

    @Column(name = "lock_role")
    private String lockRole;
```

#### [MODIFY] `ContentController.java`
잠금 제어 API 및 저장/삭제 시의 잠금 유효성 검증을 구현합니다.

- **잠금 설정 API (`POST /content/{page_id}/lock`)**:
  - DB의 해당 페이지가 잠겨 있는지 조회합니다.
  - 만약 잠겨 있고, `현재 사용자가 관리자(Admin)가 아니며`, `잠금 주인이 본인이 아니라면` `400 Bad Request` 처리합니다: `"이미 [lockUser]님에 의해 잠겨 있습니다."`
  - 즉, **관리자(Admin)인 경우 이미 잠겨 있더라도 잠금을 덮어써서(Override) 새로운 잠금을 설정**할 수 있습니다.
  - 조건 충족 시 현재 로그인 사용자 및 역할을 등록하여 저장합니다.
- **잠금 해제 API (`POST /content/{page_id}/unlock`)**:
  - 이미 해제 상태라면 성공 처리합니다.
  - 잠겨 있다면 권한을 검사합니다: `현재 사용자 == lock_user` 이거나 `현재 사용자 역할 == admin` 인 경우에만 잠금을 NULL로 해제합니다.
  - 해제 권한이 없다면 `403 Forbidden` 처리합니다.
- **저장 API (`POST /content`) 수정**:
  - 저장 요청 시 DB의 기존 페이지 잠금을 검사합니다.
  - `lock_user != null` 이고 `!lock_user.equals(currentUsername)` 이면 `400 Bad Request` 처리합니다.
  - `lock_user == null` 이고 요청 본문의 `lockUser`가 `currentUsername`이었던 경우 `LOCK_RELEASED_BY_ADMIN` 경고 정보를 결과에 실어 보냅니다.
- **삭제 API (`DELETE /content/{page_id}`) 수정**:
  - `lock_user != null` 이고 `!lock_user.equals(currentUsername)` 이면 `400 Bad Request` 처리합니다.

```java
    private String getLoginUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof String && !"anonymousUser".equals(principal)) {
            return (String) principal;
        }
        return null;
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }
```

### 3.3 프론트엔드 (React + TS) 변경 사항

#### [MODIFY] `types/index.ts`
- `PageData` 인터페이스에 `lockUser`, `lockTime`, `lockRole` 타입(선택적) 추가.

#### [MODIFY] `DocUserMain.tsx`
- 로그인 정보(`currentUser`)를 로컬 스토리지로부터 파싱해 상태로 관리합니다.
- 잠금 설정(`handleLock`) 및 해제(`handleUnlock`) 호출 함수 추가.
- `isLockedByOthers` (다른 사용자에 의해 잠김 여부) 상태를 기반으로:
  - 상단에 안내 배너(잠금 사용자명, 일시, 역할 표시)를 노출합니다.
  - 에디터 컴포넌트(`MarkdownSplitEditor`)에 `readOnly={isLockedByOthers}` 전달.
  - 저장 및 삭제 버튼 비활성화.
  - 관리자(`role == 'admin'`)가 다른 사람의 잠금을 볼 경우 덮어쓰기 기능으로 "페이지 잠그기 (덮어쓰기)" 및 "잠금 강제 해제" 버튼을 제공합니다.
- `handleSave` 호출 결과에 `warning === 'LOCK_RELEASED_BY_ADMIN'`가 감지되면, `alert("관리자에 의해 잠금이 해제되었습니다. 문서가 저장되었습니다.")` 경고 팝업을 표시합니다.

#### [MODIFY] `MarkdownSplitEditor.tsx` & `MdTextarea.tsx` & `EditorToolbar.tsx`
- `readOnly?: boolean` 프로퍼티를 전달받아 처리합니다.
- `readOnly`가 활성화되면 에디터 툴바 컨테이너에 `pointer-events-none opacity-50`을 부여하여 조작을 전면 차단합니다.
- `MdTextarea` 내부의 `textarea` 엘리먼트에 `readOnly={readOnly}` 속성을 연결하고 컨텍스트 메뉴 동작을 조작하지 못하도록 방지합니다.

---

## 4. 검증 계획

### 5.1 수동 테스트 시나리오
1. **사용자 A가 명시적으로 잠근 후 B가 열람**:
   - 일반 문서 작성자 A 계정으로 페이지 로드 -> "페이지 잠그기" 버튼 클릭 -> 잠금 배너 활성화 확인.
   - 일반 문서 작성자 B 계정으로 동일 페이지 로드 -> "A님에 의해 잠겨 있습니다" 배너 확인, 에디터 및 툴바 읽기 전용 여부 확인, 저장/삭제 버튼 비활성화 확인.
2. **관리자 덮어쓰기 (Override)**:
   - 일반 사용자 A가 잠근 페이지에 관리자(Admin)가 진입 -> "페이지 잠그기 (덮어쓰기)" 버튼 노출 확인.
   - 관리자가 클릭 -> 관리자 잠금으로 강제 전환되며 `lock_role = 'admin'`으로 덮어써짐 확인.
   - 이후 A가 "저장하기" 클릭 시 "관리자님에 의해 잠겨 있습니다"로 저장 거부되는지 확인.
3. **소유자 A 또는 관리자가 잠금 해제**:
   - A 계정에서 "잠금 해제" 클릭 -> 정상 해제 및 B가 다시 수정 가능해지는지 확인.
   - Admin 계정으로 로그인하여 동일 페이지 로드 -> A가 잠근 페이지에 "잠금 강제 해제" 버튼 노출 여부 확인 -> 강제 해제 클릭 시 즉각 잠금 해제 확인.
4. **무단 편집 중 저장/삭제 충돌 검증**:
   - A가 잠그지 않고 편집 창에 글을 쓰는 도중에 B가 먼저 잠금을 걸어버림 -> A가 "저장하기" 클릭 시 "B님에 의해 잠겨 있습니다" 에러와 함께 저장 불가 동작 검증.
   - A가 잠근 채 편집하고 있는 도중에 관리자가 강제로 잠금을 해제함 -> A가 "저장하기" 클릭 시 "관리자에 의해 잠금이 해제되었습니다" 알림창이 뜨고 정상 저장 완료되는지 확인.
