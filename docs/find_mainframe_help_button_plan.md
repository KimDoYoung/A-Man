# MainFrame 내 A-Man 호출 버튼 위치 및 분석 결과

이 문서는 AssetERP 클라이언트의 `MainFrame.java`에서 A-Man(도움말/매뉴얼) 페이지를 호출하는 버튼의 위치 및 구체적인 동작 메커니즘을 분석한 결과입니다.

---

## 1. Goal Description (목표 및 배경)
AssetERP 클라이언트에서 사용자가 현재 열어둔 화면에 매칭되는 도움말(A-Man) 페이지를 어떻게 호출하고, 그 버튼이 GWT UI 구조상 어느 위치(`MainFrame`)에 배치되어 동작하는지 분석하여 공유합니다.

---

## 2. 분석 결과 (Findings)

`MainFrame.java`에서 도움말을 호출하는 방식은 크게 **두 가지**가 구현되어 있습니다.

### ① 개별 화면별 동적 매뉴얼 링크 (`manualing` Anchor) - [현재 활성화된 실제 연동 방식]
* **역할**: 사용자가 TabPanel에서 특정 화면(메뉴)을 활성화(선택)할 때마다, 해당 메뉴의 매뉴얼 등록 여부를 백엔드 DB에서 확인하고 동적으로 화면 상단에 `[info] {메뉴번호} 매뉴얼` 버튼(링크)을 노출합니다.
* **UI 정의 (`manualing`)**:
  - `manualing`은 `Anchor` 객체로 정의되어 있습니다.
  - 소스코드 위치: [MainFrame.java:L97](file:///home/kdy987/work/IDMS-IC/application/src/main/java/myApp/client/vi/MainFrame.java#L97)
  ```java
  private Anchor manualing = new Anchor("");
  ```
* **동작 흐름**:
  1. **탭 선택 감지**: 사용자가 탭을 전환하면 `tabPanel.addSelectionHandler`가 동작합니다.
     - 소스코드 위치: [MainFrame.java:L218-L238](file:///home/kdy987/work/IDMS-IC/application/src/main/java/myApp/client/vi/MainFrame.java#L218-L238)
  2. **매뉴얼 URL 조회**: `checkManuel(headerStr, classStr)` 메서드를 통해 백엔드 서비스 `sys.Sys06_Menu.checkMenualUrl`을 비동기 호출합니다.
     - 소스코드 위치: [MainFrame.java:L168-L187](file:///home/kdy987/work/IDMS-IC/application/src/main/java/myApp/client/vi/MainFrame.java#L168-L187)
  3. **버튼 활성화**: DB에 등록된 매뉴얼 URL(`menualUrl`)이 있으면, 상단 버튼의 HTML을 `[Info 아이콘] + " {메뉴번호} 매뉴얼"`로 변경하고 보이게 만듭니다. 없으면 빈 텍스트로 가립니다.
  4. **클릭 이벤트**: `manualing`을 클릭(MouseDown)하면, 브라우저 새 창으로 매뉴얼 페이지를 엽니다.
     - 소스코드 위치: [MainFrame.java:L294-L303](file:///home/kdy987/work/IDMS-IC/application/src/main/java/myApp/client/vi/MainFrame.java#L294-L303)
     ```java
     manualing.addMouseDownHandler(new MouseDownHandler() {
         @Override
         public void onMouseDown(MouseDownEvent event) {
             if(menualUrl != null) {
                 String setting = "width=1200,height=800,menubars=0,toolbars=0,location=0,scrollbars=yes";
                 Window.open(menualUrl, "help menual", setting);
             }
         }
     });
     ```
* **상단 바 내 배치**: `hlc` (HorizontalLayoutContainer) 헤더 레이아웃 내에서 책갈피(검색)와 개인정보 사이에 정밀 배치되어 있습니다.
  - 소스코드 위치: [MainFrame.java:L881-L898](file:///home/kdy987/work/IDMS-IC/application/src/main/java/myApp/client/vi/MainFrame.java#L881-L898)
  ```java
  hlc.add(manualing, new HorizontalLayoutData(130, 1, new Margins(11, 20, 0, 0)));
  ```

---

### ② 전체 매뉴얼 호출용 `?` 버튼 (`helpAnchor`) - [정의되어 있으나 미배치 상태]
* **역할**: 매뉴얼 전체를 열기 위한 `?` 아이콘 모양의 버튼입니다.
* **UI 정의 (`helpAnchor`)**:
  - 소스코드 위치: [MainFrame.java:L704-L717](file:///home/kdy987/work/IDMS-IC/application/src/main/java/myApp/client/vi/MainFrame.java#L704-L717)
  ```java
  SafeHtml helpHtml = SafeHtmlUtils.fromTrustedString("<button style='color:#ffffff; cursor:pointer; border: none; background: none; cursor:pointer;'>"
          + "<b style='color:#" + fontColor + "; vertical-align:middle; font-weight:300; font-size:21px;'>?</b>"
          + "</button>");
  Anchor helpAnchor = new Anchor(helpHtml);
  helpAnchor.addMouseDownHandler(new MouseDownHandler() {
      @Override
      public void onMouseDown(MouseDownEvent event) {
          if(LoginUser.getIsManager()) {
              Window.open("user_manual.jsp?personId=admin&companyId=" + LoginUser.getCompanyId(), "helpwin", setting);
          }else {
              Window.open("user_manual.jsp?personId=" + LoginUser.getUserId() + "&companyId=" + LoginUser.getCompanyId(), "helpwin", setting);
          }
      }
  });
  ```
* **동작 및 제약**:
  - 이 `helpAnchor`는 `user_manual.jsp`로 다이렉트 호출하도록 되어 있으며 `personId`를 파라미터로 넘깁니다.
  - **특이사항**: 해당 파일 내부에서 `helpAnchor`를 정의하였으나, 상단 바 레이아웃 컨테이너인 `hlc.add(...)` 목록에 최종적으로 추가되지 않은 상태입니다. (과거 사용되었거나 비활성화된 것으로 판단됨)

---

## 3. Proposed Changes (변경 제안 내용)
* **없음 (Research/Analysis Only)**:
  - 본 요청은 단순 조사 목적이므로 코드를 직접 변경하지 않습니다.

---

## 4. Verification Plan (확인 계획)
* 사용자가 본 문서를 읽고 찾고자 하던 버튼(`manualing` 및 정의만 된 `helpAnchor`)의 메커니즘을 확인 및 승인합니다.
