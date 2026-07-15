# 구현 계획 - `/manual/help` API 분석 및 보완 계획 (Full-Stack)

이 문서는 `/manual/help` (서버 상의 `/help` 엔드포인트) API가 동작하는 흐름을 확인하고, 최근 추가된 ERP 버튼 백틱 문법 및 이미지 레이어 조절 기능이 도움말 페이지에서 시각적으로 올바르게 표출되도록 프레임워크 스타일 및 도움말 본문 콘텐츠를 보완하기 위한 계획입니다.

특히 사용자의 피드백을 반영하여, **탭(Tab) 기반의 인터랙티브 인터페이스**를 도움말에 탑재해 "이미지 편집기 가이드", "백틱 버튼 테마 색상", "백틱 버튼 아이콘 정의"를 컴팩트하고 세련되게 전달하도록 설계합니다.

프로젝트 내 문서 경로: [docs/help_enhancement_plan.md](file:///home/kdy987/work/aman/docs/help_enhancement_plan.md)

---

## 🔍 `/manual/help` API 현재 동작 흐름

1. **엔드포인트 호출 및 리소스 로드**:
   - 일반 사용자 또는 관리자가 도움말을 조회할 때 `GET /manual/help` 엔드포인트가 실행됩니다.
   - 클래스패스 리소스 디렉토리에서 [doc-user-help.md](file:///home/kdy987/work/aman/backend/src/main/resources/help/doc-user-help.md) 파일을 읽어옵니다.
2. **동적 치환 및 파싱**:
   - 불러온 마크다운 본문의 `[version]` 토큰을 스프링 부트 설정의 `appVersion` 값으로 치환합니다.
   - `parseMarkdownToHtml(markdown)` 메소드를 호출하여 HTML 본문으로 변환합니다. 이때 우리가 이전에 구현한 `preprocessBackticks()` 전처리 필터가 작동하여 백틱(`) 단어들이 `<kbd class="asset-kbd-btn">` 태그 형태로 파싱됩니다.
3. **컨텍스트 패스 및 이미지 경로 보정**:
   - 변환된 HTML 내 로컬 이미지 경로(예: `src="./sample-table.png"`)를 `src="[contextPath]/manual/help/image/sample-table.png"`로 자동 변환하여 정적 리소스 로더를 통해 이미지를 보여줍니다.
4. **HTML 래핑**:
   - `fullHtml` 템플릿 변수를 통해 HTML 본문을 감싸서 클라이언트에 전달합니다.

---

## ⚠️ 현재 구조의 문제점 및 개선 방향

### 1. 스타일 정의 누락 (FontAwesome & CSS 클래스)
- **현상**: `/manual/help` 메소드가 생성하는 `fullHtml` 템플릿에는 FontAwesome CDN 스타일시트가 링크되지 않았으며, `kbd.asset-kbd-btn` 스타일 및 다크 모드용 `kbd` 스타일이 누락되어 있습니다.
- **해결책**: `/manual/help` 메소드가 사용하는 `fullHtml` 템플릿의 `<head>` 태그와 `<style>` 블록에 FontAwesome CDN 및 `kbd.asset-kbd-btn` CSS 규칙을 완벽하게 추가합니다.

### 2. 신규 기능의 도움말 컨텐츠 누락
- **현상**: [doc-user-help.md](file:///home/kdy987/work/aman/backend/src/main/resources/help/doc-user-help.md)에는 최근에 추가한 **ERP 스타일 백틱 버튼 문법** 및 **이미지 에디터 레이어 순서 조정 단축키** 정보가 없습니다.
- **해결책**: 도움말 본문 문서의 적절한 위치에 이 두 가지 사용법을 시각적 예시와 함께 추가합니다.

### 3. 정보 시각화 개선 (탭(Tab) UI 구현)
- **현상**: 많은 단어군, 색상 정의, 이미지 편집기 사용법을 연속적으로 배치하면 도움말 스크롤이 지나치게 길어지고 시독성이 떨어집니다.
- **해결책**: 백엔드 `fullHtml` 템플릿에 **탭 전환용 CSS 스타일**과 **JavaScript 클릭 이벤트 헬퍼**를 기본 내장하고, [doc-user-help.md](file:///home/kdy987/work/aman/backend/src/main/resources/help/doc-user-help.md)에 탭 레이아웃 마크업을 삽입하여 사용자가 누르는 탭에 따라 필요한 정보를 직관적으로 선택해서 조회하도록 고도화합니다.

---

## 💻 상세 수정 설계

### 1. [ManualController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/ManualController.java) (API 스타일 & 스크립트 업데이트)

#### [MODIFY] `ManualController.java` 의 `getHelpPage` 내부 `fullHtml`
- **FontAwesome CDN 추가** (약 1339라인 근처):
  ```html
              String fullHtml = 
                  "<!DOCTYPE html>\n" +
                  "<html lang=\"ko\">\n" +
                  "<head>\n" +
                  "    <meta charset=\"UTF-8\">\n" +
                  "    <link rel=\"icon\" type=\"image/png\" href=\"/aman/favicon.png\">\n" +
                  "    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css\" />\n" +
                  "    <title>A-Man 도움말</title>\n" +
  ```
- **`<style>` 블록 스타일 추가** (약 1367라인 근처):
  ```css
                  "        kbd {\n" +
                  "            display: inline-block;\n" +
                  "            padding: 2px 6px;\n" +
                  "            font-size: 0.8em;\n" +
                  "            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n" +
                  "            color: #24292e;\n" +
                  "            background: #f6f8fa;\n" +
                  "            border: 1px solid #d1d5da;\n" +
                  "            border-radius: 4px;\n" +
                  "            box-shadow: inset 0 -2px 0 #d1d5da;\n" +
                  "            line-height: 1.4;\n" +
                  "            white-space: nowrap;\n" +
                  "            margin: 0 1px;\n" +
                  "            transition: background-color 0.2s, border-color 0.2s, color 0.2s;\n" +
                  "        }\n" +
                  "        kbd.asset-kbd-btn {\n" +
                  "            display: inline-flex;\n" +
                  "            align-items: center;\n" +
                  "            justify-content: center;\n" +
                  "            gap: 6px;\n" +
                  "            padding: 3px 8px;\n" +
                  "            font-size: 11px;\n" +
                  "            font-weight: 600;\n" +
                  "            border-radius: 4px;\n" +
                  "            border: 1px solid rgba(0, 0, 0, 0.15);\n" +
                  "            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);\n" +
                  "            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n" +
                  "            line-height: 1.2;\n" +
                  "            vertical-align: middle;\n" +
                  "            cursor: default;\n" +
                  "            user-select: none;\n" +
                  "            transition: background-color 0.2s, border-color 0.2s, color 0.2s;\n" +
                  "        }\n" +
                  "        kbd.asset-kbd-btn .kbd-fa-icon {\n" +
                  "            font-size: 10px;\n" +
                  "            margin-bottom: 0;\n" +
                  "        }\n" +
                  "        kbd.asset-kbd-btn .kbd-text {\n" +
                  "            letter-spacing: 0.5px;\n" +
                  "        }\n" +
                  // --- 탭 UI 전용 CSS 추가 ---
                  "        .tabs {\n" +
                  "            margin: 30px 0;\n" +
                  "            border: 1px solid #e2e8f0;\n" +
                  "            border-radius: 8px;\n" +
                  "            overflow: hidden;\n" +
                  "            background: #ffffff;\n" +
                  "        }\n" +
                  "        .tab-header {\n" +
                  "            display: flex;\n" +
                  "            background-color: #f8fafc;\n" +
                  "            border-bottom: 1px solid #e2e8f0;\n" +
                  "        }\n" +
                  "        .tab-btn {\n" +
                  "            flex: 1;\n" +
                  "            padding: 14px 16px;\n" +
                  "            font-size: 14px;\n" +
                  "            font-weight: 600;\n" +
                  "            color: #64748b;\n" +
                  "            background: none;\n" +
                  "            border: none;\n" +
                  "            cursor: pointer;\n" +
                  "            transition: all 0.2s;\n" +
                  "            outline: none;\n" +
                  "            text-align: center;\n" +
                  "            border-bottom: 2px solid transparent;\n" +
                  "        }\n" +
                  "        .tab-btn:hover {\n" +
                  "            color: #0f172a;\n" +
                  "            background-color: #f1f5f9;\n" +
                  "        }\n" +
                  "        .tab-btn.active {\n" +
                  "            color: #4f46e5;\n" +
                  "            background-color: #ffffff;\n" +
                  "            border-bottom: 2px solid #4f46e5;\n" +
                  "        }\n" +
                  "        .tab-content {\n" +
                  "            padding: 24px;\n" +
                  "        }\n" +
                  "        .tab-pane {\n" +
                  "            display: none;\n" +
                  "        }\n" +
                  "        .tab-pane.active {\n" +
                  "            display: block;\n" +
                  "        }\n" +
                  "        .theme-color-box {\n" +
                  "            display: inline-block;\n" +
                  "            width: 14px;\n" +
                  "            height: 14px;\n" +
                  "            border-radius: 3px;\n" +
                  "            vertical-align: middle;\n" +
                  "            margin-right: 6px;\n" +
                  "            border: 1px solid rgba(0,0,0,0.1);\n" +
                  "        }\n"
  ```

- **탭 제어용 JavaScript 함수 주입** (약 1322라인 근처 `targetBlankScript` 직후):
  ```html
              String tabScript = 
                  "    <script>\n" +
                  "        function switchTab(evt, tabId) {\n" +
                  "            var i, tabcontent, tablinks;\n" +
                  "            tabcontent = document.getElementsByClassName('tab-pane');\n" +
                  "            for (i = 0; i < tabcontent.length; i++) {\n" +
                  "                tabcontent[i].classList.remove('active');\n" +
                  "            }\n" +
                  "            tablinks = document.getElementsByClassName('tab-btn');\n" +
                  "            for (i = 0; i < tablinks.length; i++) {\n" +
                  "                tablinks[i].classList.remove('active');\n" +
                  "            }\n" +
                  "            document.getElementById(tabId).classList.add('active');\n" +
                  "            evt.currentTarget.classList.add('active');\n" +
                  "        }\n" +
                  "    </script>\n";
  ```
  그리고 `tabScript`를 `fullHtml` 구조에 `targetBlankScript`와 함께 추가합니다.

### 2. [doc-user-help.md](file:///home/kdy987/work/aman/backend/src/main/resources/help/doc-user-help.md) (도움말 컨텐츠 고도화)

- **`doc-user-help.md` 하단에 인터랙티브 탭 마크업 추가**:
```html
<div class="tabs">
  <div class="tab-header">
    <button class="tab-btn active" onclick="switchTab(event, 'tab-editor')">이미지 편집기 가이드</button>
    <button class="tab-btn" onclick="switchTab(event, 'tab-colors')">백틱 버튼 테마 색상</button>
    <button class="tab-btn" onclick="switchTab(event, 'tab-icons')">백틱 버튼 아이콘 정의</button>
  </div>
  <div class="tab-content">
    
    <!-- 탭 1: 이미지 편집기 -->
    <div id="tab-editor" class="tab-pane active">
      <h4>🎨 이미지 편집기 주요 단축키 및 레이어 정렬 가이드</h4>
      <p>A-Man 이미지 에디터는 마크다운 본문에 삽입된 이미지를 클릭하여 직접 그리기, 텍스트 삽입, 화살표 추가 및 도형 오버레이 등의 주석 작업을 수행할 수 있습니다.</p>
      <ul>
        <li><strong>레이어 앞으로 한 단계 조정</strong>: <kbd>Ctrl</kbd> + <kbd>]</kbd></li>
        <li><strong>레이어 뒤로 한 단계 조정</strong>: <kbd>Ctrl</kbd> + <kbd>[</kbd></li>
        <li><strong>레이어 맨 앞으로 가져오기</strong>: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>]</kbd></li>
        <li><strong>레이어 맨 뒤로 내보내기</strong>: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>[</kbd></li>
      </ul>
      <p>💡 <em>도형 요소가 다른 텍스트나 그림에 가려 보이지 않을 때 유용하게 레이어 조정을 활용할 수 있습니다.</em></p>
    </div>

    <!-- 탭 2: 백틱 테마 색상 -->
    <div id="tab-colors" class="tab-pane">
      <h4>🎨 백틱 버튼 프리셋 테마 색상 목록</h4>
      <p>인라인 코드 백틱(`)을 작성할 때 첫 인자에 테마명이나 Hex 코드를 명시하여 고유 스타일 버튼을 생성할 수 있습니다.</p>
      <table>
        <thead>
          <tr>
            <th>테마명</th>
            <th>Hex 색상</th>
            <th>색상 예시</th>
            <th>도움말 문법 예시</th>
            <th>출력 형태</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>blue</code></td>
            <td><code>#456EA6</code></td>
            <td><span class="theme-color-box" style="background-color: #456EA6;"></span></td>
            <td><code>`blue:search:조회`</code></td>
            <td>`blue:search:조회`</td>
          </tr>
          <tr>
            <td><code>mint</code></td>
            <td><code>#17A2B8</code></td>
            <td><span class="theme-color-box" style="background-color: #17A2B8;"></span></td>
            <td><code>`mint:check:저장`</code></td>
            <td>`mint:check:저장`</td>
          </tr>
          <tr>
            <td><code>red</code></td>
            <td><code>#DD5E5E</code></td>
            <td><span class="theme-color-box" style="background-color: #DD5E5E;"></span></td>
            <td><code>`red:trash:삭제`</code></td>
            <td>`red:trash:삭제`</td>
          </tr>
          <tr>
            <td><code>orange</code></td>
            <td><code>#E89646</code></td>
            <td><span class="theme-color-box" style="background-color: #E89646;"></span></td>
            <td><code>`orange:download:다운로드`</code></td>
            <td>`orange:download:다운로드`</td>
          </tr>
          <tr>
            <td><code>darkGray</code></td>
            <td><code>#646362</code></td>
            <td><span class="theme-color-box" style="background-color: #646362;"></span></td>
            <td><code>`darkGray:print:프린트`</code></td>
            <td>`darkGray:print:프린트`</td>
          </tr>
          <tr>
            <td><code>lightBlue</code></td>
            <td><code>#6AB6CF</code></td>
            <td><span class="theme-color-box" style="background-color: #6AB6CF;"></span></td>
            <td><code>`lightBlue:undo-alt:초기화`</code></td>
            <td>`lightBlue:undo-alt:초기화`</td>
          </tr>
          <tr>
            <td><code>green</code></td>
            <td><code>#2EAC7E</code></td>
            <td><span class="theme-color-box" style="background-color: #2EAC7E;"></span></td>
            <td><code>`green:edit:등록`</code></td>
            <td>`green:edit:등록`</td>
          </tr>
          <tr>
            <td><code>dark</code></td>
            <td><code>#343A40</code></td>
            <td><span class="theme-color-box" style="background-color: #343A40;"></span></td>
            <td><code>`dark:cog:기본설정`</code></td>
            <td>`dark:cog:기본설정`</td>
          </tr>
        </tbody>
      </table>
      <p>💡 <code>`ffff00:fa-edit:커스텀`</code> 과 같이 첫 번째 칸에 사용자 임의의 HEX 코드를 입력해도 해당 배경색을 가진 버튼이 자동 생성됩니다.</p>
    </div>

    <!-- 탭 3: 백틱 아이콘 정의 -->
    <div id="tab-icons" class="tab-pane">
      <h4>🔍 백틱 버튼 아이콘 지정 및 키워드 매핑 가이드</h4>
      <p>두 번째 인자에 FontAwesome 아이콘 명칭을 넣으면 아이콘 버튼이 생성됩니다. <code>fas fa-[이름]</code> 또는 간략히 <code>[이름]</code>만 적어도 동작합니다.</p>
      <ul>
        <li><strong>검색 아이콘</strong>: <code>`:search:검색`</code> → `:search:검색`</li>
        <li><strong>추가/플러스 아이콘</strong>: <code>`:plus:추가`</code> → `:plus:추가`</li>
        <li><strong>삭제/휴지통 아이콘</strong>: <code>`:trash:제거`</code> → `:trash:제거`</li>
        <li><strong>기어/환경설정 아이콘</strong>: <code>`:cog:기본설정`</code> → `:cog:기본설정`</li>
      </ul>
      <br/>
      <h4>💡 단어 자동 매핑 기능 (매우 유용!)</h4>
      <p>자주 사용되는 AssetERP 핵심 단어들은 <strong>색상과 아이콘을 생략하고 단어만 적어도</strong> 테마와 아이콘이 자동 적용됩니다.</p>
      <ul>
        <li><code>`조회`</code> 입력 시 → `조회`</li>
        <li><code>`저장`</code> 입력 시 → `저장`</li>
        <li><code>`등록`</code> 입력 시 → `등록`</li>
        <li><code>`삭제`</code> 입력 시 → `삭제`</li>
        <li><code>`취소`</code> 입력 시 → `취소`</li>
        <li><code>`다운로드`</code> 입력 시 → `다운로드`</li>
        <li><code>`초기화`</code> 입력 시 → `초기화`</li>
      </ul>
    </div>

  </div>
</div>
```

---

## 🧪 검증 계획

### 1. 자동화 테스트
수정 후 백엔드 프로젝트가 정상적으로 컴파일 및 빌드되는지 확인합니다:
```bash
./bm.sh build
```

### 2. 수동 검증 단계
- 브라우저를 통해 `/manual/help` 경로를 직접 호출하여 도움말 페이지를 로드합니다.
- 본문에 추가된 ERP 버튼(예: `` `등록` ``, `` `조회` ``, `` `삭제` `` 등)이 백엔드 전처리 필터를 통해 올바른 배경색과 FontAwesome 아이콘을 가진 ERP 스타일 버튼으로 렌더링되는지 눈으로 확인합니다.
