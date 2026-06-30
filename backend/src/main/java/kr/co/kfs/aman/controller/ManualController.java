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

import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import java.util.Collections;
import java.util.Optional;

@RestController
@RequestMapping("/manual")
public class ManualController {

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
        
        // 1. AKA_NUMS_FIRST가 true이고 folderId가 전송되었을 경우, 해당 폴더의 nums 값을 AKA로 우선 반환
        if (folderId != null && systemSettings.getBoolean("AKA_NUMS_FIRST", false)) {
            Optional<Folder> folderOpt = folderRepository.findById(folderId);
            if (folderOpt.isPresent() && folderOpt.get().getNums() != null && !folderOpt.get().getNums().trim().isEmpty()) {
                return ResponseEntity.ok(folderOpt.get().getNums().trim());
            }
        }

        // 2. 기본값: 4자리 고유 난수 번호 발급
        String candidate;
        int maxAttempts = 100;
        int attempts = 0;
        
        do {
            int num = java.util.concurrent.ThreadLocalRandom.current().nextInt(1000, 10000); // 1000 ~ 9999
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
        String targetBlankScript = isBlank ?
            "    <script>\n" +
            "        document.addEventListener('DOMContentLoaded', function() {\n" +
            "            var links = document.querySelectorAll('.container a, .navigation-footer a');\n" +
            "            for (var i = 0; i < links.length; i++) {\n" +
            "                // breadcrumbs와 footer의 자체 이동 링크는 새 창이 아닌 현재 창으로 가도록 제외\n" +
            "                if (links[i].closest('.breadcrumbs') || links[i].closest('.navigation-footer')) {\n" +
            "                    continue;\n" +
            "                }\n" +
            "                links[i].setAttribute('target', '_blank');\n" +
            "                links[i].setAttribute('rel', 'noopener noreferrer');\n" +
            "            }\n" +
            "        });\n" +
            "    </script>\n" : "";

        String fullHtml = 
            "<!DOCTYPE html>\n" +
            "<html lang=\"ko\">\n" +
            "<head>\n" +
            "    <meta charset=\"UTF-8\">\n" +
            "    <title>" + escapeHtml(title) + "</title>\n" +
            "    <style>\n" +
            "        body {\n" +
            "            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n" +
            "            padding: 30px;\n" +
            "            margin: 0;\n" +
            "            color: #334155;\n" +
            "            background-color: #f8fafc;\n" +
            "            line-height: 1.6;\n" +
            "        }\n" +
            "        .container {\n" +
            "            background-color: #ffffff;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "            padding: 40px;\n" +
            "            border-radius: 12px;\n" +
            "            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);\n" +
            "            max-width: 900px;\n" +
            "            margin: 20px auto;\n" +
            "        }\n" +
            "        code {\n" +
            "            background-color: #f1f5f9;\n" +
            "            color: #db2777;\n" +
            "            padding: 2px 6px;\n" +
            "            border-radius: 4px;\n" +
            "            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n" +
            "            font-size: 0.85em;\n" +
            "            border: 1px solid #e2e8f0;\n" +
            "        }\n" +
            "        pre {\n" +
            "            background-color: #0f172a;\n" +
            "            color: #f8fafc;\n" +
            "            padding: 16px;\n" +
            "            border-radius: 8px;\n" +
            "            overflow-x: auto;\n" +
            "            margin: 16px 0;\n" +
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
            "        }\n" +
            "        th, td {\n" +
            "            padding: 10px 16px;\n" +
            "            border-bottom: 1px solid #e2e8f0;\n" +
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
            "            border-left: 4px solid #6366f1;\n" +
            "            padding: 6px 16px;\n" +
            "            margin: 16px 0;\n" +
            "            background-color: #f8fafc;\n" +
            "            color: #475569;\n" +
            "            font-style: italic;\n" +
            "            border-radius: 0 4px 4px 0;\n" +
            "        }\n" +
            "        img {\n" +
            "            max-width: 100%;\n" +
            "            height: auto;\n" +
            "            display: block;\n" +
            "            margin: 16px auto;\n" +
            "            border-radius: 8px;\n" +
            "            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n" +
            "        }\n" +
            "        a {\n" +
            "            color: #4f46e5;\n" +
            "            text-decoration: none;\n" +
            "        }\n" +
            "        a:hover {\n" +
            "            text-decoration: underline;\n" +
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
            "        }\n" +
            "        .breadcrumbs a {\n" +
            "            color: #6366f1;\n" +
            "            text-decoration: none;\n" +
            "            font-weight: 500;\n" +
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
            "        }\n" +
            "        .navigation-footer {\n" +
            "            margin-top: 40px;\n" +
            "            padding-top: 24px;\n" +
            "            border-top: 1px solid #e2e8f0;\n" +
            "            display: flex;\n" +
            "            justify-content: space-between;\n" +
            "            align-items: center;\n" +
            "            gap: 16px;\n" +
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
            "        }\n" +
            "        .nav-button .nav-title {\n" +
            "            white-space: nowrap;\n" +
            "            overflow: hidden;\n" +
            "            text-overflow: ellipsis;\n" +
            "        }\n" +
            "        .nav-placeholder {\n" +
            "            width: 100px;\n" +
            "        }\n" +
            "    </style>\n" +
            targetBlankScript +
            "</head>\n" +
            "<body>\n" +
            "    <div class=\"container\">\n" +
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

    @GetMapping(value = "/help", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> getHelpPage() {
        try (java.io.InputStream is = getClass().getResourceAsStream("/help/doc-user-help.md")) {
            if (is == null) {
                return ResponseEntity.status(404).body(
                    "<html><body style='font-family:sans-serif; text-align:center; padding:100px; color:#64748b;'>" +
                    "<h2>⚠️ 도움말 파일을 찾을 수 없습니다.</h2>" +
                    "</body></html>"
                );
            }
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int len;
            while ((len = is.read(buffer)) != -1) {
                bos.write(buffer, 0, len);
            }
            String markdown = bos.toString("UTF-8");
            String parsedBody = parseMarkdownToHtml(markdown);
            // Rewrite local image references to go through our help image endpoint
            parsedBody = parsedBody.replaceAll("src=\"\\./", "src=\"/aman/manual/help/image/");

            boolean isBlank = systemSettings.getBoolean("LINK_BLANK", true);
            String targetBlankScript = isBlank ?
                "    <script>\n" +
                "        document.addEventListener('DOMContentLoaded', function() {\n" +
                "            var links = document.querySelectorAll('.container a');\n" +
                "            for (var i = 0; i < links.length; i++) {\n" +
                "                links[i].setAttribute('target', '_blank');\n" +
                "                links[i].setAttribute('rel', 'noopener noreferrer');\n" +
                "            }\n" +
                "        });\n" +
                "    </script>\n" : "";

            String fullHtml = 
                "<!DOCTYPE html>\n" +
                "<html lang=\"ko\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <title>A-Man 도움말</title>\n" +
                "    <style>\n" +
                "        body {\n" +
                "            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n" +
                "            padding: 30px;\n" +
                "            margin: 0;\n" +
                "            color: #334155;\n" +
                "            background-color: #f8fafc;\n" +
                "            line-height: 1.6;\n" +
                "        }\n" +
                "        .container {\n" +
                "            background-color: #ffffff;\n" +
                "            border: 1px solid #e2e8f0;\n" +
                "            padding: 40px;\n" +
                "            border-radius: 12px;\n" +
                "            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);\n" +
                "            max-width: 900px;\n" +
                "            margin: 20px auto;\n" +
                "        }\n" +
                "        code {\n" +
                "            background-color: #f1f5f9;\n" +
                "            color: #db2777;\n" +
                "            padding: 2px 6px;\n" +
                "            border-radius: 4px;\n" +
                "            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n" +
                "            font-size: 0.85em;\n" +
                "            border: 1px solid #e2e8f0;\n" +
                "        }\n" +
                "        pre {\n" +
                "            background-color: #0f172a;\n" +
                "            color: #f8fafc;\n" +
                "            padding: 16px;\n" +
                "            border-radius: 8px;\n" +
                "            overflow-x: auto;\n" +
                "            margin: 16px 0;\n" +
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
                "        }\n" +
                "        th, td {\n" +
                "            padding: 10px 16px;\n" +
                "            border-bottom: 1px solid #e2e8f0;\n" +
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
                "            border-left: 4px solid #6366f1;\n" +
                "            padding: 6px 16px;\n" +
                "            margin: 16px 0;\n" +
                "            background-color: #f8fafc;\n" +
                "            color: #475569;\n" +
                "            font-style: italic;\n" +
                "            border-radius: 0 4px 4px 0;\n" +
                "        }\n" +
                "        img {\n" +
                "            max-width: 100%;\n" +
                "            height: auto;\n" +
                "            display: block;\n" +
                "            margin: 16px auto;\n" +
                "            border-radius: 8px;\n" +
                "            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n" +
                "        }\n" +
                "        a {\n" +
                "            color: #4f46e5;\n" +
                "            text-decoration: none;\n" +
                "        }\n" +
                "        a:hover {\n" +
                "            text-decoration: underline;\n" +
                "        }\n" +
                "    </style>\n" +
                targetBlankScript +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"container\">\n" +
                "        " + parsedBody + "\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";

            return ResponseEntity.ok(fullHtml);
        } catch (Exception e) {
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
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    private String parseMarkdownToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "<p style='color:#888; font-style:italic;'>내용이 비어있습니다.</p>";
        }

        MutableDataSet options = new MutableDataSet();
        options.set(Parser.EXTENSIONS, Collections.singletonList(TablesExtension.create()));

        Parser parser = Parser.builder(options).build();
        HtmlRenderer renderer = HtmlRenderer.builder(options).build();

        com.vladsch.flexmark.util.ast.Node document = parser.parse(markdown);
        return renderer.render(document);
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
