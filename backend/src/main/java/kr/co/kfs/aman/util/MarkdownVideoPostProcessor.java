package kr.co.kfs.aman.util;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MarkdownVideoPostProcessor {

    private static final Pattern IMG_PATTERN = Pattern.compile("<img\\s+([^>]+)>", Pattern.CASE_INSENSITIVE);
    private static final Pattern SRC_PATTERN = Pattern.compile("src\\s*=\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern ALT_PATTERN = Pattern.compile("alt\\s*=\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);

    public static String process(String html) {
        if (html == null) {
            return null;
        }

        Matcher matcher = IMG_PATTERN.matcher(html);
        StringBuffer sb = new StringBuffer();

        while (matcher.find()) {
            String attrs = matcher.group(1);
            String src = null;
            String alt = "";

            Matcher srcMatcher = SRC_PATTERN.matcher(attrs);
            if (srcMatcher.find()) {
                src = srcMatcher.group(1);
            }

            Matcher altMatcher = ALT_PATTERN.matcher(attrs);
            if (altMatcher.find()) {
                alt = altMatcher.group(1);
            }

            if (src != null && isVideoFile(src)) {
                String id = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                if (alt.trim().isEmpty()) {
                    alt = "동영상 가이드";
                }
                
                String videoCardHtml = 
                    "<div class=\"manual-video-card\">\n" +
                    "    <div class=\"manual-video-header\">\n" +
                    "        <div class=\"manual-video-title\">\n" +
                    "            <i class=\"fas fa-video\"></i>\n" +
                    "            <span>" + escapeHtml(alt) + "</span>\n" +
                    "        </div>\n" +
                    "        <button id=\"manualVideoBtn_" + id + "\" class=\"manual-video-btn collapsed\" onclick=\"toggleManualVideo('" + id + "')\">\n" +
                    "            <i id=\"manualVideoBtnIcon_" + id + "\" class=\"fas fa-video\"></i>\n" +
                    "            <span id=\"manualVideoBtnText_" + id + "\">동영상 가이드 보기</span>\n" +
                    "        </button>\n" +
                    "    </div>\n" +
                    "    <div id=\"manualVideoBody_" + id + "\" class=\"manual-video-body is-hidden\">\n" +
                    "        <video id=\"manualVideoPlayer_" + id + "\" src=\"" + src + "\" controls></video>\n" +
                    "    </div>\n" +
                    "</div>";
                
                matcher.appendReplacement(sb, Matcher.quoteReplacement(videoCardHtml));
            } else {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matcher.group(0)));
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private static boolean isVideoFile(String url) {
        String lower = url.toLowerCase();
        return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg") ||
               lower.contains(".mp4?") || lower.contains(".webm?") || lower.contains(".ogg?");
    }

    private static String escapeHtml(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
}
