package kr.co.kfs.aman.controller;

import kr.co.kfs.aman.model.Page;
import kr.co.kfs.aman.repository.PageRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/manual")
public class ManualController {

    private final PageRepository pageRepository;

    public ManualController(PageRepository pageRepository) {
        this.pageRepository = pageRepository;
    }

    @GetMapping(value = "/{aka}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> getManualByAka(@PathVariable("aka") String aka) {
        Optional<Page> pageOpt = pageRepository.findByAka(aka);
        if (!pageOpt.isPresent()) {
            return ResponseEntity.status(404).body(
                "<html><body style='font-family:sans-serif; text-align:center; padding:100px; color:#64748b;'>" +
                "<h2>⚠️ 도움말 페이지를 찾을 수 없습니다.</h2>" +
                "<p>해당 코드(" + escapeHtml(aka) + ")에 등록된 메뉴얼이 존재하지 않습니다.</p>" +
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
        
        StringBuilder html = new StringBuilder();
        String[] lines = markdown.split("\n");
        int i = 0;
        
        while (i < lines.length) {
            String line = lines[i];
            String trimmed = line.trim();
            
            // 0. Code Blocks
            if (trimmed.startsWith("```")) {
                String lang = trimmed.substring(3).trim();
                StringBuilder code = new StringBuilder();
                i++;
                while (i < lines.length && !lines[i].trim().startsWith("```")) {
                    code.append(escapeHtml(lines[i])).append("\n");
                    i++;
                }
                if (i < lines.length) {
                    i++;
                }
                html.append("<pre style='background:#0f172a; color:#f8fafc; padding:16px; border-radius:8px; font-family:monospace; font-size:12px; overflow-x:auto; line-height:1.5; margin:16px 0;'><code class='language-")
                    .append(lang).append("'>")
                    .append(code.toString().trim())
                    .append("</code></pre>");
                continue;
            }
            
            // 1. Tables
            if (trimmed.startsWith("|")) {
                java.util.List<java.util.List<String>> rows = new java.util.ArrayList<>();
                while (i < lines.length && lines[i].trim().startsWith("|")) {
                    String rowLine = lines[i].trim();
                    String[] cellArr = rowLine.substring(1, rowLine.length() - (rowLine.endsWith("|") ? 1 : 0)).split("\\|");
                    java.util.List<String> cells = new java.util.ArrayList<>();
                    boolean isSeparator = true;
                    for (String c : cellArr) {
                        String cellTrimmed = c.trim();
                        cells.add(cellTrimmed);
                        if (isSeparator && !cellTrimmed.isEmpty()) {
                            for (char ch : cellTrimmed.toCharArray()) {
                                if (ch != '-' && ch != ' ' && ch != ':') {
                                    isSeparator = false;
                                    break;
                                }
                            }
                        }
                    }
                    if (!isSeparator && !cells.isEmpty()) {
                        rows.add(cells);
                    }
                    i++;
                }
                
                if (!rows.isEmpty()) {
                    html.append("<div style='overflow-x:auto; margin:16px 0; border:1px solid #e2e8f0; border-radius:8px;'>");
                    html.append("<table style='width:100%; border-collapse:collapse; text-align:left; font-size:13px;'>");
                    
                    java.util.List<String> header = rows.get(0);
                    html.append("<thead style='background:#f8fafc;'><tr>");
                    for (String cell : header) {
                        html.append("<th style='padding:10px 16px; font-weight:600; color:#1e293b; border-b:1px solid #e2e8f0;'>")
                            .append(parseInlineStyles(cell))
                            .append("</th>");
                    }
                    html.append("</tr></thead>");
                    
                    html.append("<tbody style='background:#ffffff;'>");
                    for (int rIdx = 1; rIdx < rows.size(); rIdx++) {
                        java.util.List<String> row = rows.get(rIdx);
                        html.append("<tr style='border-bottom:1px solid #f1f5f9;'>");
                        for (int cIdx = 0; cIdx < header.size(); cIdx++) {
                            String cellVal = cIdx < row.size() ? row.get(cIdx) : "";
                            html.append("<td style='padding:10px 16px; color:#475569;'>")
                                .append(parseInlineStyles(cellVal))
                                .append("</td>");
                        }
                        html.append("</tr>");
                    }
                    html.append("</tbody></table></div>");
                }
                continue;
            }
            
            // 2. Lists
            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                html.append("<ul style='margin:8px 0; padding-left:24px;'>");
                while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
                    String itemText = lines[i].trim().substring(2);
                    html.append("<li style='list-style-type:disc; color:#475569; font-size:14px; margin-bottom:4px;'>")
                        .append(parseInlineStyles(itemText))
                        .append("</li>");
                    i++;
                }
                html.append("</ul>");
                continue;
            }
            
            // 3. Headings
            if (trimmed.startsWith("# ")) {
                html.append("<h1 style='font-size:24px; font-weight:700; color:#0f172a; margin-top:24px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #e2e8f0;'>")
                    .append(parseInlineStyles(trimmed.substring(2)))
                    .append("</h1>");
            } else if (trimmed.startsWith("## ")) {
                html.append("<h2 style='font-size:20px; font-weight:700; color:#0f172a; margin-top:20px; margin-bottom:10px;'>")
                    .append(parseInlineStyles(trimmed.substring(3)))
                    .append("</h2>");
            } else if (trimmed.startsWith("### ")) {
                html.append("<h3 style='font-size:16px; font-weight:600; color:#1e293b; margin-top:16px; margin-bottom:8px;'>")
                    .append(parseInlineStyles(trimmed.substring(4)))
                    .append("</h3>");
            } else if (trimmed.startsWith("> ")) {
                html.append("<blockquote style='border-left:4px solid #6366f1; padding:6px 16px; margin:16px 0; background:#f8fafc; color:#475569; font-style:italic; border-radius: 0 4px 4px 0;'>")
                    .append(parseInlineStyles(trimmed.substring(2)))
                    .append("</blockquote>");
            } else if (trimmed.equals("---")) {
                html.append("<hr style='margin:24px 0; border:0; border-top:1px solid #e2e8f0;' />");
            } else if (!trimmed.isEmpty()) {
                html.append("<p style='font-size:14px; color:#475569; line-height:1.6; margin-bottom:12px;'>")
                    .append(parseInlineStyles(trimmed))
                    .append("</p>");
            }
            
            i++;
        }
        
        return html.toString();
    }

    private String parseInlineStyles(String text) {
        if (text == null) {
            return "";
        }
        String result = escapeHtml(text);
        result = result.replaceAll("\\*\\*(.*?)\\*\\*", "<strong style='font-weight:600; color:#0f172a;'>$1</strong>");
        result = result.replaceAll("!\\[(.*?)\\]\\((.*?)\\)", "<img src='$2' alt='$1' style='display:inline-block; max-width:100%; height:auto; border-radius:6px; border:1px solid #e2e8f0; vertical-align:middle; margin:4px 0;' />");
        result = result.replaceAll("\\[(.*?)\\]\\((.*?)\\)", "<a href='$2' target='_blank' rel='noopener noreferrer' style='color:#4f46e5; text-decoration:underline; font-weight:500;'>$1</a>");
        result = result.replaceAll("`(.*?)`", "<code style='background:#f1f5f9; color:#db2777; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid #e2e8f0;'>$1</code>");
        return result;
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
