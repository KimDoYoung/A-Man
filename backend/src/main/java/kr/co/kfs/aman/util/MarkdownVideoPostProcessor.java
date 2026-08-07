package kr.co.kfs.aman.util;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MarkdownVideoPostProcessor {

    private static final Pattern IMG_PATTERN = Pattern.compile("<img\\s+([^>]+)>", Pattern.CASE_INSENSITIVE);
    private static final Pattern SRC_PATTERN = Pattern.compile("src\\s*=\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern ALT_PATTERN = Pattern.compile("alt\\s*=\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
    
    // 생짜 마크다운 패턴 (![대체텍스트](주소)) - 공백포함 및 %20 매칭 대응
    private static final Pattern MD_IMG_PATTERN = Pattern.compile("!\\s*\\[([^\\]]*)\\]\\s*\\(([^\\)]+)\\)", Pattern.CASE_INSENSITIVE);

    public static String process(String html) {
        if (html == null) {
            return null;
        }

        // 1단계: 마크다운 파서가 파싱하지 못하고 HTML에 생짜 문자로 남은 ![alt](url) 패턴 비디오 치환
        Matcher mdMatcher = MD_IMG_PATTERN.matcher(html);
        StringBuffer mdSb = new StringBuffer();

        while (mdMatcher.find()) {
            String alt = mdMatcher.group(1);
            String src = mdMatcher.group(2).trim();

            if (isVideoFile(src)) {
                String id = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                if (alt.trim().isEmpty()) {
                    alt = "동영상";
                }
                
                String videoCardHtml = buildVideoCardHtml(id, alt, src);
                mdMatcher.appendReplacement(mdSb, Matcher.quoteReplacement(videoCardHtml));
            } else {
                mdMatcher.appendReplacement(mdSb, Matcher.quoteReplacement(mdMatcher.group(0)));
            }
        }
        mdMatcher.appendTail(mdSb);
        String step1Html = mdSb.toString();

        // 2단계: 마크다운 파서가 이미지 태그로 정상 변환한 <img src="url.mp4"> 패턴 비디오 치환
        Matcher matcher = IMG_PATTERN.matcher(step1Html);
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
                    alt = "동영상";
                }
                
                String videoCardHtml = buildVideoCardHtml(id, alt, src);
                matcher.appendReplacement(sb, Matcher.quoteReplacement(videoCardHtml));
            } else {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matcher.group(0)));
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private static String buildVideoCardHtml(String id, String alt, String src) {
        String ytId = getYouTubeVideoId(src);
        if (ytId != null) {
            // 유튜브 비디오 카드 렌더링 (iframe 사용)
            return "<div class=\"manual-video-card\">\n" +
                   "    <div class=\"manual-video-header\">\n" +
                   "        <div class=\"manual-video-title\">\n" +
                   "            <i class=\"fab fa-youtube\" style=\"color:#ff0000; font-size:1.1em;\"></i>\n" +
                   "            <span>" + escapeHtml(alt) + "</span>\n" +
                   "        </div>\n" +
                   "        <button id=\"manualVideoBtn_" + id + "\" class=\"manual-video-btn collapsed\" onclick=\"toggleManualVideo('" + id + "')\">\n" +
                   "            <i id=\"manualVideoBtnIcon_" + id + "\" class=\"fas fa-video\"></i>\n" +
                   "            <span id=\"manualVideoBtnText_" + id + "\">동영상 보기</span>\n" +
                   "        </button>\n" +
                   "    </div>\n" +
                   "    <div id=\"manualVideoBody_" + id + "\" class=\"manual-video-body is-hidden\">\n" +
                   "        <iframe id=\"manualVideoPlayer_" + id + "\" src=\"https://www.youtube.com/embed/" + ytId + "?enablejsapi=1\" style=\"width:100%; aspect-ratio:16/9; border:none; border-radius:8px; box-shadow:0 4px 12px rgba(0, 0, 0, 0.15);\" allowfullscreen></iframe>\n" +
                   "    </div>\n" +
                   "</div>";
        } else {
            // 일반 비디오 카드 렌더링 (video 태그 사용)
            return "<div class=\"manual-video-card\">\n" +
                   "    <div class=\"manual-video-header\">\n" +
                   "        <div class=\"manual-video-title\">\n" +
                   "            <i class=\"fas fa-video\"></i>\n" +
                   "            <span>" + escapeHtml(alt) + "</span>\n" +
                   "        </div>\n" +
                   "        <button id=\"manualVideoBtn_" + id + "\" class=\"manual-video-btn collapsed\" onclick=\"toggleManualVideo('" + id + "')\">\n" +
                   "            <i id=\"manualVideoBtnIcon_" + id + "\" class=\"fas fa-video\"></i>\n" +
                   "            <span id=\"manualVideoBtnText_" + id + "\">동영상 보기</span>\n" +
                   "        </button>\n" +
                   "    </div>\n" +
                   "    <div id=\"manualVideoBody_" + id + "\" class=\"manual-video-body is-hidden\">\n" +
                   "        <video id=\"manualVideoPlayer_" + id + "\" src=\"" + src + "\" controls></video>\n" +
                   "    </div>\n" +
                   "</div>";
        }
    }

    private static boolean isVideoFile(String url) {
        if (url == null) {
            return false;
        }
        String lower = url.toLowerCase().trim();
        return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg") ||
               lower.contains(".mp4?") || lower.contains(".webm?") || lower.contains(".ogg?") ||
               lower.contains("youtube.com") || lower.contains("youtu.be");
    }

    private static String getYouTubeVideoId(String url) {
        if (url == null) {
            return null;
        }
        String regex = "(?:youtube(?:-nocookie)?\\.com\\/(?:shorts\\/|[^\\/\\n\\s]+\\/\\S+\\/|(?:v|e)?(?:mbed)?\\/|\\S*?[?&]v=)|youtu\\.be\\/)([a-zA-Z0-9_-]{11})";
        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
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
