# Walkthrough - Feature Implementations

This document summarizes the changes made to implement layer ordering controls, full-stack markdown backtick parsing for ERP button rendering, interactive Help page enhancement, and folder tree search bug fixes.

---

## 1. Element Layer Ordering Implementation

### Changes Made

#### [MODIFY] [FloatingPropertyPanel.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/FloatingPropertyPanel.tsx)
- Added imports for `BringToFront`, `SendToBack`, `ArrowUp`, and `ArrowDown` from `lucide-react`.
- Added a new UI section **"정렬 순서" (Order Arrangement)** at the bottom of the individual item property inspector panel.
- Implemented z-ordering controls: 맨 앞으로 (Bring to Front), 앞으로 (Bring Forward), 뒤로 (Send Backward), 맨 뒤로 (Send to Back).

#### [MODIFY] [ActionImageEditor.tsx](file:///home/kdy987/work/aman/frontend/src/components/imageditor/ActionImageEditor.tsx)
- Bound canvas element reordering keyboard shortcuts (`Ctrl + ]` / `Ctrl + [` / `Ctrl + Shift + ]` / `Ctrl + Shift + [`) and prevented default browser behavior.

---

## 2. Markdown Backtick Parsing & ERP Button Rendering (Full-Stack)

### Changes Made

#### [NEW] [AssetKbdRenderer.tsx](file:///home/kdy987/work/aman/frontend/src/components/shared/AssetKbdRenderer.tsx)
- Developed a standalone React renderer supporting custom background HEX codes, predefined groups mapping, borders tone-down, and text color contrast swaps.

#### [MODIFY] [index.html](file:///home/kdy987/work/aman/frontend/index.html) & [index.css](file:///home/kdy987/work/aman/frontend/src/index.css)
- Loaded FontAwesome 5.15.4 CDN and styled the ERP button class `kbd.asset-kbd-btn`.

#### [MODIFY] [markdownRenderer.tsx](file:///home/kdy987/work/aman/frontend/src/utils/markdownRenderer.tsx) & [MarkdownViewer.tsx](file:///home/kdy987/work/aman/frontend/src/domains/content/MarkdownViewer.tsx)
- Routed inline backtick `code` elements to `<AssetKbdRenderer>`.

---

## 3. Help Page (/manual/help) Style & Interactive Tabs Supplement

### Changes Made

#### [MODIFY] [ManualController.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/controller/ManualController.java)
- Injected FontAwesome stylesheet CDN and ERP button style configurations into the standalone HTML template of `getHelpPage()`.
- Implemented and added a Javascript click controller `switchTab(evt, tabId)` and CSS rules for `.tabs`, `.tab-header`, `.tab-btn`, and `.tab-pane` elements inside the HTML builder of `getHelpPage()`.
- **[NEW ENDPOINT]** Added `@GetMapping("/help/icons")` mapped to `/manual/help/icons` that reads `/help/icons.html` as a UTF-8 stream to serve a clean, searchable icon palette. It supports classpaths correctly, ensuring compatibility when packaged in a `.war` file.

#### [NEW] [icons.html](file:///home/kdy987/work/aman/backend/src/main/resources/help/icons.html)
- Created an interactive FontAwesome icon search utility page with a responsive search input, real-time JS-based filtering, and one-click clipboard copying. Uses the FontAwesome 5.15.4 CDN stylesheet. Styled in a clean light mode theme.

#### [MODIFY] [doc-user-help.md](file:///home/kdy987/work/aman/backend/src/main/resources/help/doc-user-help.md)
- Appended a brand new **"6. 고급 기능 가이드 (인터랙티브 안내)"** section using raw HTML blocks parsed by Flexmark.
- Constructed a tabbed layout containing two tab blocks (consolidating old 3 tabs into 2 tabs for clean display):
  - **이미지 편집기 가이드**: Explains the z-order shortcuts.
  - **아이콘 & 색상**: Consolidates ERP Button Theme Colors and FontAwesome Icon definitions. Lists all colors (8 types) and all defined icons (25 types) in simple grids (Colored Box : Hex / Icon : Name) with copy-to-clipboard buttons next to each, making it extremely easy for users to copy values and paste them into the markdown editor.
- **[NEW]** Added a link button at the bottom of the FontAwesome grid that redirects to `./help/icons` in a new tab for finding other icons.
- **[BUG FIX]** Replaced the single unmatched backtick character `백틱(`)` on line 131 with the HTML character entity `&#96;`. This prevents the regex engine from matching it greedily across 50 lines, which previously swallowed the HTML tab pane definitions and caused `classList` property of null JavaScript crashes when switching tabs.
- **[BUG FIX]** Removed native blocking alert popups from all copy icons to make clipboard actions silent.

---

## 4. Normal User (/docs) Folder Tree Filtering Bug Fix

### Cause of Bug
- When a user filters the tree, the backend returns only the matching folders. Their parent/grandparent folders are not returned by the backend unless they also match the filter keyword.
- Consequently, those parent folders are not present in the frontend's raw folders map.
- For the admin view (`isDocUser = true`), if a folder's parent is not in the map, it is allowed to be rendered as a root-level node so that users can see the matching search results.
- However, for the general user view (`isDocUser = false`), there was a check to prevent rendering orphaned children (which happens when their parent is disabled and excluded). Because this check was strictly `if (isDocUser)`, it also blocked rendering matching search results when filtering, because their parents were missing from the map due to filtering, not due to being disabled.

### Solution Applied
- **[MODIFY] [FolderTree.tsx](file:///home/kdy987/work/aman/frontend/src/components/shared/FolderTree.tsx)**:
  - Relaxed the condition on line 387 from `if (isDocUser)` to `if (isDocUser || filterText.trim() !== '')`.
  - This allows search results to be displayed at the root level during active searching for normal users, while still maintaining disabled parent-child exclusions when no search filter is active.

### Verification & Validation
- **Frontend check**: `./fm.sh build` ran and completed successfully, verifying the code compiles cleanly for production.
