-- -------------------------------------------------------------
-- 사용자
-- -------------------------------------------------------------
DELETE FROM users;
DELETE FROM sqlite_sequence WHERE name='users';
insert into users (username, password, email, name, role) values ('admin', '1111', 'kdy987@gmail.com', '관리자', 'admin');



-- -------------------------------------------------------------
-- folders
-- -------------------------------------------------------------
-- 외래 키 제약 조건 활성화
PRAGMA foreign_keys = ON;

-- 기존 데이터 청소 (테스트용)
DELETE FROM folders;
DELETE FROM sqlite_sequence WHERE name='folders'; -- ID 자동 증가 초기화

-- ====================================================================
-- 1. 시스템 설정 (대분류 - Level 1)
-- ====================================================================
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (1, '1', '시스템 설정', NULL, 1, 1);

-- [중분류 - Level 2]
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (2, '1.1', '권한 및 보안', 1, 2, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (3, '1.2', '시스템 로그', 1, 2, 2);

-- [소분류 - Level 3] 권한 및 보안 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (4, '1.1.1', '사용자 관리', 2, 3, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (5, '1.1.2', '메뉴 권한 설정', 2, 3, 2);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (6, '1.1.3', '접근 제어 정책', 2, 3, 3);

-- [소분류 - Level 3] 시스템 로그 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (7, '1.2.1', '로그인 이력 조회', 3, 3, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (8, '1.2.2', '데이터 변경 이력', 3, 3, 2);


-- ====================================================================
-- 2. 인사/급여 관리 (대분류 - Level 1)
-- ====================================================================
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (9, '2', '인사/급여 관리', NULL, 1, 2);

-- [중분류 - Level 2]
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (10, '2.1', '인사 기본 관리', 9, 2, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (11, '2.2', '근태 관리', 9, 2, 2);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (12, '2.3', '급여 정산', 9, 2, 3);

-- [소분류 - Level 3] 인사 기본 관리 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (13, '2.1.1', '사원 정보 등록', 10, 3, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (14, '2.1.2', '부서/직급 관리', 10, 3, 2);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (15, '2.1.3', '인사 발령 기록', 10, 3, 3);

-- [소분류 - Level 3] 근태 관리 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (16, '2.2.1', '일일 근태 현황', 11, 3, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (17, '2.2.2', '휴가/연차 신청', 11, 3, 2);

-- [소분류 - Level 3] 급여 정산 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (18, '2.3.1', '월별 급여 대장', 12, 3, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (19, '2.3.2', '상여금 관리', 12, 3, 2);


-- ====================================================================
-- 3. 영업/구매 관리 (대분류 - Level 1)
-- ====================================================================
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (20, '3', '영업/구매 관리', NULL, 1, 3);

-- [중분류 - Level 2]
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (21, '3.1', '영업/매출 관리', 20, 2, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (22, '3.2', '구매/매입 관리', 20, 2, 2);

-- [소분류 - Level 3] 영업/매출 관리 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (23, '3.1.1', '고객사 정보 관리', 21, 3, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (24, '3.1.2', '수주 등록/조회', 21, 3, 2);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (25, '3.1.3', '출고 및 매출 세금계산서', 21, 3, 3);

-- [소분류 - Level 3] 구매/매입 관리 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (26, '3.2.1', '공급사(거래처) 관리', 22, 3, 1);
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (27, '3.2.2', '발주서 작성', 22, 3, 2);


-- ====================================================================
-- 4. 재무/회계 관리 (대분류 - Level 1)
-- ====================================================================
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (28, '4', '재무/회계 관리', NULL, 1, 4);

-- [중분류 - Level 2]
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (29, '4.1', '전표 관리', 28, 2, 1);

-- [소분류 - Level 3] 전표 관리 하위
INSERT INTO folders (id, nums, name, parent_id, level, sort_order) VALUES (30, '4.1.1', '일반 전표 입력', 29, 3, 1);


-- -------------------------------------------------------------
-- pages
-- -------------------------------------------------------------
DELETE FROM pages;
DELETE FROM sqlite_sequence WHERE name='pages';

-- 1. 사용자 관리 (folder_id=4)
INSERT INTO pages (folder_id, title, content, sort_order, aka, status) VALUES (
    4,
    '사원 계정 생성 및 권한 부여 안내',
    '# 사원 계정 생성 및 권한 부여 가이드

이 문서는 AssetERP 시스템에서 새로운 사원 계정을 생성하고 적절한 메뉴 권한을 할당하는 방법에 대해 설명합니다.

## 1. 개요
보안 관리를 위해 모든 사용자는 개별 계정을 할당받아야 하며, 직무에 맞는 최소 권한의 원칙에 따라 권한을 세분화하여 부여해야 합니다.

## 2. 계정 생성 프로세스
신규 사원이 입사한 경우 다음 절차에 따라 계정을 생성합니다.
1. **인사 기본 관리** 메뉴에서 사원 정보를 선등록합니다.
2. **사용자 관리** 화면으로 이동하여 우측 상단의 `[신규 등록]` 버튼을 클릭합니다.
3. 해당 사원의 `사번`, `사용자ID`, `초기 비밀번호`, `이메일` 등의 필수 입력 요소를 입력합니다.
4. **역할(Role)** 필드에서 `일반 사용자(USER)` 또는 `시스템 관리자(ADMIN)`를 선택합니다.
5. `[저장]` 버튼을 누르면 계정이 활성화 상태로 생성됩니다.

> [!IMPORTANT]
> 최초 생성 시 임시 비밀번호는 안전한 채널을 통해 사원에게 전달하며, 사원은 최초 로그인 시 비밀번호를 변경해야 합니다.

## 3. 권한 변경 및 회수
사원의 부서 이동 또는 퇴사 등의 변동 사항이 발생하면 즉시 권한을 변경하거나 회수해야 합니다.
- **부서 이동**: 새로운 직무에 필요한 롤을 추가하고 기존 권한 중 불필요한 부분은 제거합니다.
- **퇴사**: 사용자의 활성화 상태(`is_active`)를 `0` (비활성)으로 변경하여 시스템 접속을 원천 차단합니다. (Soft Delete)
',
    1,
    'page-1',
    'PUBLISHED'
);

INSERT INTO pages (folder_id, title, content, sort_order, aka, status) VALUES (
    4,
    '사용자 목록 조회 및 활성/비활성화 처리 가이드',
    '# 사용자 목록 조회 및 활성/비활성화 가이드

본 가이드는 관리자 메뉴를 통해 등록된 사용자 계정들의 전체 목록을 모니터링하고, 필요 시 특정 계정을 활성화하거나 비활성화 처리하는 방법에 대해 기술합니다.

## 1. 사용자 목록 조회
* **메뉴 경로**: `시스템 설정 > 권한 및 보안 > 사용자 관리`
* **기능 요약**: 
  - 현재 시스템에 등록된 전체 사용자 목록을 조회할 수 있습니다.
  - 검색 필터(아이디, 이름, 부서)를 통해 특정 사용자를 빠르게 검색할 수 있습니다.
  - AG Grid 테이블을 사용하여 정렬, 필터링 및 엑셀 내보내기가 가능합니다.

## 2. 계정 비활성화 (Soft Delete)
A-Man 시스템은 보안 및 데이터 이력 추적을 위해 물리적으로 데이터를 삭제(Hard Delete)하지 않고, **Soft Delete(is_active = 0)** 처리 방식을 취합니다.
1. 목록에서 비활성화하고자 하는 사용자의 행을 클릭합니다.
2. 상세 화면 하단의 `[비활성화]` 버튼을 누릅니다.
3. 팝업 확인 창이 표시되면 사유를 간략히 입력한 후 `[확인]`을 클릭합니다.
4. 해당 계정의 상태가 `비활성`으로 변경되며, 이후 이 계정으로는 API 요청 시 JWT 인증 단계에서 접근이 거부됩니다.

## 3. 계정 활성화 (복구)
휴직 후 복직 등으로 계정을 재사용해야 하는 경우:
1. 검색 필터에서 `상태: 전체` 또는 `상태: 비활성`을 선택하여 해당 사용자를 찾습니다.
2. 상세 화면에서 `[활성화]` 버튼을 누르면 즉시 상태가 `활성`으로 복구되어 정상 로그인이 가능해집니다.
',
    2,
    'page-2',
    'PUBLISHED'
);

-- 2. 사원 정보 등록 (folder_id=13)
INSERT INTO pages (folder_id, title, content, sort_order, aka, status) VALUES (
    13,
    '신규 사원 등록 프로세스 및 입력 항목 상세',
    '# 신규 사원 등록 가이드

인사 정보의 근간이 되는 신규 사원 정보를 등록하는 양식 및 절차에 대한 매뉴얼입니다.

## 1. 사전 준비 사항
사원을 등록하기 전에 다음 기본 코드가 선행 등록되어 있어야 합니다.
- **부서 코드**: 사원이 소속될 부서가 조직도에 존재해야 합니다.
- **직급 코드**: 사원에게 부여될 직급(부장, 과장, 대리 등)이 정의되어 있어야 합니다.

## 2. 입력 항목 상세 안내
| 항목명 | 필수 여부 | 설명 | 제약 조건 |
| :--- | :---: | :--- | :--- |
| **사번** | 필수 | 회사 고유의 사원 번호 | 중복 불가, 숫자 6자리 |
| **성명** | 필수 | 사원의 본명 | 한글 2~10자 |
| **부서** | 필수 | 소속 부서 선택 | 검색 팝업에서 선택 |
| **직급** | 필수 | 직무 등급 | 드롭다운에서 선택 |
| **입사일자** | 필수 | 공식 입사일 | YYYY-MM-DD 포맷 |
| **휴대폰** | 필수 | 연락처 번호 | 하이픈(-) 포함 |

## 3. 등록 완료 후 후속 작업
사원 정보 저장이 성공적으로 완료되면 자동으로 `사번`을 기반으로 한 임시 시스템 계정이 생성 대기 상태가 됩니다. 관리자는 즉시 **사용자 관리** 메뉴를 통해 로그인 계정을 연계 발급하십시오.
',
    1,
    'page-3',
    'PUBLISHED'
);

-- 3. 일반 전표 입력 (folder_id=30)
INSERT INTO pages (folder_id, title, content, sort_order, aka, status) VALUES (
    30,
    '재무 전표 작성 및 확정 절차 안내',
    '# 재무 전표 작성 및 확정 절차

일상적인 거래 내역을 회계 장부에 기입하기 위한 재무 전표 작성 가이드라인입니다.

## 1. 전표 작성의 3단계
회계 처리의 투명성을 확보하기 위해 전표는 **임시저장 -> 상신 -> 확정(승인)**의 3단계 프로세스를 따릅니다.

```mermaid
graph TD
    A[1. 전표 작성 및 임시저장] --> B[2. 결재 상신]
    B --> C{결재자 승인 여부}
    C -- 승인 --> D[3. 전표 확정 및 분개 반영]
    C -- 반려 --> A
```

## 2. 전표 입력 항목
* **차변/대변 일치 법칙**: 한 전표 내의 차변 금액 합계와 대변 금액 합계는 반드시 **0**으로 일치해야 저장이 가능합니다.
* **계정과목**: 적절한 계정과목 코드를 검색하여 매핑하십시오. (예: 81100 - 복리후생비)
* **적요**: 거래 내용을 육하원칙에 맞게 명확하게 작성합니다.

> [!WARNING]
> 확정 완료된 전표는 원칙적으로 수정이나 삭제가 불가능합니다. 오등록된 경우 반대 분개를 가지는 **마이너스 취소 전표**를 추가 발행하여 보정해야 합니다.
',
    1,
    'page-4',
    'PUBLISHED'
);

-- -------------------------------------------------------------
-- assets
-- -------------------------------------------------------------
DELETE FROM assets;
DELETE FROM sqlite_sequence WHERE name='assets';

-- EMOJIs
INSERT INTO assets (atype, name, value) VALUES ('EMOJI', '기본 이모지', '‼️, ❗, ✔️, 🚩, ➡️, 📝, ▶️, 🔴, 🔷, 🔵, 👉, 🚫, ❓, 💡, 🔥, ✨, 🎉, 📌, ⚠️, ✅, ❌, 💬, 👍');

-- SYMBOLs
INSERT INTO assets (atype, name, value) VALUES ('SYMBOL', '기본 특수기호', '※, ■, ▶, ○, ●, ★, ☆, ➔, ✓');

-- PHRASEs
INSERT INTO assets (atype, name, value) VALUES ('PHRASE', '임시 비밀번호 정책', '최초 생성 시 임시 비밀번호는 안전한 채널을 통해 사원에게 전달하며, 사원은 최초 로그인 시 비밀번호를 변경해야 합니다.');
INSERT INTO assets (atype, name, value) VALUES ('PHRASE', '전표 수정 불가 안내', '확정 완료된 전표는 원칙적으로 수정이나 삭제가 불가능합니다. 오등록된 경우 반대 분개를 가지는 마이너스 취소 전표를 추가 발행하여 보정해야 합니다.');

-- TEMPLATEs
INSERT INTO assets (atype, name, value) VALUES ('TEMPLATE', '표준 도움말 템플릿', '# [메뉴명] 도움말

이 문서는 [메뉴명] 화면의 기능과 사용법에 대해 설명합니다.

## 1. 개요
[메뉴에 대한 간단한 개요 및 비즈니스 목적 기술]

## 2. 주요 기능 및 업무 절차
1. **[기능 1]**: [기능 상세 설명]
2. **[기능 2]**: [기능 상세 설명]

## 3. 주의사항
> [!WARNING]
> [사용자가 자주 실수하거나 유의해야 할 정책 기술]
');


