package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
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

    public ManualController(PageRepository pageRepository) {
        this.pageRepository = pageRepository;
    }

    @GetMapping(value = "/new-aka", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<String> generateNewAka() {
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
            "    </style>\n" +
            "</head>\n" +
            "<body>\n" +
            "    <div class=\"container\">\n" +
            "        " + parsedBody + "\n" +
            "    </div>\n" +
            "</body>\n" +
            "</html>";

        return ResponseEntity.ok(fullHtml);
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
