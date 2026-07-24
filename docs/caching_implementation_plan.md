# 구현 계획서: 마크다운-HTML 캐시 롤백 및 백엔드 전용 캐시 유지 (caching_implementation_plan.md)

## 1. 목표 및 범위 (Goal Description)
사용자 디바이스 및 구동 환경의 제약으로 인해 발생할 수 있는 프론트엔드 리소스 부하를 원천 차단하기 위해, 프론트엔드(클라이언트) 단에 적용했던 모든 캐싱 및 미리보기 디바운싱(Debounce) 코드를 안전하게 롤백(제거)합니다.

백엔드 서버 레벨의 Spring Boot `@Cacheable` (인메모리 ConcurrentHashMap 캐시)은 그대로 유지하여, WAS 서버의 마크다운-HTML 파싱 비용 절감 및 ERP 도움말 팝업 로딩 속도 향상 효과를 지속적으로 지원합니다.

---

## 2. 사용자 검토 필요 사항 (User Review Required)

### 1) 롤백 대상 파일
- **`MarkdownViewer.tsx`**: `useMemo` 제거 및 마크다운 실시간 파싱 JSX 복구
- **`MarkdownSplitEditor.tsx`**: 디바운스용 `debouncedContent` 상태 소거 및 실시간Props 연동으로 롤백
- **`AssetAdminPage.tsx`**: 디바운스용 `debouncedFormValue` 상태 소거 및 원본 텍스트 미리보기 연동으로 롤백
- **`Md2Html변환전략.md`**: 문서 내 '7.2. 프론트엔드 최적화 아키텍처' 장 소거

---

## 3. 상세 변경 예정 사항 (Proposed Changes)

---

### 프론트엔드 롤백 (Frontend Component Rollback)

#### 1) [MODIFY] `frontend/src/domains/content/MarkdownViewer.tsx`
- `useMemo` 관련 코드를 소거하고 기존의 렌더링 호출 방식으로 복구합니다.
```diff
-import React, { useState, useEffect, useMemo } from 'react'
+import React, { useState, useEffect } from 'react'

...

-  // useMemo를 통한 마크다운 렌더링 결과물 캐싱 (fontSize, contentWidth 변경 시에만 갱신)
-  const renderedContent = useMemo(() => {
-    if (!page?.content) return null
-    return renderMarkdownToHtml(page.content)
-  }, [page?.content, fontSize, contentWidth, settings])

...

         <div className="markdown-content">
-          {renderedContent}
+          {renderMarkdownToHtml(page.content)}
         </div>
```

#### 2) [MODIFY] `frontend/src/domains/content/components/MarkdownSplitEditor.tsx`
- 로컬 디바운스 훅과 타이머 상태를 지우고 원본 텍스트 렌더링으로 롤백합니다.
```diff
-import React, { useState, useEffect } from 'react';
+import React from 'react';

...

-  const [debouncedContent, setDebouncedContent] = useState(pageContent);
-
-  useEffect(() => {
-    const handler = setTimeout(() => {
-      setDebouncedContent(pageContent);
-    }, 150);
-    return () => clearTimeout(handler);
-  }, [pageContent]);

...

           <div ref={previewContainerRef} className="flex-1 p-1 overflow-y-auto custom-scroll bg-slate-50/50">
             <div className="prose max-w-none bg-white p-2 pb-[50vh] border border-gray-100 rounded-md shadow-xs leading-relaxed min-h-full markdown-content">
-              {renderMarkdownToHtml(debouncedContent, settings)}
+              {renderMarkdownToHtml(pageContent, settings)}
             </div>
           </div>
```

#### 3) [MODIFY] `frontend/src/domains/content/AssetAdminPage.tsx`
- 로컬 디바운스 훅과 타이머 상태를 지우고 원본 텍스트 렌더링으로 롤백합니다.
```diff
-  const [formValue, setFormValue] = useState('')
-  const [debouncedFormValue, setDebouncedFormValue] = useState('')
-
-  useEffect(() => {
-    const handler = setTimeout(() => {
-      setDebouncedFormValue(formValue)
-    }, 150)
-    return () => clearTimeout(handler)
-  }, [formValue])
+  const [formValue, setFormValue] = useState('')

...

                 <div className="prose max-w-none text-gray-800 border border-gray-150 bg-slate-50 p-4 rounded-md text-xs leading-relaxed markdown-content">
-                  {renderMarkdownToHtml(debouncedFormValue)}
+                  {renderMarkdownToHtml(formValue)}
                 </div>
```

---

### 백엔드 (Backend Component)
- **변경 사항 없음**: `CacheConfig.java` 및 `MarkdownCacheService.java`, `ManualController.java` 의 서비스 위임 방식 캐시는 그대로 유지합니다.

---

## 4. 검증 계획 (Verification Plan)

### 타입스크립트 컴파일 검증
- `frontend` 디렉토리 아래에서 `npx tsc --noEmit` 을 수행하여, 수동 롤백 과정에서 세미콜론이나 임포트 누락 등의 문법 에러가 없는지 교차 타입 체크를 실행합니다.

### 쉘 검증 테스트 실행
- `./tools/run-md-tests.sh` 를 구동해 동일성 정합성이 흐트러지지 않았는지 재확인합니다.
