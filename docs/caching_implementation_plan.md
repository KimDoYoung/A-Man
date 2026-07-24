# 구현 계획서: 마크다운-HTML 렌더링 캐시 구축 및 최적화 (caching_implementation_plan.md)

## 1. 목표 및 범위 (Goal Description)
A-Man 시스템의 마크다운-HTML 변환 연산 부하를 제어하기 위해 백엔드와 프론트엔드 양측에 정교한 캐싱 전략을 구현합니다.

- **백엔드**: Spring Boot `@Cacheable` (ConcurrentMap 인메모리 캐시)을 활용하여 변환된 SSR HTML 데이터를 캐싱합니다. Self-Invocation 프록시 한계를 극복하기 위해 `MarkdownCacheService`를 신설하여 비즈니스 레이어를 캡슐화합니다.
- **프론트엔드**: 사용자 뷰어(`MarkdownViewer.tsx`)의 렌더링 결과물을 `useMemo`로 감싸 캐싱하며, 어드민 에디터 화면([AssetAdminPage.tsx](file:///home/kdy987/work/aman/frontend/src/domains/content/AssetAdminPage.tsx) 및 [MarkdownSplitEditor.tsx](file:///home/kdy987/work/aman/frontend/src/domains/content/components/MarkdownSplitEditor.tsx))에 타이핑 미리보기 디바운스(Debouncing)를 도입해 렌더링 과부하 및 타이핑 렉 현상을 예방합니다.

---

## 2. 사용자 검토 필요 사항 (User Review Required)

### 1) Spring Boot Starter Cache 라이브러리 검증
- Spring Boot 2.3.x 환경에서는 별도 외부 라이브러리 의존성 없이 `@EnableCaching` 선언만으로 `SimpleCache` (ConcurrentHashMap 기반 인메모리 캐시)가 즉시 정상 작동합니다. 별도 Gradle 의존성 빌드는 추가하지 않습니다.

### 2) 일관성 유지 (Cache Eviction) 방식
- 마크다운 문서 저장/수정/삭제 시 `manualHtml` 캐시 전체를 비우는 `@CacheEvict(allEntries = true)`를 적용합니다. 문서 저장 빈도가 매우 낮으므로, 개별 aka 갱신보다 캐시 전체를 비워 정합성을 유지하는 것이 꼬임 없는 가장 안정적인 판단입니다.

---

## 3. 상세 변경 예정 사항 (Proposed Changes)

---

### 백엔드 (Backend Component)

#### 1) [NEW] `kr.co.kfs.aman.config.CacheConfig.java`
- 캐싱 메커니즘을 활성화하기 위한 Spring Config 클래스를 신설합니다.
```java
package kr.co.kfs.aman.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {
}
```

#### 2) [NEW] `kr.co.kfs.aman.service.MarkdownCacheService.java`
- `ManualController.java`에 정의되어 있는 Flexmark 파싱 엔진 및 백틱 전처리 헬퍼 메소드들을 모두 이곳으로 추출하고 캡슐화합니다.
- 파싱 핵심 메소드에 `@Cacheable` 캐시를 적용합니다.
```java
package kr.co.kfs.aman.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
// flexmark 관련 라이브러리 임포트...

@Service
public class MarkdownCacheService {
    
    // ... (기존 ManualController의 parseMarkdownToHtml 및 replaceBacktickTokens 등 그대로 복제)
    
    @Cacheable(value = "manualHtml", key = "#markdown")
    public String parseMarkdownToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "<p style='color:#888; font-style:italic;'>내용이 비어있습니다.</p>";
        }
        
        // 백틱 전처리 및 flexmark 파싱 변환 실행...
        String preprocessed = preprocessBackticks(markdown);
        // ... flexmark 파싱 & 렌더링
        return html;
    }
}
```

#### 3) [MODIFY] `kr.co.kfs.aman.controller.ManualController.java`
- `MarkdownCacheService`를 주입받아 마크다운 변환 시 이를 타도록 수정합니다.
```java
@Autowired
private MarkdownCacheService markdownCacheService;

// ...
// getManualByAka 엔드포인트 내 
// String parsedBody = parseMarkdownToHtml(page.getContent()); 부분을 다음과 같이 교체:
String parsedBody = markdownCacheService.parseMarkdownToHtml(page.getContent());
```

#### 4) [MODIFY] `kr.co.kfs.aman.controller.ContentController.java`
- 도움말 등록/수정/삭제 메소드 상단에 캐시 Evict 어노테이션을 부여합니다.
```java
import org.springframework.cache.annotation.CacheEvict;

// savePage, updatePage, deletePage 엔드포인트 상단에 추가:
@CacheEvict(value = "manualHtml", allEntries = true)
```

#### 5) [MODIFY] `kr.co.kfs.aman.controller.AdminPageController.java`
- 상태 변경 등 페이지 갱신이 일어나는 엔드포인트에 추가합니다.
```java
@CacheEvict(value = "manualHtml", allEntries = true)
```

---

### 프론트엔드 (Frontend Component)

#### 1) [MODIFY] `frontend/src/domains/content/MarkdownViewer.tsx`
- 렌더링 출력부 컴포넌트인 `renderMarkdownToHtml`을 `React.useMemo`로 감싸 외부 상태(`fontSizeClassMap`, `settings`)가 변하지 않는 리렌더링 시 파싱 연산을 원천 생략시킵니다.
```typescript
const renderedMarkdown = useMemo(() => {
  if (!page?.content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw]}
      components={{ /* 기존 components 구성들 */ }}
    >
      {page.content}
    </ReactMarkdown>
  );
}, [page?.content, fontSizeClassMap, settings]);
```

#### 2) [MODIFY] `frontend/src/domains/content/AssetAdminPage.tsx`
- 타자 렉을 개선하기 위해, 입력 폼 값(`formValue`)을 미리보기 파서에 전달할 때 디바운스된 상태값을 쓰도록 개선합니다.
- `lodash-es` 또는 리액트 디바운스 훅을 이용해 `150ms` 텀을 두고 미리보기를 갱신합니다.

#### 3) [MODIFY] `frontend/src/domains/content/components/MarkdownSplitEditor.tsx`
- 실시간 에디터 미리보기에 디바운스된 상태값을 바인딩하여 타이핑 렉 현상을 방어합니다.

---

## 4. 검증 계획 (Verification Plan)

### 백엔드 자동 검증 (Automated Tests)
- 프로젝트를 가동하고 특정 매뉴얼 페이지 `/manual/{aka}`를 최초 1회 요청한 뒤 로그를 확인하고, 두 번째 호출부터는 컨트롤러 내부 로그가 생략되고 응답 시간이 `1ms` 이하로 내려가는지 디버깅하여 캐싱 작동 여부를 테스트합니다.
- 관리자 화면에서 해당 문서를 임의 수정하고 다시 `/manual/{aka}`를 호출했을 때, 수정한 내용이 화면에 즉각 갱신되는지 확인하여 캐시 Eviction 정합성을 테스트합니다.

### 프론트엔드 화면 성능 검증 (Manual Verification)
- 대용량 마크다운 도움말 화면에서 목차(TOC) 클릭이나 폰트 크기 변경 시, 렌더링 렉 없이 즉각 화면 스타일이 변화하는지 프레임 드랍을 체감 테스트합니다.
- 마크다운 에디터 미리보기 창에 타자를 빠르게 칠 때 입력 지연이 소거되었는지 검증합니다.
