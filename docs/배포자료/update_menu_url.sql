-- ====================================================================
-- sys06_menu 도움말 URL 일괄/개별 업데이트 SQL 스크립트 (update_menu_url.sql)
-- ====================================================================

-- 1. [개별 화면별 백업 및 확인]
-- 업데이트 대상 메뉴의 정보를 백업/확인합니다.
SELECT sys06_menu_id, sys06_menu_nm, sys06_class_nm, sys06_menual_url 
  FROM sys06_menu 
 WHERE sys06_class_nm = 'Ast01_AssetRegister'; -- 변경할 class_nm 예시


-- 2. [개별 업데이트 실행 예시]
-- 특정 화면(예: 자산등록화면 - Ast01_AssetRegister)의 도움말 경로를 신규 aman_opener.jsp 로 전환
UPDATE sys06_menu 
   SET sys06_menual_url = 'aman_opener.jsp?aka=asset_register'
 WHERE sys06_class_nm = 'Ast01_AssetRegister';


-- 3. [일괄 업데이트 템플릿 예시 (필요시 사용)]
-- 만약 기존에 help 파일명이 class_nm과 일치하도록 세팅되어 있었다면, 아래와 같이 일괄 전환이 가능합니다.
-- UPDATE sys06_menu 
--    SET sys06_menual_url = 'aman_opener.jsp?aka=' || LOWER(sys06_class_nm)
--  WHERE sys06_menual_url IS NOT NULL 
--    AND sys06_menual_url != '';

COMMIT;
