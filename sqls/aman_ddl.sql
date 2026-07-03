-- 1. 3단계 메뉴 체계를 관리하는 Folders 테이블
CREATE TABLE folders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nums        TEXT,                               -- 폴더/메뉴 번호 체계 (예: 1.1.1)
    name        TEXT NOT NULL,                      -- 메뉴/폴더 이름
    parent_id   INTEGER DEFAULT NULL,               -- 상위 폴더 ID (최상위는 NULL)
    level       INTEGER NOT NULL CHECK(level BETWEEN 1 AND 3), -- 1:대, 2:중, 3:소 (3단계 제한)
    sort_order  INTEGER DEFAULT 0,                  -- 메뉴 노출 순서
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- 2. 마크다운 본문을 직접 내장하는 Pages 테이블 (file_path 제거)
CREATE TABLE pages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id   INTEGER NOT NULL,                   -- 소속된 폴더 ID
    title       TEXT NOT NULL,                      -- 페이지 제목 (화면 메뉴나 탭에 표시될 이름)
    content     TEXT NOT NULL,                      -- 마크다운(md) 문장 본문 원본 전체
    sort_order  INTEGER DEFAULT 0,                  -- 폴더 내에서 페이지 노출 순서
    aka         TEXT NOT NULL UNIQUE,               -- 페이지 별칭 (URL 경로에 사용될 수 있는 고유한 문자열)
    status      TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')), -- DRAFT(초안), PUBLISHED(발행)
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_pages_folder ON pages(folder_id);
CREATE INDEX idx_pages_aka ON pages(aka);


-- 1. 사용자 정보를 관리하는 Users 테이블
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,               -- 로그인 ID (중복 불가)
    password        TEXT NOT NULL,                      -- 암호화된 비밀번호 hash (개발시에는 평문으로 저장하겠지만, 실제 운영에서는 반드시 해시 처리 필요)
    email           TEXT NOT NULL UNIQUE,               -- 이메일 (중복 불가)
    name            TEXT NOT NULL,                      -- 사용자 본명 또는 닉네임
    role            TEXT NOT NULL DEFAULT 'user',       -- 사용자 역할 (예: 'admin', 'user')
    is_active       INTEGER DEFAULT 1,                  -- 활성화 여부 (1: 활성, 0: 비활성)
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);



-- 2. JWT 토큰 재발급을 위한 Refresh Tokens 테이블
CREATE TABLE refresh_tokens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,                   -- 해당 토큰의 소유자 ID
    token           TEXT NOT NULL UNIQUE,               -- 발급된 Refresh Token 값
    expires_at      DATETIME NOT NULL,                  -- 토큰 만료 일시
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 사용자가 삭제(Delete)되면 해당 사용자의 리프레시 토큰도 자동으로 동반 삭제
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 로그아웃된 유효한 Access Token을 차단하기 위한 블랙리스트 테이블
CREATE TABLE token_blacklist (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    token           TEXT NOT NULL UNIQUE,               -- 차단할 Access Token 값
    expires_at      DATETIME NOT NULL,                  -- 해당 토큰의 원래 만료 일시
    blacklisted_at  DATETIME DEFAULT CURRENT_TIMESTAMP  -- 블랙리스트 등록 일시
);

CREATE INDEX idx_blacklist_token ON token_blacklist(token);

-- 성능 최적화 및 빠른 토큰 검증을 위한 인덱스 생성
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- 
-- 3. 자산(Assets) 테이블: EMOJI, PHRASE, TEMPLATE, SYMBOL 등 다양한 자산을 관리
--  
CREATE TABLE assets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    atype       TEXT NOT NULL,                      -- 자산 타입 (EMOJI, PHRASE, TEMPLATE, SYMBOL)
    name        TEXT NOT NULL,                      -- 자산 이름 / 이름표
    value       TEXT NOT NULL,                      -- 실제 데이터 본문 (마크다운, 기호, 텍스트 등)
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- 약속된 키워드 외의 텍스트가 들어오는 것을 방지
    CONSTRAINT chk_atype CHECK (atype IN ('EMOJI', 'PHRASE', 'TEMPLATE', 'SYMBOL'))
);

CREATE INDEX idx_assets_atype_name ON assets(atype, name);


-- 1. 최근 작업 이력 스택 테이블 생성
CREATE TABLE work_stack (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                                       -- users.id 참조 (사용자별 작업 이력 격리)
    folder_id INTEGER NOT NULL,                                     -- folders.id 참조
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),     -- 작업 일시 (최신순 정렬용)
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    UNIQUE(user_id, folder_id)                                      -- 동일 문서 중복 삽입 방지 (UPSERT 제어용)
);

-- 2. 사용자별 최신 작업 이력 고속 조회를 위한 인덱스 생성
CREATE INDEX idx_work_stack_user_created
ON work_stack (user_id, created_at DESC);


CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(50) NOT NULL,
    setting_value TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_setting_key UNIQUE (setting_key)
);

insert into settings (setting_key, setting_value, note) values ('SITE_NAME', 'A-Man API','Application 명칭');
insert into settings (setting_key, setting_value, note) values ('SITE_DESCRIPTION', 'AssetERP를 위한 도움말 시스템', 'Application 설명');

insert into settings (setting_key, setting_value, note) values ('NORMAL_USER_TREE_FORMAT', '{nums} {name}','일반 사용자용 메뉴 트리 표시 형식'); 
insert into settings (setting_key, setting_value, note) values ('DOC_USER_TREE_FORMAT', '{nums} {name} ({sort_order})','문서편집 사용자용 메뉴 트리 표시 형식'); 
insert into settings (setting_key, setting_value, note) values ('NORMAL_USER_TITLE_FORMAT', '{nums} {name}','일반 사용자용 메뉴 제목 표시 형식'); 
insert into settings (setting_key, setting_value, note) values ('DOC_USER_TITLE_FORMAT', '{nums} {name} ({sort_order})','문서편집 사용자용 메뉴 제목 표시 형식');
insert into settings (setting_key, setting_value, note) values ('NORMAL_USER_BREADCRUMB_FORMAT', '{nums} {name}','일반 사용자용 메뉴 제목 표시 형식'); 
insert into settings (setting_key, setting_value, note) values ('DOC_USER_BREADCRUMB_FORMAT', '{nums} {name} ({sort_order})','문서편집 사용자용 메뉴 제목 표시 형식'); 

--  번호 조정
insert into settings (setting_key, setting_value, note) values ('AUTO_NUMS', 'false', '자동번호부여고나련 버튼들 활성화 여부[true: 버튼들 보임, false: 버튼들 감춤]');
insert into settings (setting_key, setting_value, note) values ('AKA_NUMS_FIRST', 'true', 'AKA번호에 nums를 우선적으로 먼저 부여한다.');

-- LINK BLANK
insert into settings (setting_key, setting_value, note) values ('LINK_BLANK', 'true', '마크다운 링크표현을 blank로 띄울지 여부, true: _blank, false: _self');