# 구현 계획 - `/manual/help/icons` 아이콘 검색 유틸리티 페이지 구현 및 연동

이 문서는 사용자의 요청에 따라, 도움말 내에서 FontAwesome 아이콘 전체를 비주얼로 검색하고 원클릭으로 백틱용 명칭을 복사할 수 있는 독립적인 아이콘 검색 페이지 `/manual/help/icons`를 개발하고 연동하는 계획입니다.

프로젝트 내 문서 경로: [docs/help_enhancement_plan.md](file:///home/kdy987/work/aman/docs/help_enhancement_plan.md)

---

## 🎨 구현 핵심 사양

1. **신규 웹 엔드포인트 개설**:
   - `ManualController.java`에 `@GetMapping("/help/icons")`를 추가합니다.
   - 클래스패스 `help/icons.html` 리소스를 읽어 브라우저에 직접 HTML 페이지를 반환합니다.
2. **아이콘 검색 유틸리티 페이지 (`icons.html`) 디자인**:
   - FontAwesome 5.15.4 CDN 스타일시트를 로드합니다.
   - **실시간 필터링**: 입력 필드에 아이콘 이름을 치면 즉각적으로 필터링되는 JS 기반 실시간 검색창을 제공합니다.
   - **다이렉트 복사**: 아이콘 카드를 클릭하면 파서 자동 완성에 최적화된 단순명(`trash`, `check` 등)이 클립보드에 바로 복사되고 화면에 토스트 알림을 띄웁니다.
   - **테마/에스테틱**: 다크/블루 그라데이션 및 네온 보더 효과가 적용된 모던하고 깔끔한 대시보드 디자인을 설계하여 프리미엄 UX를 제공합니다.
3. **도움말 문서 연동**:
   - `doc-user-help.md` 내 "아이콘 목록" 하단에 **"🔍 FontAwesome 아이콘 찾기"** 버튼을 배치하고 클릭 시 `target="_blank"` 속성으로 신규 탭을 띄웁니다.

---

## 💻 상세 코드 설계

### 1. [ManualController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/ManualController.java) 수정

- **`getIconsPage()` 매핑 추가 (1560라인 부근)**:
```java
    @GetMapping(value = "/help/icons", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> getIconsPage() {
        try (java.io.InputStream is = getClass().getResourceAsStream("/help/icons.html")) {
            if (is == null) {
                return ResponseEntity.status(404).body("아이콘 찾기 페이지가 존재하지 않습니다.");
            }
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int len;
            while ((len = is.read(buffer)) != -1) {
                bos.write(buffer, 0, len);
            }
            return ResponseEntity.ok(bos.toString("UTF-8"));
        } catch (java.io.IOException e) {
            return ResponseEntity.status(500).body("오류가 발생했습니다.");
        }
    }
```

### 2. [icons.html](file:///home/kdy987/work/aman/backend/src/main/resources/help/icons.html) [NEW]

- **모던한 디자인과 실시간 검색 및 복사 기능을 담은 정적 HTML 파일 생성**:
  - 대표적인 FontAwesome 5 Icons 180여 종을 배열로 내장하여 검색할 수 있게 합니다.

### 3. [doc-user-help.md](file:///home/kdy987/work/aman/backend/src/main/resources/help/doc-user-help.md) 수정

- **아이콘 목록 그리드 하단에 버튼 앵커 추가**:
```html
</div>

<div style="text-align: center; margin: 25px 0 10px 0;">
  <a href="./help/icons" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; border-radius: 6px; font-size: 14px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); transition: background-color 0.2s;">
    🔍 FontAwesome 아이콘 전체 검색하기
  </a>
</div>
```
*(참고: `./help/icons`로 경로를 적어주면 현재 `/manual/help`에서 상대 경로로 호출하여 자동으로 컨텍스트 패스 문제를 회피합니다.)*

---

## 🧪 검증 계획

### 1. 자동화 테스트
수정 후 백엔드 프로젝트 컴파일 및 전체 빌드 수행:
```bash
./bm.sh build
```

### 2. 수동 검증 단계
- 브라우저로 `/manual/help` 페이지 접속.
- 아이콘 목록 하단에 생성된 **"FontAwesome 아이콘 전체 검색하기"** 버튼을 클릭하여 새 탭이 뜨는지 확인.
- 탭 안에서 실시간 검색 및 카드 클릭 시 정상적으로 클립보드에 복사되고 알림이 표출되는지 테스트.
