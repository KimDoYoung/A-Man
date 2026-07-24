# A-Man 마크다운-HTML 변환 캐싱 전략 제안 (md_caching_discussion.md)

## 1. 개요 및 타당성 분석 (Goal Description)
도움말 및 매뉴얼 시스템은 데이터의 특성상 **쓰기(Write) 작업이 매우 드물고 읽기(Read) 작업이 압도적으로 잦은(Read-Heavy)** 서비스입니다.
마크다운을 HTML로 파싱하는 작업은 정규식 전처리, AST(Abstract Syntax Tree) 파싱, HTML 렌더링을 포함하는 CPU 집중적인 연산입니다. 이를 매 요청마다 백엔드 서버에서 새로 수행하는 것은 대용량 문서 요청 시 자원 낭비와 응답 속도 저하를 야기합니다.

따라서 적절한 수준의 **캐싱(Caching)을 적용하면 응답 시간을 마이크로초(ms 이하) 단위로 단축하고 서버 CPU 점유율을 크게 낮출 수 있습니다.**

---

## 2. 세 가지 캐싱 아키텍처 비교 및 분석

### 옵션 1: Spring Boot 인메모리 캐싱 (추천)
* **방식**: Spring Boot의 기본 캐시 추상화(`@Cacheable`, `@CacheEvict`)와 `ConcurrentHashMap` 기반 인메모리 캐시를 이용해 `ManualController` 변환 결과를 메모리에 올립니다.
* **장점**:
  * 추가 라이브러리나 인프라 설치 없이 구현이 극히 단순하고 안정적입니다.
  * DB 스키마 수정이 전혀 필요 없습니다.
* **단점**: 서버 재기동 시 최초 1회 렌더링 비용이 발생합니다.
* **캐시 무효화(Eviction)**: 매뉴얼 관리자 API에서 문서를 저장/수정/삭제할 때 해당 아카(Aka) 키에 연결된 캐시를 날리는(`@CacheEvict`) 방식으로 정합성을 쉽게 유지할 수 있습니다.

### 옵션 2: 데이터베이스(SQLite3) 결과 저장 캐싱 (HTML 사전 빌드)
* **방식**: `MANUAL` 테이블에 `content_html` 컬럼을 신설하여, 마크다운 문서를 임포트/저장하는 시점에 HTML로 한 번만 변환하여 DB에 함께 물리적으로 적재합니다.
* **장점**:
  * 변환 연산이 저장 시점에만 일어나며, 조회 시에는 렌더러 자체를 타지 않고 컬럼만 SELECT하므로 서버 재기동 영향이 없고 영구적입니다.
* **단점**:
  * DB 스키마가 커지고 변경됩니다.
  * 나중에 버튼 스타일이나 CSS 테마 명세가 바뀔 경우 기존에 저장된 모든 HTML 컬럼을 일괄 업데이트해야 하는 데이터 마이그레이션 리스크가 있습니다.

### 옵션 3: 프론트엔드(CSR) 캐싱 (React Query)
* **방식**: 이미 프론트엔드 SPA 환경에 탑재되어 있는 `TanStack Query (React Query)`를 활용하여, 동일 도움말 페이지를 탐색할 때 메모리에 캐싱해 둡니다.
* **장점**: 백엔드 네트워크 호출 자체를 생략(Zero-Latency)하므로 프론트엔드 사용자의 화면 전환이 즉시 발생합니다.
* **단점**: 사용자가 브라우저를 새로고침하거나 다른 사용자가 접근할 때의 백엔드 렌더링 부하는 해결하지 못합니다. (백엔드 캐싱의 보완재로 적당함)

---

## 3. 추천안 및 구현 구상 (Proposed Solution)

가장 시스템 리스크가 적으면서도 서버 부하 저하 효과가 즉각적인 **[옵션 1] Spring Boot 인메모리 캐싱**을 추천합니다.

Spring Boot 2.3.12 스펙 내에서 아주 간단하게 아래와 같이 설정 및 적용을 할 수 있습니다:

### 1) 캐싱 설정 활성화
`AppConfig` 혹은 `@SpringBootApplication` 클래스 상단에 캐싱 활성화 어노테이션을 붙입니다.
```java
@Configuration
@EnableCaching
public class CacheConfig {
    // Spring Boot 기본 SimpleCacheConfiguration에 의해 ConcurrentMapCacheManager가 자동으로 기동됨
}
```

### 2) 컨트롤러 렌더링 메소드 캐시 등록
`ManualController.java` 의 매뉴얼 변환 엔드포인트에 `@Cacheable`을 붙입니다.
```java
@GetMapping("/manual/{aka}")
@Cacheable(value = "manualHtml", key = "#aka")
public String viewManualByAka(@PathVariable("aka") String aka, Model model) {
    // ... 기존 로직 실행 (최초 실행 이후에는 이 안의 로직을 스킵하고 저장된 HTML 결과물이 서빙됨)
}
```

### 3) 저장/수정 시 캐시 강제 휘발 (Evict)
매뉴얼 문서 작성 완료, 수정, 삭제 컨트롤러 메소드에 `@CacheEvict`를 붙입니다.
```java
@PostMapping("/admin/manual/save")
@CacheEvict(value = "manualHtml", key = "#manualDto.aka")
public ResponseEntity<?> saveManual(@RequestBody ManualDto manualDto) {
    // ... DB에 수정본을 영속화하고 캐시를 즉시 제거하여 실시간 갱신 보장
}
```

---

## 4. 토론 및 피드백 요청 (Open Questions)

> [!NOTE]
> 1. 백엔드 `Simple Cache`를 사용하면 별도의 프로세스(Redis 등) 없이 로컬 WAS JVM 힙 메모리 공간에 HTML 문자열을 적재하게 됩니다. 매뉴얼 문서 수백 개 분량의 HTML 스트링은 메모리 부담이 메가바이트(MB) 단위 이하로 극히 미미하므로 안전합니다.
> 2. 옵션 1(WAS 인메모리 캐싱)로 진행하는 계획안에 대해 승인하시는지, 아니면 DB 컬럼을 활용한 사전 빌드(옵션 2)나 기타 다른 방안을 선호하시는지 의견을 말씀해 주세요.
