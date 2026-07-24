package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.config.SystemSettings;
import kr.co.kfs.aman.model.Folder;
import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.FolderRepository;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;

import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.gfm.tasklist.TaskListExtension;
import java.util.Optional;

@RestController
@RequestMapping("/manual")
public class ManualController {

    private static final String TOC_CSS = 
        "        /* --- Floating TOC & ScrollToTop outside Container Bounds --- */\n" +
        "        .floating-toc-trigger {\n" +
        "            position: fixed;\n" +
        "            bottom: 30px;\n" +
        "            left: calc(50% + 450px + 50px);\n" +
        "            width: 44px;\n" +
        "            height: 44px;\n" +
        "            border-radius: 50%;\n" +
        "            background-color: rgba(99, 102, 241, 0.35);\n" +
        "            color: rgba(99, 102, 241, 0.75);\n" +
        "            border: 1px solid rgba(99, 102, 241, 0.35);\n" +
        "            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);\n" +
        "            cursor: pointer;\n" +
        "            display: flex;\n" +
        "            align-items: center;\n" +
        "            justify-content: center;\n" +
        "            transition: all 0.2s ease;\n" +
        "            z-index: 999;\n" +
        "        }\n" +
        "        .floating-toc-trigger:hover {\n" +
        "            transform: scale(1.05);\n" +
        "            background-color: rgba(99, 102, 241, 0.95);\n" +
        "            color: #ffffff;\n" +
        "            border-color: #6366f1;\n" +
        "            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);\n" +
        "        }\n" +
        "        .dark-mode .floating-toc-trigger {\n" +
        "            background-color: rgba(99, 102, 241, 0.25);\n" +
        "            color: rgba(129, 140, 248, 0.65);\n" +
        "            border-color: rgba(99, 102, 241, 0.35);\n" +
        "        }\n" +
        "        .dark-mode .floating-toc-trigger:hover {\n" +
        "            background-color: rgba(99, 102, 241, 0.9);\n" +
        "            color: #ffffff;\n" +
        "            border-color: #6366f1;\n" +
        "            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.4);\n" +
        "        }\n" +
        "        .floating-scroll-top {\n" +
        "            position: fixed;\n" +
        "            bottom: 30px;\n" +
        "            left: calc(50% - 450px - 50px - 44px);\n" +
        "            width: 44px;\n" +
        "            height: 44px;\n" +
        "            border-radius: 50%;\n" +
        "            background-color: rgba(203, 213, 225, 0.7);\n" +
        "            color: rgba(71, 85, 105, 0.7);\n" +
        "            border: 1px solid rgba(203, 213, 225, 0.6);\n" +
        "            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);\n" +
        "            cursor: pointer;\n" +
        "            display: flex;\n" +
        "            align-items: center;\n" +
        "            justify-content: center;\n" +
        "            transition: all 0.2s ease;\n" +
        "            z-index: 999;\n" +
        "            opacity: 0;\n" +
        "            visibility: hidden;\n" +
        "        }\n" +
        "        .floating-scroll-top.show {\n" +
        "            opacity: 1;\n" +
        "            visibility: visible;\n" +
        "        }\n" +
        "        .floating-scroll-top:hover {\n" +
        "            transform: scale(1.05);\n" +
        "            background-color: rgba(226, 232, 240, 0.95);\n" +
        "            color: rgba(15, 23, 42, 0.8);\n" +
        "            border-color: rgba(203, 213, 225, 0.8);\n" +
        "            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);\n" +
        "        }\n" +
        "        .dark-mode .floating-scroll-top {\n" +
        "            background-color: rgba(51, 65, 85, 0.5);\n" +
        "            color: rgba(148, 163, 184, 0.65);\n" +
        "            border-color: rgba(51, 65, 85, 0.5);\n" +
        "        }\n" +
        "        .dark-mode .floating-scroll-top:hover {\n" +
        "            background-color: rgba(51, 65, 85, 0.9);\n" +
        "            color: #f1f5f9;\n" +
        "            border-color: rgba(71, 85, 105, 0.8);\n" +
        "            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);\n" +
        "        }\n" +
        "        .container.width-wide .floating-toc-trigger {\n" +
        "            left: calc(50% + 640px + 50px);\n" +
        "        }\n" +
        "        .container.width-wide .floating-scroll-top {\n" +
        "            left: calc(50% - 640px - 50px - 44px);\n" +
        "        }\n" +
        "        .container.width-full .floating-toc-trigger {\n" +
        "            left: auto;\n" +
        "            right: 15px;\n" +
        "        }\n" +
        "        .container.width-full .floating-scroll-top {\n" +
        "            left: 15px;\n" +
        "        }\n" +
        "        @media (max-width: 1120px) {\n" +
        "            .floating-toc-trigger {\n" +
        "                left: auto;\n" +
        "                right: 15px;\n" +
        "            }\n" +
        "            .floating-scroll-top {\n" +
        "                left: 15px;\n" +
        "            }\n" +
        "            .container.width-wide .floating-toc-trigger,\n" +
        "            .container.width-wide .floating-scroll-top {\n" +
        "                left: auto;\n" +
        "                right: 15px;\n" +
        "            }\n" +
        "        }\n" +
        "        .toc-drawer-overlay {\n" +
        "            position: fixed;\n" +
        "            top: 0;\n" +
        "            left: 0;\n" +
        "            width: 100vw;\n" +
        "            height: 100vh;\n" +
        "            background-color: rgba(15, 23, 42, 0.4);\n" +
        "            z-index: 998;\n" +
        "            display: none;\n" +
        "            opacity: 0;\n" +
        "            transition: opacity 0.3s ease;\n" +
        "        }\n" +
        "        .toc-drawer-overlay.open {\n" +
        "            display: block;\n" +
        "            opacity: 1;\n" +
        "        }\n" +
        "        .toc-drawer {\n" +
        "            position: fixed;\n" +
        "            top: 0;\n" +
        "            right: -320px;\n" +
        "            width: 300px;\n" +
        "            height: 100vh;\n" +
        "            background-color: #ffffff;\n" +
        "            border-left: 1px solid #e2e8f0;\n" +
        "            box-shadow: -4px 0 15px rgba(0, 0, 0, 0.08);\n" +
        "            transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);\n" +
        "            z-index: 1000;\n" +
        "            display: flex;\n" +
        "            flex-direction: column;\n" +
        "            padding: 24px;\n" +
        "            box-sizing: border-box;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer {\n" +
        "            background-color: #1e293b;\n" +
        "            border-left-color: #334155;\n" +
        "            box-shadow: -4px 0 15px rgba(0, 0, 0, 0.3);\n" +
        "        }\n" +
        "        .toc-drawer.open {\n" +
        "            right: 0;\n" +
        "        }\n" +
        "        .toc-drawer-header {\n" +
        "            display: flex;\n" +
        "            justify-content: space-between;\n" +
        "            align-items: center;\n" +
        "            border-bottom: 1px solid #e2e8f0;\n" +
        "            padding-bottom: 12px;\n" +
        "            margin-bottom: 20px;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-header {\n" +
        "            border-bottom-color: #334155;\n" +
        "        }\n" +
        "        .toc-drawer-title {\n" +
        "            font-size: 14px;\n" +
        "            font-weight: 700;\n" +
        "            color: #1e293b;\n" +
        "            display: flex;\n" +
        "            align-items: center;\n" +
        "            gap: 6px;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-title {\n" +
        "            color: #f1f5f9;\n" +
        "        }\n" +
        "        .toc-drawer-close {\n" +
        "            background: none;\n" +
        "            border: none;\n" +
        "            font-size: 18px;\n" +
        "            color: #94a3b8;\n" +
        "            cursor: pointer;\n" +
        "            transition: color 0.2s;\n" +
        "            display: flex;\n" +
        "            align-items: center;\n" +
        "            justify-content: center;\n" +
        "            width: 24px;\n" +
        "            height: 24px;\n" +
        "            border-radius: 4px;\n" +
        "        }\n" +
        "        .toc-drawer-close:hover {\n" +
        "            color: #475569;\n" +
        "            background-color: #f1f5f9;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-close:hover {\n" +
        "            color: #cbd5e1;\n" +
        "            background-color: #334155;\n" +
        "        }\n" +
        "        .toc-drawer-list {\n" +
        "            list-style: decimal;\n" +
        "            padding-left: 20px;\n" +
        "            margin: 0;\n" +
        "            overflow-y: auto;\n" +
        "            flex: 1;\n" +
        "            font-size: 13px;\n" +
        "        }\n" +
        "        .toc-drawer-item {\n" +
        "            margin-bottom: 12px;\n" +
        "        }\n" +
        "        .toc-drawer-link {\n" +
        "            color: #475569;\n" +
        "            text-decoration: none;\n" +
        "            font-weight: 500;\n" +
        "            transition: color 0.2s;\n" +
        "            display: block;\n" +
        "            line-height: 1.4;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-link {\n" +
        "            color: #cbd5e1;\n" +
        "        }\n" +
        "        .toc-drawer-link:hover {\n" +
        "            color: #4f46e5;\n" +
        "        }\n" +
        "        .dark-mode .toc-drawer-link:hover {\n" +
        "            color: #818cf8;\n" +
        "        }\n";

    private static final String TOC_SCRIPT =
        "    <script>\n" +
        "        document.addEventListener('DOMContentLoaded', function() {\n" +
        "            const contentContainer = document.querySelector('.container');\n" +
        "            if (!contentContainer) return;\n" +
        "            \n" +
        "            const headings = Array.from(contentContainer.querySelectorAll('h2')).filter(h => !h.textContent.includes('목차'));\n" +
        "            if (headings.length === 0) return;\n" +
        "            \n" +
        "            const overlay = document.createElement('div');\n" +
        "            overlay.className = 'toc-drawer-overlay';\n" +
        "            document.body.appendChild(overlay);\n" +
        "            \n" +
        "            const drawer = document.createElement('div');\n" +
        "            drawer.className = 'toc-drawer';\n" +
        "            \n" +
        "            const header = document.createElement('div');\n" +
        "            header.className = 'toc-drawer-header';\n" +
        "            \n" +
        "            const title = document.createElement('span');\n" +
        "            title.className = 'toc-drawer-title';\n" +
        "            title.textContent = '📌 본문 목차';\n" +
        "            header.appendChild(title);\n" +
        "            \n" +
        "            const closeBtn = document.createElement('button');\n" +
        "            closeBtn.className = 'toc-drawer-close';\n" +
        "            closeBtn.innerHTML = '✕';\n" +
"            header.appendChild(closeBtn);\n" +
        "            drawer.appendChild(header);\n" +
        "            \n" +
        "            const ol = document.createElement('ol');\n" +
        "            ol.className = 'toc-drawer-list';\n" +
        "            \n" +
        "            headings.forEach((heading, idx) => {\n" +
        "                let id = heading.textContent.trim()\n" +
        "                    .toLowerCase()\n" +
        "                    .replace(/\\s+/g, '-')\n" +
        "                    .replace(/[^\\w\\s가-힣.-]/g, '');\n" +
        "                if (!id) id = 'heading-' + idx;\n" +
        "                heading.id = id;\n" +
        "                heading.style.scrollMarginTop = '30px';\n" +
        "                \n" +
        "                const li = document.createElement('li');\n" +
        "                li.className = 'toc-drawer-item';\n" +
        "                \n" +
        "                const a = document.createElement('a');\n" +
        "                a.className = 'toc-drawer-link';\n" +
        "                a.href = '#' + id;\n" +
        "                a.textContent = heading.textContent;\n" +
        "                \n" +
        "                a.addEventListener('click', function(e) {\n" +
        "                    e.preventDefault();\n" +
        "                    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });\n" +
        "                    history.pushState(null, '', '#' + id);\n" +
        "                    closeDrawer();\n" +
        "                });\n" +
        "                \n" +
        "                li.appendChild(a);\n" +
        "                ol.appendChild(li);\n" +
        "            });\n" +
        "            drawer.appendChild(ol);\n" +
        "            document.body.appendChild(drawer);\n" +
        "            \n" +
        "            const trigger = document.createElement('button');\n" +
        "            trigger.className = 'floating-toc-trigger';\n" +
        "            trigger.setAttribute('title', '목차 보기(ESC)');\n" +
        "            trigger.innerHTML = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"4\" y1=\"6\" x2=\"20\" y2=\"6\"/><line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"/><line x1=\"4\" y1=\"18\" x2=\"20\" y2=\"18\"/></svg>';\n" +
        "            contentContainer.appendChild(trigger);\n" +
        "            \n" +
        "            const scrollTopBtn = document.createElement('button');\n" +
        "            scrollTopBtn.className = 'floating-scroll-top';\n" +
        "            scrollTopBtn.setAttribute('title', '맨 위로 스크롤');\n" +
        "            scrollTopBtn.innerHTML = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"18 15 12 9 6 15\"/></svg>';\n" +
        "            contentContainer.appendChild(scrollTopBtn);\n" +
        "            \n" +
        "            function openDrawer() {\n" +
        "                drawer.classList.add('open');\n" +
        "                overlay.classList.add('open');\n" +
        "            }\n" +
        "            \n" +
        "            function closeDrawer() {\n" +
        "                drawer.classList.remove('open');\n" +
        "                overlay.classList.remove('open');\n" +
        "            }\n" +
        "            \n" +
        "            function toggleDrawer() {\n" +
        "                if (drawer.classList.contains('open')) {\n" +
        "                    closeDrawer();\n" +
        "                } else {\n" +
        "                    openDrawer();\n" +
        "                }\n" +
        "            }\n" +
        "            \n" +
        "            trigger.addEventListener('click', toggleDrawer);\n" +
        "            closeBtn.addEventListener('click', closeDrawer);\n" +
        "            overlay.addEventListener('click', closeDrawer);\n" +
        "            \n" +
        "            window.addEventListener('scroll', function() {\n" +
        "                if (window.scrollY > 200) {\n" +
        "                    scrollTopBtn.classList.add('show');\n" +
        "                } else {\n" +
        "                    scrollTopBtn.classList.remove('show');\n" +
        "                }\n" +
        "            });\n" +
        "            \n" +
        "            scrollTopBtn.addEventListener('click', function() {\n" +
        "                window.scrollTo({ top: 0, behavior: 'smooth' });\n" +
        "            });\n" +
        "            \n" +
        "            window.addEventListener('keydown', function(e) {\n" +
        "                const activeEl = document.activeElement;\n" +
        "                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {\n" +
        "                    return;\n" +
        "                }\n" +
        "                if (e.key === 'Insert' || e.key === 'Delete' || e.key === 'Escape' || e.key === 'Esc') {\n" +
        "                    e.preventDefault();\n" +
        "                    toggleDrawer();\n" +
        "                }\n" +
        "            });\n" +
        "        });\n" +
        "    </script>\n";

    @Value("${spring.application.version:1.0.0}")
    private String appVersion;

    private final PageRepository pageRepository;
    private final FolderRepository folderRepository;
    private final SystemSettings systemSettings;

    public ManualController(PageRepository pageRepository, FolderRepository folderRepository, SystemSettings systemSettings) {
        this.pageRepository = pageRepository;
        this.folderRepository = folderRepository;
        this.systemSettings = systemSettings;
    }

    @GetMapping(value = "/new-aka", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<String> generateNewAka(
            @RequestParam(value = "folderId", required = false) Long folderId) {
        
        // 1. AKA_NUMS_FIRST가 true이고 folderId가 전송되었을 경우
        if (folderId != null && systemSettings.getBoolean("AKA_NUMS_FIRST", false)) {
            Optional<Folder> folderOpt = folderRepository.findById(folderId);
            if (folderOpt.isPresent()) {
                Folder folder = folderOpt.get();
                if (folder.getNums() != null && !folder.getNums().trim().isEmpty()) {
                    return ResponseEntity.ok(folder.getNums().trim());
                } else {
                    // nums가 없는 폴더는 5자리 고유 난수 번호 발급 (10000 ~ 99999)
                    String candidate;
                    int maxAttempts = 100;
                    int attempts = 0;
                    do {
                        int num = java.util.concurrent.ThreadLocalRandom.current().nextInt(10000, 100000);
                        candidate = String.valueOf(num);
                        attempts++;
                        if (attempts > maxAttempts) {
                            return ResponseEntity.status(500).body("고유한 AKA 코드를 생성할 수 없습니다.");
                        }
                    } while (pageRepository.findByAka(candidate).isPresent());
                    return ResponseEntity.ok(candidate);
                }
            }
        }

        // 2. 기본값: 4자리 고유 난수 번호 발급 (1000 ~ 9999)
        String candidate;
        int maxAttempts = 100;
        int attempts = 0;
        
        do {
            int num = java.util.concurrent.ThreadLocalRandom.current().nextInt(1000, 10000);
            candidate = String.valueOf(num);
            attempts++;
            if (attempts > maxAttempts) {
                return ResponseEntity.status(500).body("고유한 AKA 코드를 생성할 수 없습니다.");
            }
        } while (pageRepository.findByAka(candidate).isPresent());
        
        return ResponseEntity.ok(candidate);
    }

    @GetMapping(value = "/{aka}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> getManualByAka(@PathVariable("aka") String aka) {
        Optional<Page> pageOpt = pageRepository.findByAka(aka);
        if (!pageOpt.isPresent() || !"PUBLISHED".equals(pageOpt.get().getStatus())) {
            return ResponseEntity.status(404).body(
                "<html><body style='font-family:sans-serif; text-align:center; padding:100px; color:#64748b;'>" +
                "<h2>⚠️ 도움말 페이지를 찾을 수 없습니다.</h2>" +
                "<p>해당 코드(" + escapeHtml(aka) + ")에 등록된 메뉴얼이 존재하지 않거나 준비 중입니다.</p>" +
                "</body></html>"
            );
        }

        Page page = pageOpt.get();
        String title = page.getTitle();
        String parsedBody = parseMarkdownToHtml(page.getContent());

        // 1. Build breadcrumbs
        java.util.List<Folder> hierarchy = new java.util.ArrayList<>();
        Folder currentFolder = page.getFolder();
        while (currentFolder != null) {
            hierarchy.add(0, currentFolder);
            currentFolder = currentFolder.getParent();
        }

        StringBuilder breadcrumbsHtml = new StringBuilder();
        breadcrumbsHtml.append("<div class=\"breadcrumbs\">\n");
        breadcrumbsHtml.append("    <a href=\"/aman/docs\">Home</a>");
        for (Folder f : hierarchy) {
            breadcrumbsHtml.append("    <span class=\"separator\">&gt;</span>\n");
            // Check if this folder has a published page
            java.util.List<Page> fPages = pageRepository.findByFolderIdOrderBySortOrderAsc(f.getId());
            Page firstPublishedPage = null;
            for (Page p : fPages) {
                if ("PUBLISHED".equals(p.getStatus())) {
                    firstPublishedPage = p;
                    break;
                }
            }
            String displayName = f.getName();
            if (f.getNums() != null && !f.getNums().isEmpty()) {
                displayName = f.getNums() + " " + displayName;
            }
            if (firstPublishedPage != null && firstPublishedPage.getAka() != null && !firstPublishedPage.getAka().isEmpty()) {
                breadcrumbsHtml.append("    <a href=\"/aman/manual/")
                               .append(firstPublishedPage.getAka())
                               .append("\">")
                               .append(escapeHtml(displayName))
                               .append("</a>\n");
            } else {
                breadcrumbsHtml.append("    <span class=\"folder-name\">")
                               .append(escapeHtml(displayName))
                               .append("</span>\n");
            }
        }
        breadcrumbsHtml.append("</div>\n");

        // 2. Build footer (prev/next pages)
        java.util.List<Page> orderedPages = getAllOrderedPublishedPages();
        Page prevPage = null;
        Page nextPage = null;
        for (int i = 0; i < orderedPages.size(); i++) {
            if (orderedPages.get(i).getId().equals(page.getId())) {
                if (i > 0) {
                    prevPage = orderedPages.get(i - 1);
                }
                if (i < orderedPages.size() - 1) {
                    nextPage = orderedPages.get(i + 1);
                }
                break;
            }
        }

        StringBuilder footerHtml = new StringBuilder();
        footerHtml.append("<div class=\"navigation-footer\">\n");
        if (prevPage != null) {
            String prevTitle = prevPage.getTitle();
            footerHtml.append("    <a href=\"/aman/manual/")
                      .append(prevPage.getAka())
                      .append("\" class=\"nav-button prev\">\n")
                      .append("        <span class=\"arrow\">&lt;</span>\n")
                      .append("        <span class=\"nav-title\">")
                      .append(escapeHtml(prevTitle))
                      .append("</span>\n")
                      .append("    </a>\n");
        } else {
            footerHtml.append("    <div class=\"nav-placeholder\"></div>\n");
        }
        if (nextPage != null) {
            String nextPageTitle = nextPage.getTitle();
            footerHtml.append("    <a href=\"/aman/manual/")
                      .append(nextPage.getAka())
                      .append("\" class=\"nav-button next\">\n")
                      .append("        <span class=\"nav-title\">")
                      .append(escapeHtml(nextPageTitle))
                      .append("</span>\n")
                      .append("        <span class=\"arrow\">&gt;</span>\n")
                      .append("    </a>\n");
        } else {
            footerHtml.append("    <div class=\"nav-placeholder\"></div>\n");
        }
        footerHtml.append("</div>\n");

        boolean isBlank = systemSettings.getBoolean("LINK_BLANK", true);
        String targetBlankScript = 
            "    <script>\n" +
            "        document.addEventListener('DOMContentLoaded', function() {\n" +
            (isBlank ?
            "            var links = document.querySelectorAll('.container a, .navigation-footer a');\n" +
            "            for (var i = 0; i < links.length; i++) {\n" +
            "                if (links[i].closest('.breadcrumbs') || links[i].closest('.navigation-footer')) {\n" +
            "                    continue;\n" +
            "                }\n" +
            "                links[i].setAttribute('target', '_blank');\n" +
            "                links[i].setAttribute('rel', 'noopener noreferrer');\n" +
            "            }\n" : "") +
            "        });\n" +
            "    </script>\n";

        String settingsScript = 
            "    <script>\n" +
            "        (function() {\n" +
            "            var fontSizes = ['sm', 'base', 'lg', 'xl'];\n" +
            "            var contentWidths = ['normal', 'wide', 'full'];\n" +
            "            var currentSettings = { fontSize: 'base', contentWidth: 'normal', theme: 'light' };\n" +
            "            function loadSettings() {\n" +
            "                try {\n" +
            "                    var saved = localStorage.getItem('manual-user-setting');\n" +
            "                    if (saved) {\n" +
            "                        var parsed = JSON.parse(saved);\n" +
            "                        if (parsed.fontSize) currentSettings.fontSize = parsed.fontSize;\n" +
            "                        if (parsed.contentWidth) currentSettings.contentWidth = parsed.contentWidth;\n" +
            "                        if (parsed.theme) currentSettings.theme = parsed.theme;\n" +
            "                    }\n" +
            "                } catch(e) {}\n" +
            "            }\n" +
            "            function saveSettings() {\n" +
            "                try {\n" +
            "                    localStorage.setItem('manual-user-setting', JSON.stringify(currentSettings));\n" +
            "                } catch(e) {}\n" +
            "            }\n" +
            "            function applySettings() {\n" +
            "                var container = document.querySelector('.container');\n" +
            "                if (!container) return;\n" +
            "                container.classList.remove('font-sm', 'font-base', 'font-lg', 'font-xl');\n" +
            "                container.classList.add('font-' + currentSettings.fontSize);\n" +
            "                container.classList.remove('width-normal', 'width-wide', 'width-full');\n" +
            "                container.classList.add('width-' + currentSettings.contentWidth);\n" +
            "                var fontIndicator = document.getElementById('fontIndicator');\n" +
            "                if (fontIndicator) {\n" +
            "                    fontIndicator.innerText = currentSettings.fontSize.toUpperCase();\n" +
            "                }\n" +
            "                var widthText = document.getElementById('widthText');\n" +
            "                if (widthText) {\n" +
            "                    var widthLabel = '보통';\n" +
            "                    if (currentSettings.contentWidth === 'wide') widthLabel = '넓게';\n" +
            "                    else if (currentSettings.contentWidth === 'full') widthLabel = '꽉차게';\n" +
            "                    widthText.innerText = '폭: ' + widthLabel;\n" +
            "                }\n" +
            "                var fontDecBtn = document.getElementById('fontDecBtn');\n" +
            "                if (fontDecBtn) fontDecBtn.disabled = (currentSettings.fontSize === 'sm');\n" +
            "                var fontIncBtn = document.getElementById('fontIncBtn');\n" +
            "                if (fontIncBtn) fontIncBtn.disabled = (currentSettings.fontSize === 'xl');\n" +
            "                \n" +
            "                if (currentSettings.theme === 'dark') {\n" +
            "                    document.body.classList.add('dark-mode');\n" +
            "                } else {\n" +
            "                    document.body.classList.remove('dark-mode');\n" +
            "                }\n" +
            "                var knob = document.getElementById('themeSwitchKnob');\n" +
            "                var switchBg = document.getElementById('themeSwitchContainer');\n" +
            "                var sunIcon = document.getElementById('sunIcon');\n" +
            "                var moonIcon = document.getElementById('moonIcon');\n" +
            "                if (knob && switchBg) {\n" +
            "                    knob.style.transform = currentSettings.theme === 'dark' ? 'translateX(14px)' : 'translateX(0)';\n" +
            "                    switchBg.style.backgroundColor = currentSettings.theme === 'dark' ? '#4f46e5' : 'rgba(226, 232, 240, 0.5)';\n" +
            "                    switchBg.style.borderColor = currentSettings.theme === 'dark' ? '#4f46e5' : '#cbd5e1';\n" +
            "                }\n" +
            "                if (sunIcon) {\n" +
            "                    sunIcon.style.stroke = currentSettings.theme === 'light' ? '#f59e0b' : '#64748b';\n" +
            "                }\n" +
            "                if (moonIcon) {\n" +
            "                    moonIcon.style.stroke = currentSettings.theme === 'dark' ? '#818cf8' : '#94a3b8';\n" +
            "                }\n" +
            "            }\n" +
            "            document.addEventListener('DOMContentLoaded', function() {\n" +
            "                loadSettings();\n" +
            "                applySettings();\n" +
            "                var settingsToggleBtn = document.getElementById('settingsToggleBtn');\n" +
            "                var settingsPanel = document.getElementById('settingsPanel');\n" +
            "                if (settingsToggleBtn && settingsPanel) {\n" +
            "                    settingsToggleBtn.addEventListener('click', function() {\n" +
            "                        var isOpen = settingsPanel.classList.toggle('open');\n" +
            "                        settingsToggleBtn.classList.toggle('active', isOpen);\n" +
            "                    });\n" +
            "                }\n" +
            "                var fontDecBtn = document.getElementById('fontDecBtn');\n" +
            "                if (fontDecBtn) {\n" +
            "                    fontDecBtn.addEventListener('click', function() {\n" +
            "                        var idx = fontSizes.indexOf(currentSettings.fontSize);\n" +
            "                        if (idx > 0) {\n" +
            "                            currentSettings.fontSize = fontSizes[idx - 1];\n" +
            "                            saveSettings();\n" +
            "                            applySettings();\n" +
            "                        }\n" +
            "                    });\n" +
            "                }\n" +
            "                var fontIncBtn = document.getElementById('fontIncBtn');\n" +
            "                if (fontIncBtn) {\n" +
            "                    fontIncBtn.addEventListener('click', function() {\n" +
            "                        var idx = fontSizes.indexOf(currentSettings.fontSize);\n" +
            "                        if (idx < fontSizes.length - 1) {\n" +
            "                            currentSettings.fontSize = fontSizes[idx + 1];\n" +
            "                            saveSettings();\n" +
            "                            applySettings();\n" +
            "                        }\n" +
            "                    });\n" +
            "                }\n" +
            "                var widthToggleBtn = document.getElementById('widthToggleBtn');\n" +
            "                if (widthToggleBtn) {\n" +
            "                    widthToggleBtn.addEventListener('click', function() {\n" +
            "                        var idx = contentWidths.indexOf(currentSettings.contentWidth);\n" +
            "                        var nextIdx = (idx + 1) % contentWidths.length;\n" +
            "                        currentSettings.contentWidth = contentWidths[nextIdx];\n" +
            "                        saveSettings();\n" +
            "                        applySettings();\n" +
            "                    });\n" +
            "                }\n" +
            "                var themeToggleBtn = document.getElementById('themeSwitchContainer');\n" +
            "                if (themeToggleBtn) {\n" +
            "                    themeToggleBtn.addEventListener('click', function() {\n" +
            "                        currentSettings.theme = currentSettings.theme === 'light' ? 'dark' : 'light';\n" +
            "                        saveSettings();\n" +
            "                        applySettings();\n" +
            "                    });\n" +
            "                }\n" +
            "            });\n" +
            "        })();\n" +
            "    </script>\n";

        String fullHtml = 
            "<!DOCTYPE html>\n" +
            "<html lang=\"ko\">\n" +
            "<head>\n" +
            "    <meta charset=\"UTF-8\">\n" +
            "    <link rel=\"icon\" type=\"image/png\" href=\"/aman/favicon.png\">\n" +
            "    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css\" />\n" +
            "    <title>" + escapeHtml(title) + "</title>\n" +
            "    <style>\n" +
            "        body {\n" +
            "            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n" +
            "            padding: 30px;\n" +
            "            margin: 0;\n" +
            "            color: #334155;\n" +
            "            background-color: #f8fafc;\n" +
            "            line-height: 1.6;\n" +
            "            transition: background-color 0.2s, color 0.2s;\n" +
            "        }\n" +
            "        .container {\n" +
            "            background-color: #ffffff;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            padding: 40px;\n" +
            "            border-radius: 12px;\n" +
            "            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);\n" +
            "            margin: 20px auto;\n" +
            "            position: relative;\n" +
            "            transition: background-color 0.2s, border-color 0.2s;\n" +
            "        }\n" +
            "        code {\n" +
            "            background-color: #f1f5f9;\n" +
            "            color: #db2777;\n" +
            "            padding: 2px 6px;\n" +
            "            border-radius: 4px;\n" +
            "            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n" +
            "            font-size: 0.85em;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            transition: background-color 0.2s, border-color 0.2s, color 0.2s;\n" +
            "            user-select: none;\n" +
            "            -webkit-user-select: none;\n" +
            "            -ms-user-select: none;\n" +
            "            -moz-user-select: none;\n" +
            "        }\n" +
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
            "        .dark-mode kbd {\n" +
            "            color: #c9d1d9;\n" +
            "            background: #161b22;\n" +
            "            border-color: #30363d;\n" +
            "            box-shadow: inset 0 -2px 0 #30363d;\n" +
            "        }\n" +
            "        pre {\n" +
            "            background-color: #f1f5f9;\n" +
            "            color: #1e293b;\n" +
            "            padding: 16px;\n" +
            "            border-radius: 8px;\n" +
            "            overflow-x: auto;\n" +
            "            margin: 16px 0;\n" +
            "            border: 1px solid #cbd5e1;\n" +
            "            position: relative;\n" +
            "            transition: background-color 0.2s, border-color 0.2s, color 0.2s;\n" +
            "            user-select: none;\n" +
            "            -webkit-user-select: none;\n" +
            "            -ms-user-select: none;\n" +
            "            -moz-user-select: none;\n" +
            "        }\n" +
            "        pre code {\n" +
            "            background-color: transparent;\n" +
            "            color: inherit;\n" +
            "            padding: 0;\n" +
            "            border-radius: 0;\n" +
            "            border: none;\n" +
            "            font-size: 13px;\n" +
            "        }\n" +
            "        table {\n" +
            "            width: 100%;\n" +
            "            border-collapse: collapse;\n" +
            "            margin: 20px 0;\n" +
            "            font-size: 13px;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            border-radius: 8px;\n" +
            "            overflow: hidden;\n" +
            "            transition: border-color 0.2s;\n" +
            "        }\n" +
            "        th, td {\n" +
            "            padding: 10px 16px;\n" +
            "            border-bottom: 1px solid #e2e8f0;\n" +
            "            transition: border-color 0.2s, color 0.2s, background-color 0.2s;\n" +
            "        }\n" +
            "        th {\n" +
            "            background-color: #f8fafc;\n" +
            "            font-weight: 600;\n" +
            "            color: #1e293b;\n" +
            "            text-align: left;\n" +
            "        }\n" +
            "        td {\n" +
            "            color: #475569;\n" +
            "        }\n" +
            "        blockquote {\n" +
            "            margin: 14px 0;\n" +
            "            padding: 12px 18px;\n" +
            "            background-color: #f7f9fb;\n" +
            "            border-left: 3px solid #c7dbf0;\n" +
            "            border-radius: 6px;\n" +
            "            color: #455160;\n" +
            "            font-size: 14px;\n" +
            "            transition: border-color 0.2s, color 0.2s, background-color 0.2s;\n" +
            "        }\n" +
            "        blockquote p {\n" +
            "            margin: 4px 0;\n" +
            "            font-size: 14px;\n" +
            "        }\n" +
            "        img {\n" +
            "            max-width: 100%;\n" +
            "            height: auto;\n" +
            "            display: block;\n" +
            "            margin: 16px auto;\n" +
            "            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n" +
            "        }\n" +
            "        a {\n" +
            "            color: #4f46e5;\n" +
            "            text-decoration: none;\n" +
            "            transition: color 0.2s;\n" +
            "        }\n" +
            "        a:hover {\n" +
            "            text-decoration: underline;\n" +
            "        }\n" +
            "        \n" +
            "        /* Task List Styles */\n" +
            "        .task-list-item {\n" +
            "            list-style-type: none !important;\n" +
            "        }\n" +
            "        .task-list-item-checkbox {\n" +
            "            margin-right: 6px;\n" +
            "            vertical-align: middle;\n" +
            "        }\n" +
            "        .breadcrumbs {\n" +
            "            font-size: 13px;\n" +
            "            color: #64748b;\n" +
            "            margin-bottom: 24px;\n" +
            "            padding-bottom: 12px;\n" +
            "            border-bottom: 1px solid #e2e8f0;\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            flex-wrap: wrap;\n" +
            "            gap: 6px;\n" +
            "            transition: border-color 0.2s, color 0.2s;\n" +
            "        }\n" +
            "        .breadcrumbs a {\n" +
            "            color: #6366f1;\n" +
            "            text-decoration: none;\n" +
            "            font-weight: 500;\n" +
            "            transition: color 0.2s;\n" +
            "        }\n" +
            "        .breadcrumbs a:hover {\n" +
            "            text-decoration: underline;\n" +
            "        }\n" +
            "        .breadcrumbs .separator {\n" +
            "            color: #cbd5e1;\n" +
            "            user-select: none;\n" +
            "        }\n" +
            "        .breadcrumbs .folder-name {\n" +
            "            color: #475569;\n" +
            "            font-weight: 500;\n" +
            "            transition: color 0.2s;\n" +
            "        }\n" +
            "        .navigation-footer {\n" +
            "            margin-top: 40px;\n" +
            "            padding-top: 24px;\n" +
            "            border-top: 1px solid #e2e8f0;\n" +
            "            display: flex;\n" +
            "            justify-content: space-between;\n" +
            "            align-items: center;\n" +
            "            gap: 16px;\n" +
            "            transition: border-color 0.2s;\n" +
            "        }\n" +
            "        .nav-button {\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            gap: 8px;\n" +
            "            text-decoration: none;\n" +
            "            color: #475569;\n" +
            "            background-color: #f8fafc;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            padding: 10px 16px;\n" +
            "            border-radius: 8px;\n" +
            "            font-size: 13px;\n" +
            "            font-weight: 500;\n" +
            "            transition: all 0.2s ease;\n" +
            "            max-width: 45%;\n" +
            "        }\n" +
            "        .nav-button:hover {\n" +
            "            background-color: #f1f5f9;\n" +
            "            border-color: #cbd5e1;\n" +
            "            color: #1e293b;\n" +
            "        }\n" +
            "        .nav-button .arrow {\n" +
            "            font-weight: bold;\n" +
            "            color: #6366f1;\n" +
            "            font-size: 1.1em;\n" +
            "            transition: color 0.2s;\n" +
            "        }\n" +
            "        .nav-button .nav-title {\n" +
            "            white-space: nowrap;\n" +
            "            overflow: hidden;\n" +
            "            text-overflow: ellipsis;\n" +
            "        }\n" +
            "        .nav-placeholder {\n" +
            "            width: 100px;\n" +
            "        }\n" +
            "        \n" +
            "        /* 화면 조절 위젯 CSS 정의 */\n" +
            "        .user-settings-wrapper {\n" +
            "            position: absolute;\n" +
            "            top: 25px;\n" +
            "            right: 40px;\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            gap: 8px;\n" +
            "            user-select: none;\n" +
            "            z-index: 100;\n" +
            "            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n" +
            "        }\n" +
            "        .settings-toggle-btn {\n" +
            "            background: #ffffff;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            border-radius: 6px;\n" +
            "            padding: 6px;\n" +
            "            cursor: pointer;\n" +
            "            color: #94a3b8;\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            justify-content: center;\n" +
            "            transition: all 0.2s;\n" +
            "            height: 32px;\n" +
            "            width: 32px;\n" +
            "            box-sizing: border-box;\n" +
            "        }\n" +
            "        .settings-toggle-btn:hover {\n" +
            "            background-color: #f1f5f9;\n" +
            "            color: #475569;\n" +
            "        }\n" +
            "        .settings-toggle-btn.active {\n" +
            "            background-color: #e0e7ff;\n" +
            "            color: #4f46e5;\n" +
            "            border-color: #c7d2fe;\n" +
            "            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);\n" +
            "        }\n" +
            "        .settings-panel {\n" +
            "            display: none;\n" +
            "            align-items: center;\n" +
            "            gap: 8px;\n" +
            "        }\n" +
            "        .settings-panel.open {\n" +
            "            display: flex;\n" +
            "        }\n" +
            "        .setting-group {\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            border-radius: 6px;\n" +
            "            background-color: #f8fafc;\n" +
            "            height: 32px;\n" +
            "            padding: 0 6px;\n" +
            "            gap: 4px;\n" +
            "            box-sizing: border-box;\n" +
            "            transition: all 0.2s;\n" +
            "        }\n" +
            "        .font-btn {\n" +
            "            background: none;\n" +
            "            border: none;\n" +
            "            padding: 2px 6px;\n" +
            "            cursor: pointer;\n" +
            "            color: #64748b;\n" +
            "            font-weight: 800;\n" +
            "            font-size: 14px;\n" +
            "            border-radius: 4px;\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            justify-content: center;\n" +
            "            transition: background-color 0.2s, color 0.2s;\n" +
            "        }\n" +
            "        .font-btn:hover {\n" +
            "            background-color: #e2e8f0;\n" +
            "            color: #1e293b;\n" +
            "        }\n" +
            "        .font-btn:disabled {\n" +
            "            opacity: 0.3;\n" +
            "            cursor: not-allowed;\n" +
            "        }\n" +
            "        .font-indicator {\n" +
            "            font-size: 10px;\n" +
            "            font-weight: 600;\n" +
            "            color: #94a3b8;\n" +
            "            font-family: monospace;\n" +
            "            min-width: 24px;\n" +
            "            text-align: center;\n" +
            "            text-transform: uppercase;\n" +
            "            transition: color 0.2s;\n" +
            "        }\n" +
            "        .width-toggle-btn {\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            height: 32px;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            border-radius: 6px;\n" +
            "            background-color: #f8fafc;\n" +
            "            padding: 0 10px;\n" +
            "            gap: 6px;\n" +
            "            cursor: pointer;\n" +
            "            font-size: 11px;\n" +
            "            font-weight: 600;\n" +
            "            color: #475569;\n" +
            "            transition: background-color 0.2s, border-color 0.2s, color 0.2s;\n" +
            "            box-sizing: border-box;\n" +
            "        }\n" +
            "        .width-toggle-btn:hover {\n" +
            "            background-color: #f1f5f9;\n" +
            "        }\n" +
            "        .theme-switch-wrapper {\n" +
            "            display: flex;\n" +
            "            align-items: center;\n" +
            "            height: 32px;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            border-radius: 6px;\n" +
            "            background-color: #f8fafc;\n" +
            "            padding: 0 8px;\n" +
            "            gap: 6px;\n" +
            "            box-sizing: border-box;\n" +
            "            transition: all 0.2s;\n" +
            "        }\n" +
            "        .theme-switch-slider-container {\n" +
            "            display: inline-flex;\n" +
            "            align-items: center;\n" +
            "            width: 32px;\n" +
            "            height: 18px;\n" +
            "            background-color: #cbd5e1;\n" +
            "            border-radius: 9px;\n" +
            "            position: relative;\n" +
            "            border: 1px solid #cbd5e1;\n" +
            "            cursor: pointer;\n" +
            "            transition: background-color 0.2s, border-color 0.2s;\n" +
            "            padding: 0;\n" +
            "            outline: none;\n" +
            "        }\n" +
            "        .theme-switch-slider-knob {\n" +
            "            display: inline-block;\n" +
            "            width: 14px;\n" +
            "            height: 14px;\n" +
            "            background-color: white;\n" +
            "            border-radius: 50%;\n" +
            "            position: absolute;\n" +
            "            top: 1px;\n" +
            "            left: 1px;\n" +
            "            transition: transform 0.2s;\n" +
            "            box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);\n" +
            "        }\n" +
            "        \n" +
            "        /* Dynamic settings selectors */\n" +
            "        .container.font-sm { font-size: 14px; }\n" +
            "        .container.font-sm h1 { font-size: 20px; }\n" +
            "        .container.font-sm h2 { font-size: 18px; }\n" +
            "        .container.font-sm h3 { font-size: 16px; }\n" +
            "        .container.font-sm p, .container.font-sm li, .container.font-sm td, .container.font-sm th { font-size: 12px; }\n" +
            "        .container.font-sm blockquote { font-size: 12px; }\n" +
            "        .container.font-sm pre code { font-size: 11px; }\n" +
            "        \n" +
            "        .container.font-base { font-size: 16px; }\n" +
            "        .container.font-base h1 { font-size: 24px; }\n" +
            "        .container.font-base h2 { font-size: 20px; }\n" +
            "        .container.font-base h3 { font-size: 18px; }\n" +
            "        .container.font-base p, .container.font-base li, .container.font-base td, .container.font-base th { font-size: 14px; }\n" +
            "        .container.font-base blockquote { font-size: 13px; }\n" +
            "        .container.font-base pre code { font-size: 13px; }\n" +
            "        \n" +
            "        .container.font-lg { font-size: 18px; }\n" +
            "        .container.font-lg h1 { font-size: 28px; }\n" +
            "        .container.font-lg h2 { font-size: 24px; }\n" +
            "        .container.font-lg h3 { font-size: 20px; }\n" +
            "        .container.font-lg p, .container.font-lg li, .container.font-lg td, .container.font-lg th { font-size: 16px; }\n" +
            "        .container.font-lg blockquote { font-size: 15px; }\n" +
            "        .container.font-lg pre code { font-size: 14px; }\n" +
            "        \n" +
            "        .container.font-xl { font-size: 20px; }\n" +
            "        .container.font-xl h1 { font-size: 32px; }\n" +
            "        .container.font-xl h2 { font-size: 28px; }\n" +
            "        .container.font-xl h3 { font-size: 24px; }\n" +
            "        .container.font-xl p, .container.font-xl li, .container.font-xl td, .container.font-xl th { font-size: 18px; }\n" +
            "        .container.font-xl blockquote { font-size: 17px; }\n" +
            "        .container.font-xl pre code { font-size: 15px; }\n" +
            "        \n" +
            "        .container.width-normal { max-width: 900px; }\n" +
            "        .container.width-wide { max-width: 1280px; }\n" +
            "        .container.width-full { max-width: 95%; }\n" +
            "        \n" +
            "        /* Dark Mode Styles */\n" +
            "        .dark-mode body {\n" +
            "            background-color: #0f172a;\n" +
            "            color: #cbd5e1;\n" +
            "        }\n" +
            "        .dark-mode .container {\n" +
            "            background-color: #1e293b;\n" +
            "            border-color: #334155;\n" +
            "            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.2);\n" +
            "        }\n" +
            "        .dark-mode h1, .dark-mode h2, .dark-mode h3 {\n" +
            "            color: #f1f5f9;\n" +
            "        }\n" +
            "        .dark-mode h1 {\n" +
            "            border-bottom-color: #334155;\n" +
            "        }\n" +
            "        .dark-mode p, .dark-mode li {\n" +
            "            color: #94a3b8;\n" +
            "        }\n" +
            "        .dark-mode a {\n" +
            "            color: #818cf8;\n" +
            "        }\n" +
            "        .dark-mode a:hover {\n" +
            "            color: #a5b4fc;\n" +
            "        }\n" +
            "        .dark-mode code {\n" +
            "            background-color: #0f172a;\n" +
            "            border-color: #334155;\n" +
            "            color: #f43f5e;\n" +
            "        }\n" +
            "            \"        .dark-mode kbd {\\n\" +\n" +
            "            \"            color: #e2e8f0;\\n\" +\n" +
            "            \"            background: #1e293b;\\n\" +\n" +
            "            \"            border-color: #334155;\\n\" +\n" +
            "            \"            box-shadow: inset 0 -2px 0 #334155;\\n\" +\n" +
            "            \"        }\\n\" +\n" +
            "        .dark-mode pre {\n" +
            "            background-color: #0f172a;\n" +
            "            border-color: #334155;\n" +
            "            color: #e2e8f0;\n" +
            "        }\n" +
            "        .dark-mode blockquote {\n" +
            "            background-color: rgba(30, 41, 59, 0.4);\n" +
            "            border-left-color: #3b5266;\n" +
            "            color: #cbd5e1;\n" +
            "        }\n" +
            "        .dark-mode table {\n" +
            "            border-color: #334155;\n" +
            "        }\n" +
            "        .dark-mode th {\n" +
            "            background-color: #0f172a;\n" +
            "            color: #f1f5f9;\n" +
            "            border-bottom-color: #334155;\n" +
            "        }\n" +
            "        .dark-mode td {\n" +
            "            color: #cbd5e1;\n" +
            "            border-bottom-color: #334155;\n" +
            "        }\n" +
            "        .dark-mode .breadcrumbs {\n" +
            "            border-bottom-color: #334155;\n" +
            "            color: #94a3b8;\n" +
            "        }\n" +
            "        .dark-mode .breadcrumbs a {\n" +
            "            color: #818cf8;\n" +
            "        }\n" +
            "        .dark-mode .breadcrumbs .folder-name {\n" +
            "            color: #cbd5e1;\n" +
            "        }\n" +
            "        .dark-mode .navigation-footer {\n" +
            "            border-top-color: #334155;\n" +
            "        }\n" +
            "        .dark-mode .nav-button {\n" +
            "            background-color: #0f172a;\n" +
            "            border-color: #334155;\n" +
            "            color: #94a3b8;\n" +
            "        }\n" +
            "        .dark-mode .nav-button:hover {\n" +
            "            background-color: #1e293b;\n" +
            "            border-color: #475569;\n" +
            "            color: #cbd5e1;\n" +
            "        }\n" +
            "        .dark-mode .nav-button .arrow {\n" +
            "            color: #818cf8;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .settings-toggle-btn {\n" +
            "            background: #1e293b;\n" +
            "            border-color: #334155;\n" +
            "            color: #64748b;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .settings-toggle-btn:hover {\n" +
            "            background-color: #334155;\n" +
            "            color: #cbd5e1;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .settings-toggle-btn.active {\n" +
            "            background-color: #312e81;\n" +
            "            border-color: #4338ca;\n" +
            "            color: #818cf8;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .setting-group,\n" +
            "        .dark-mode .user-settings-wrapper .width-toggle-btn,\n" +
            "        .dark-mode .user-settings-wrapper .theme-switch-wrapper {\n" +
            "            background-color: #0f172a;\n" +
            "            border-color: #334155;\n" +
            "            color: #cbd5e1;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .font-btn {\n" +
            "            color: #94a3b8;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .font-btn:hover {\n" +
            "            background-color: #1e293b;\n" +
            "            color: #f1f5f9;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .width-toggle-btn {\n" +
            "            color: #cbd5e1;\n" +
            "        }\n" +
            "        .dark-mode .user-settings-wrapper .width-toggle-btn:hover {\n" +
            "            background-color: #1e293b;\n" +
            "        }\n" +
            "        .dark-mode .theme-switch-slider-knob {\n" +
            "            background-color: #cbd5e1;\n" +
            "        }\n" +
            "        \n" +
            "        /* Task List Styles */\n" +
            "        .task-list-item {\n" +
            "            list-style-type: none !important;\n" +
            "        }\n" +
            "        .task-list-item-checkbox {\n" +
            "            margin-right: 6px;\n" +
            "            vertical-align: middle;\n" +
            "        }\n" +
            TOC_CSS +
            "    </style>\n" +
            targetBlankScript +
            settingsScript +
            TOC_SCRIPT +
            "</head>\n" +
            "<body>\n" +
            "    <div class=\"container\">\n" +
            "        <div class=\"user-settings-wrapper\">\n" +
            "            <button class=\"settings-toggle-btn\" id=\"settingsToggleBtn\" title=\"화면 설정 조절\">\n" +
            "                <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 17v4\"/><path d=\"m15.2 4.9-.9-.4\"/><path d=\"m15.2 7.1-.9.4\"/><path d=\"m16.9 3.2-.4-.9\"/><path d=\"m16.9 8.8-.4.9\"/><path d=\"m19.5 2.3-.4.9\"/><path d=\"m19.5 9.7-.4-.9\"/><path d=\"m21.7 4.5-.9.4\"/><path d=\"m21.7 7.5-.9-.4\"/><path d=\"M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7\"/><path d=\"M8 21h8\"/><circle cx=\"18\" cy=\"6\" r=\"3\"/></svg>\n" +
            "            </button>\n" +
            "            <div class=\"settings-panel\" id=\"settingsPanel\">\n" +
            "                <div class=\"setting-group\">\n" +
            "                    <button class=\"font-btn\" id=\"fontDecBtn\" title=\"글자 크기 축소\">\n" +
            "                        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 13h6\"/><path d=\"m2 16 4.5-9 4.5 9\"/><path d=\"M18 7v9\"/><path d=\"m15 13 3 3 3-3\"/></svg>\n" +
            "                    </button>\n" +
            "                    <span class=\"font-indicator\" id=\"fontIndicator\">BASE</span>\n" +
            "                    <button class=\"font-btn\" id=\"fontIncBtn\" title=\"글자 크기 확대\">\n" +
            "                        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 13h6\"/><path d=\"m2 16 4.5-9 4.5 9\"/><path d=\"M18 16V7\"/><path d=\"m15 10 3-3 3 3\"/></svg>\n" +
            "                    </button>\n" +
            "                </div>\n" +
            "                <button class=\"width-toggle-btn\" id=\"widthToggleBtn\" title=\"본문 가로 너비 전환\">\n" +
            "                    <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"15 3 21 3 21 9\"/><polyline points=\"9 21 3 21 3 15\"/><line x1=\"21\" y1=\"3\" x2=\"14\" y2=\"10\"/><line x1=\"3\" y1=\"21\" x2=\"10\" y2=\"14\"/></svg>\n" +
            "                    <span id=\"widthText\">폭: 보통</span>\n" +
            "                </button>\n" +
            "                <div class=\"theme-switch-wrapper\">\n" +
            "                    <svg id=\"sunIcon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/></svg>\n" +
            "                    <button type=\"button\" class=\"theme-switch-slider-container\" id=\"themeSwitchContainer\" title=\"테마 토글 스위치\">\n" +
            "                        <span class=\"theme-switch-slider-knob\" id=\"themeSwitchKnob\"></span>\n" +
            "                    </button>\n" +
            "                    <svg id=\"moonIcon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#94a3b8\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/></svg>\n" +
            "                </div>\n" +
            "            </div>\n" +
            "        </div>\n" +
            "        " + breadcrumbsHtml.toString() + "\n" +
            "        " + parsedBody + "\n" +
            "        " + footerHtml.toString() + "\n" +
            "    </div>\n" +
            "</body>\n" +
            "</html>";

        return ResponseEntity.ok(fullHtml);
    }

    private java.util.List<Page> getAllOrderedPublishedPages() {
        java.util.List<Folder> roots = folderRepository.findByParentIsNullOrderBySortOrderAsc();
        java.util.List<Page> orderedPages = new java.util.ArrayList<>();
        for (Folder root : roots) {
            collectPagesRecursively(root, orderedPages);
        }
        return orderedPages;
    }

    private void collectPagesRecursively(Folder folder, java.util.List<Page> orderedPages) {
        java.util.List<Page> pages = pageRepository.findByFolderIdOrderBySortOrderAsc(folder.getId());
        for (Page p : pages) {
            if ("PUBLISHED".equals(p.getStatus())) {
                orderedPages.add(p);
            }
        }
        java.util.List<Folder> children = folderRepository.findByParentIdOrderBySortOrderAsc(folder.getId());
        for (Folder child : children) {
            collectPagesRecursively(child, orderedPages);
        }
    }

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

    @GetMapping(value = "/help/colors", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> getColorsPage() {
        try (java.io.InputStream is = getClass().getResourceAsStream("/help/colors.html")) {
            if (is == null) {
                return ResponseEntity.status(404).body("색상 찾기 페이지가 존재하지 않습니다.");
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

    @GetMapping(value = "/help/all.js", produces = "application/javascript;charset=UTF-8")
    public ResponseEntity<byte[]> getFontAwesomeJs() {
        try (java.io.InputStream is = getClass().getResourceAsStream("/help/all.js");
             java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream()) {
            if (is == null) {
                return ResponseEntity.status(404).body("// FontAwesome 파일이 존재하지 않습니다.".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            byte[] buffer = new byte[4096];
            int len;
            while ((len = is.read(buffer)) != -1) {
                bos.write(buffer, 0, len);
            }
            return ResponseEntity.ok(bos.toByteArray());
        } catch (java.io.IOException e) {
            return ResponseEntity.status(500).body("// 오류가 발생했습니다.".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
    }

    @GetMapping(value = "/help", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> getHelpPage(javax.servlet.http.HttpServletRequest request) {
        try (java.io.InputStream is = getClass().getResourceAsStream("/help/doc-user-help.html")) {
            if (is == null) {
                return ResponseEntity.status(404).body(
                    "<html><body style='font-family:sans-serif; text-align:center; padding:100px; color:#64748b;'>" +
                    "<h2>⚠️ 도움말 파일(doc-user-help.html)을 찾을 수 없습니다.</h2>" +
                    "</body></html>"
                );
            }
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int len;
            while ((len = is.read(buffer)) != -1) {
                bos.write(buffer, 0, len);
            }
            String html = bos.toString("UTF-8");
            
            // Dynamic version replacement
            html = html.replace("[version]", appVersion);
            
            // Dynamic contextPath replacement
            String contextPath = request.getContextPath();
            html = html.replace("[contextPath]", contextPath);
            
            return ResponseEntity.ok(html);
        } catch (java.io.IOException e) {
            return ResponseEntity.status(500).body("도움말 로드 중 오류가 발생했습니다.");
        }
    }

    @GetMapping(value = "/help/image/{filename}", produces = {MediaType.IMAGE_PNG_VALUE, MediaType.IMAGE_JPEG_VALUE})
    public ResponseEntity<byte[]> getHelpImage(@PathVariable("filename") String filename) {
        try (java.io.InputStream is = getClass().getResourceAsStream("/help/" + filename)) {
            if (is == null) {
                return ResponseEntity.notFound().build();
            }
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int len;
            while ((len = is.read(buffer)) != -1) {
                bos.write(buffer, 0, len);
            }
            return ResponseEntity.ok()
                    .contentType(filename.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG)
                    .body(bos.toByteArray());
        } catch (java.io.IOException e) {
            return ResponseEntity.status(500).build();
        }
    }

    private String parseMarkdownToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "<p style='color:#888; font-style:italic;'>내용이 비어있습니다.</p>";
        }



        // 백틱 확장 정규식 전처리 주입
        markdown = preprocessBackticks(markdown);

        MutableDataSet options = new MutableDataSet();
        options.set(Parser.EXTENSIONS, java.util.Arrays.asList(
            TablesExtension.create(),
            StrikethroughExtension.create(),
            TaskListExtension.create()
        ));
        options.set(HtmlRenderer.SOFT_BREAK, "<br />\n");

        Parser parser = Parser.builder(options).build();
        HtmlRenderer renderer = HtmlRenderer.builder(options).build();

        com.vladsch.flexmark.util.ast.Node document = parser.parse(markdown);
        return renderer.render(document);
    }

    // --- 백틱 파싱 확장 관련 자바 구현 ---
    private static class ButtonDef {
        String color;
        String icon;
        ButtonDef(String color, String icon) {
            this.color = color;
            this.icon = icon;
        }
    }

    private static final java.util.Map<String, ButtonDef> PREDEFINED_BUTTONS = new java.util.HashMap<>();
    static {
        addButtonGroup("456EA6", "fas fa-search", "조회", "검색", "찾기", "변경 및 상세보기", "기간조회", "내역상세", "지출결의서 선택", "미흡/개선 조치계획", "발생 점검항목 보기", "문서보기");
        addButtonGroup("456EA6", "fas fa-plus", "일회성조건", "반복주기조건", "행 추가", "전체선택", "분류추가", "C/F가져오기", "차변 행추가", "대변 행추가", "직원추가", "부서추가", "계좌추가", "연관법규 추가", "연관내규 추가");
        addButtonGroup("456EA6", "fas fa-user-times", "없음");
        addButtonGroup("456EA6", "fas fa-envelope", "개별전송", "전체전송", "메일발송", "발송", "일괄 알림발송", "반려건 일괄 알림발송", "마감문자발송", "알림발송");
        addButtonGroup("456EA6", "fas fa-calculator", "계산하기");
        
        addButtonGroup("17A2B8", "fas fa-check", "저장", "반영", "전체적용", "내역확정", "선택내역확정", "전체내역확정", "마감", "전표발생", "회계마감", "승인", "일괄저장", "처리", "확정", "사용여부 일괄설정", "문서분류지정", "통제그룹담당자 지정", "일괄 권한설정", "결산처리", "자동연장", "지급확인", "확인", "ICAM발생내역 가져오기", "환율적용", "평가처리", "배포처리", "관심종목 등록", "항목별 계정연결", "출력정보 및 사용여부 설정", "고객사반영", "Admin(관리자)정보로 고객사 변경", "상장주식 평가처리", "제출", "관리그룹 일괄지정", "주계좌 설정", "복리후생비 설정", "게시물 항목 설정", "계정과목연결", "알림설정", "책무유형 관리", "잠금", "담당자 일괄변경", "부서일괄지정", "관리의무생성", "작성완료", "점검자일괄지정", "점검마감", "점검시작", "직책해제일 설정", "일괄승인", "승인시작", "점검완료", "조치완료");
        addButtonGroup("17A2B8", "far fa-plus-square", "펼치기", "활성화");
        addButtonGroup("17A2B8", "far fa-minus-square", "감추기", "비활성화");
        addButtonGroup("17A2B8", "fas fa-bookmark", "북마크");
        addButtonGroup("17A2B8", "fas fa-plus", "+");
        addButtonGroup("17A2B8", "fas fa-minus", "-");
        
        addButtonGroup("DD5E5E", "fas fa-trash", "삭제", "전체삭제", "연결제거", "전표삭제", "문서폐기 신청", "관심종목 제거", "지출결의제거", "소모품 폐기/취소", "제거");
        addButtonGroup("DD5E5E", "fas fa-minus", "행 삭제", "전체해제", "차단해제", "알림해제");
        addButtonGroup("DD5E5E", "fas fa-ban", "취소", "마감취소", "확정취소", "결산취소", "승인취소", "지급취소", "확인취소", "반려", "평가취소", "전체취소", "제출취소", "차단", "신청취소", "요청취소", "반려취소", "개별로그아웃", "전체로그아웃", "잠금해제", "작성취소", "점검시작취소", "승인시작취소", "일괄승인취소", "완료취소");
        addButtonGroup("DD5E5E", "fas fa-exchange-alt", "문서이동(내부통제)");
        
        addButtonGroup("E89646", "fas fa-upload", "파일업로드", "엑셀업로드", "로고등록");
        addButtonGroup("E89646", "fas fa-download", "다운로드", "템플릿", "엑셀다운로드", "엑셀다운로드(금감원양식)", "보고주기 변경 및 서약서 서명", "DOWN", "출력/다운로드", "공모주 달력", "전체출력/다운로드", "개별출력/다운로드", "파일 일괄 다운로드", "츨력/다운로드", "가져오기", "임원 선임/해임 보고");
        addButtonGroup("E89646", "fas fa-eye", "오타수정", "기록보기", "계정원장 정리", "보유원장 정리", "은행이체명세서", "급여출금계좌", "임금계산방법", "사용여부설정", "예금잔고정리", "전표확인", "마감검증", "보수입금계좌", "첨부파일관리", "비고작성", "근로시간", "4대보험 연말정산 납부상세", "소득세 재계산", "근로소득공제표", "인적공제금액", "산출세액표", "산출기준", "투자한도/StopLoss 설정", "작성요령", "요청이력", "전체참조등록", "알람설정", "구분추가", "새로작성", "펀드보유종목 확인");
        addButtonGroup("E89646", "fas fa-arrow-right", "상대처 관리 바로가기", "거래처 관리 바로가기", "DART 바로가기", "전산장비관리 바로가기", "증명서 발급 바로가기");
        addButtonGroup("E89646", "fas fa-users", "그룹", "그룹설정", "작성자그룹 관리", "담당그룹 관리", "종목유형설정", "운용사코드 등록");
        addButtonGroup("E89646", "fas fa-check", "작성자그룹 일괄지정", "담당그룹 일괄지정", "담당그룹 지정", "예상목록", "진행단계 기본설정", "직원 자동등록 설정", "엑셀업로드 설정", "커스텀 설정", "담당자 변경", "업무구분 설정", "기타고객사 추가", "매수제한종목");
        addButtonGroup("E89646", "fas fa-ban", "계좌폐쇄", "폐쇄취소", "미체결", "미체결취소");
        
        addButtonGroup("646362", "fas fa-print", "프린트");
        addButtonGroup("646362", "fas fa-folder-plus", "첨부파일등록");
        addButtonGroup("646362", "fas fa-users", "조직도보기", "특정직위 및 알림설정", "담당자 관리", "초기설정 휴가일수");
        
        addButtonGroup("6AB6CF", "fas fa-undo-alt", "초기화", "재생성", "새로고침", "복구", "4대보험 정산 재생성", "조건 초기화");
        addButtonGroup("6AB6CF", "fas fa-exchange-alt", "변경", "상위조직변경", "매뉴권한복사(초기)", "문서개요복사", "문서분류복사", "계정과목복사", "점검내역복사", "매뉴권한복사", "권한그룹복사", "문서분류지정복사", "양식복사", "권한복사", "코드복사", "평가자 변경(선택)", "일괄복사");
        
        addButtonGroup("2EAC7E", "fas fa-edit", "등록", "등록(복사)", "등록(수요예측)", "항목추가", "현금흐름표", "거래유형추가", "계약서 양식작성", "증명서 양식작성", "게시물 작성", "신청서 양식작성", "불러오기", "잔고입력(대사용)", "거래처추가", "영업거래처추가", "결제등록", "화면별 거래유형 등록", "분류관리", "ICAM 월말잔액 대사", "잔액대사", "파일일괄등록", "시세입력", "환율입력", "신청구분별 내용관리", "홈페이지 등록", "루트매뉴 등록", "하위매뉴 등록", "휴일관리", "특별휴가 추가", "직전 보고내용 가져오기", "반복등록", "설정", "경조구분별 문구등록", "지출결의등록", "최초원장 등록", "주식등록", "요청하기", "전표생성", "비품등록", "일괄 결제등록", "바로등록", "양식관리", "활동처 추가", "추가", "인사정보 가져오기", "최근잔고 가져오기", "승인선", "조치계획등록", "부서책무담당자 관리", "결재요청", "일괄등록", "정기보고서 작성", "승인신청", "신규등록", "업무등록", "상위등록", "하위등록", "하위조직등록", "신규문서 작성", "전체층등록", "회계발생", "상신", "통합상신", "상위분류 등록", "하위분류 등록", "임원동의서 상신", "대장분류설정", "점검항목생성", "AI");
        addButtonGroup("2EAC7E", "fas fa-bullseye", "생성", "PDF 생성", "일괄생성", "건별생성", "자료일괄생성", "계약사별자료생성");
        addButtonGroup("2EAC7E", "fas fa-arrow-alt-circle-left", "선택");
        
        addButtonGroup("343A40", "fas fa-cog", "기본설정");
    }

    private static void addButtonGroup(String color, String icon, String... texts) {
        for (String text : texts) {
            PREDEFINED_BUTTONS.put(text, new ButtonDef(color, icon));
        }
    }

    private static final java.util.regex.Pattern BACKTICK_PATTERN = java.util.regex.Pattern.compile("`([^`]+)`");

    private String preprocessBackticks(String markdown) {
        if (markdown == null) {
            return null;
        }
        String[] parts = markdown.split("```", -1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                sb.append("```");
            }
            if (i % 2 == 0) {
                sb.append(replaceBacktickTokens(parts[i]));
            } else {
                sb.append(parts[i]);
            }
        }
        return sb.toString();
    }

    private String replaceBacktickTokens(String text) {
        java.util.regex.Matcher matcher = BACKTICK_PATTERN.matcher(text);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String content = matcher.group(1).trim();
            String replacement = renderButtonHtml(content);
            matcher.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String renderButtonHtml(String content) {
        if (content == null) {
            return "";
        }
        if (!content.contains(":")) {
            ButtonDef def = PREDEFINED_BUTTONS.get(content);
            if (def != null) {
                return buildButtonElement(def.color, def.icon, content);
            } else {
                return buildDefaultKbdElement(content);
            }
        }
        String[] parts = content.split(":", -1);
        if (parts.length >= 3) {
            String color = parts[0].trim();
            String icon = parts[1].trim();
            StringBuilder textBuilder = new StringBuilder();
            for (int i = 2; i < parts.length; i++) {
                if (i > 2) {
                    textBuilder.append(":");
                }
                textBuilder.append(parts[i]);
            }
            String buttonText = textBuilder.toString().trim();
            return buildButtonElement(color, icon, buttonText);
        } else {
            return buildDefaultKbdElement(content);
        }
    }

    private String buildDefaultKbdElement(String text) {
        return "<code>" + escapeHtml(text) + "</code>";
    }


    private String buildButtonElement(String color, String icon, String text) {
        String bg = color;
        if (bg.isEmpty()) {
            bg = "4D4D4D";
        } else if (bg.matches("^[0-9A-Fa-f]{3}$") || bg.matches("^[0-9A-Fa-f]{6}$")) {
            bg = "#" + bg;
        }
        String border = darkenColorJava(bg, 10);
        String textColor = "#ffffff";
        if (isLightColorJava(bg)) {
            textColor = "#000000";
        }
        String style = "background-color: " + bg + "; border-color: " + border + "; color: " + textColor + ";";
        if (text.isEmpty()) {
            style += " padding: 3px 5px;";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("<kbd class=\"asset-kbd-btn\" style=\"").append(style).append("\">");
        if (!icon.isEmpty()) {
            String iconClass = icon;
            if (!iconClass.contains("fa-") && !iconClass.startsWith("fa ")) {
                iconClass = "fas fa-" + iconClass;
            }
            sb.append("<i class=\"").append(iconClass).append(" kbd-fa-icon\" aria-hidden=\"true\"></i>");
            if (!text.isEmpty()) {
                sb.append("&nbsp;");
            }
        }
        if (!text.isEmpty()) {
            sb.append("<span class=\"kbd-text\">").append(escapeHtml(text)).append("</span>");
        }
        sb.append("</kbd>");
        return sb.toString();
    }

    private boolean isLightColorJava(String color) {
        if (color == null || !color.startsWith("#")) {
            return false;
        }
        try {
            String hex = color.substring(1);
            if (hex.length() == 3) {
                hex = "" + hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
            }
            if (hex.length() == 6) {
                int r = Integer.parseInt(hex.substring(0, 2), 16);
                int g = Integer.parseInt(hex.substring(2, 4), 16);
                int b = Integer.parseInt(hex.substring(4, 6), 16);
                double brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                return brightness > 186;
            }
        } catch (Exception e) { }
        return false;
    }

    private String darkenColorJava(String color, int amt) {
        if (color == null || !color.startsWith("#")) {
            return color;
        }
        try {
            String hex = color.substring(1);
            if (hex.length() == 3) {
                hex = "" + hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
            }
            if (hex.length() == 6) {
                int r = Integer.parseInt(hex.substring(0, 2), 16);
                int g = Integer.parseInt(hex.substring(2, 4), 16);
                int b = Integer.parseInt(hex.substring(4, 6), 16);
                r = Math.max(0, r - amt);
                g = Math.max(0, g - amt);
                b = Math.max(0, b - amt);
                return String.format("#%02x%02x%02x", r, g, b);
            }
        } catch (Exception e) { }
        return color;
    }

    private String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#x27;");
    }
}
