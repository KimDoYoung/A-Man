-- -------------------------------------------------------------
-- 사용자
-- -------------------------------------------------------------
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
