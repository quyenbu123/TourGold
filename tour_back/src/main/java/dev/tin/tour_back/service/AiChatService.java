package dev.tin.tour_back.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.tin.tour_back.entity.TourEntity;
import dev.tin.tour_back.entity.TourPriceEntity;
import dev.tin.tour_back.model.FeaturedTour;
import dev.tin.tour_back.repository.TourRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private final TourRepository tourRepository;
    private final FeaturedTourService featuredTourService;
    private final Environment environment;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-2.0-flash}")
    private String geminiModel;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    private static final long KNOWLEDGE_CACHE_TTL_MS = 5 * 60 * 1000;
    private final Object knowledgeCacheLock = new Object();
    private volatile CachedKnowledge cachedKnowledge = new CachedKnowledge();

    private static final String GEMINI_URL_TEMPLATE =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

        private static final Pattern MAX_PRICE_PATTERN = Pattern.compile(
            "(?:dưới|không\\s+quá|<=|<|tối\\s+đa|ít\\s+hơn|max(?:imum)?)\\s*(\\d[\\d\\.,]*)\\s*(triệu|tr|tỷ|ty|nghìn|ngàn|k|ngàn\\s+đồng|nghìn\\s+đồng|vnđ|vnd|đ)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

        private static final Pattern MIN_PRICE_PATTERN = Pattern.compile(
            "(?:từ|>=|>|tối\\s+thiểu|ít\\s+nhất|min(?:imum)?)\\s*(\\d[\\d\\.,]*)\\s*(triệu|tr|tỷ|ty|nghìn|ngàn|k|ngàn\\s+đồng|nghìn\\s+đồng|vnđ|vnd|đ)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private static final class CachedKnowledge {
        private volatile String featured = "";
        private volatile String catalog = "";
        private volatile Instant fetchedAt = Instant.EPOCH;
        private volatile List<TourLinkInfo> linkableTours = Collections.emptyList();
    }

    private static final class PriceConstraint {
        private final Long minPrice;
        private final Long maxPrice;

        private PriceConstraint(Long minPrice, Long maxPrice) {
            this.minPrice = minPrice;
            this.maxPrice = maxPrice;
        }
    }

    private static final class TourLinkInfo {
        private final Long id;
        private final String name;
        private final String normalizedName;

        private TourLinkInfo(Long id, String name, String normalizedName) {
            this.id = id;
            this.name = name;
            this.normalizedName = normalizedName;
        }

        private Long getId() {
            return id;
        }

        private String getName() {
            return name;
        }

        private String getNormalizedName() {
            return normalizedName;
        }
    }

    @Transactional(readOnly = true)
    public String answer(String questionRaw) throws Exception {
        String question = StringUtils.trimToEmpty(questionRaw);
        if (question.isBlank()) {
            return "Vui lòng nhập câu hỏi hoặc lời nhắn để mình có thể hỗ trợ nhé!";
        }

        long processStart = System.nanoTime();
        long knowledgeDurationMs = 0;
        long httpDurationMs = 0;

        String apiKey = resolveGeminiApiKey();
        if (StringUtils.isBlank(apiKey)) {
            log.error("Gemini API key is missing. Chat bot cannot call Gemini service.");
            return "Xin lỗi, hệ thống AI chưa được cấu hình khóa Gemini.";
        }

        // Xử lý các câu giao tiếp chung
        if (isSmallTalk(question)) {
            return chatGeneral(question, apiKey);
        }

        // Xây dựng tri thức từ database
        long knowledgeStart = System.nanoTime();
        PriceConstraint priceConstraint = extractPriceConstraint(question);
        List<TourEntity> relatedTours = applyPriceConstraint(fetchContextTours(question), priceConstraint);
        if (priceConstraint != null && (relatedTours == null || relatedTours.isEmpty())) {
            List<TourEntity> altTours = applyPriceConstraint(tourRepository.findAll(), priceConstraint);
            if (altTours.isEmpty()) {
                return buildNoTourMessage(priceConstraint);
            }
            relatedTours = altTours;
        }

        String directPriceAnswer = maybeAnswerWithDetailedPrice(question, relatedTours, priceConstraint);
        if (directPriceAnswer != null) {
            long totalDurationMs = (System.nanoTime() - processStart) / 1_000_000;
            log.debug("Answered directly with price breakdown in {} ms", totalDurationMs);
            return directPriceAnswer;
        }

        String knowledgeBase = buildKnowledgeBase(relatedTours);
        knowledgeDurationMs = (System.nanoTime() - knowledgeStart) / 1_000_000;
        if (StringUtils.isBlank(knowledgeBase)) {
            log.warn("Knowledge base is empty for question: {}", question);
            knowledgeBase = "(Không tìm thấy dữ liệu tour phù hợp)";
        }

    String systemPrompt = String.join("\n",
        "Bạn là trợ lý AI thân thiện của Tour Gold, trả lời ngắn gọn bằng tiếng Việt.",
        "Ưu tiên sử dụng dữ liệu tour được cung cấp (tên, giá, lịch khởi hành, khuyến mãi, lượt đặt).",
        "Nếu thiếu thông tin, phản hồi lịch sự và gợi ý liên hệ hỗ trợ."
    );

        String userPrompt = String.format(Locale.ROOT,
                "Người dùng hỏi: %s\n\nDữ liệu tour từ hệ thống (cập nhật mới nhất):\n%s\n\nHãy dùng dữ liệu này để trả lời chính xác và thân thiện.",
                question, knowledgeBase);

        String payload = buildGeminiPayload(systemPrompt, userPrompt);
        String url = buildGeminiUrl(apiKey);

        try (CloseableHttpClient client = HttpClients.createDefault()) {
            HttpPost post = new HttpPost(url);
            post.setHeader("Content-Type", "application/json; charset=UTF-8");
            post.setEntity(new StringEntity(payload, StandardCharsets.UTF_8));
            long httpStart = System.nanoTime();
            try (CloseableHttpResponse resp = client.execute(post)) {
                httpDurationMs = (System.nanoTime() - httpStart) / 1_000_000;
                int code = resp.getStatusLine().getStatusCode();
                String responseBody = resp.getEntity() != null
                        ? EntityUtils.toString(resp.getEntity(), StandardCharsets.UTF_8)
                        : "";
                log.info("Gemini API response status: {}", code);

                if (code >= 200 && code < 300 && StringUtils.isNotBlank(responseBody)) {
                    JsonNode json = objectMapper.readTree(responseBody);
                    String ans = extractGeminiText(json);
                    if (StringUtils.isNotBlank(ans)) {
                        String clean = sanitizeResponse(ans);
                        String enriched = enrichWithTourLinks(clean, relatedTours);
                        long totalDurationMs = (System.nanoTime() - processStart) / 1_000_000;
                        log.debug("Gemini success in {} ms (KB: {} ms, HTTP: {} ms)",
                                totalDurationMs, knowledgeDurationMs, httpDurationMs);
                        return enriched;
                    }

                    JsonNode feedback = json.path("promptFeedback");
                    log.warn("Gemini returned no candidates. Feedback: {}", feedback.toString());
                } else {
                    log.error("Gemini API failed with status {}. Body: {}", code, summarizeResponse(responseBody));
                }
            }
        } catch (Exception e) {
            log.error("Gemini request error: ", e);
        }

        long totalDurationMs = (System.nanoTime() - processStart) / 1_000_000;
        log.debug("Gemini fallback after {} ms (KB: {} ms, HTTP: {} ms)",
                totalDurationMs, knowledgeDurationMs, httpDurationMs);
        return "Xin lỗi, hiện tại mình chưa thể trả lời câu hỏi này. Bạn có thể thử lại sau nhé!";
    }

    // Giao tiếp ngắn (chào, cảm ơn...)
    private boolean isSmallTalk(String q) {
        String lower = q.toLowerCase(Locale.ROOT);
        return lower.matches(".*(xin chào|chào|hello|hi|hey|bạn là ai|cảm ơn|tạm biệt|bye|thanks).*");
    }

    private String chatGeneral(String question, String apiKey) throws Exception {
        String systemPrompt = "Bạn là trợ lý AI thân thiện, vui vẻ, nói chuyện tự nhiên bằng tiếng Việt, phù hợp cho khách du lịch.";
        String payload = buildGeminiPayload(systemPrompt, question);
        String url = buildGeminiUrl(apiKey);
        long processStart = System.nanoTime();
        long httpDurationMs = 0;

        try (CloseableHttpClient client = HttpClients.createDefault()) {
            HttpPost post = new HttpPost(url);
            post.setHeader("Content-Type", "application/json; charset=UTF-8");
            post.setEntity(new StringEntity(payload, StandardCharsets.UTF_8));
            long httpStart = System.nanoTime();
            try (CloseableHttpResponse resp = client.execute(post)) {
                httpDurationMs = (System.nanoTime() - httpStart) / 1_000_000;
                int status = resp.getStatusLine().getStatusCode();
                String body = resp.getEntity() != null ? EntityUtils.toString(resp.getEntity(), StandardCharsets.UTF_8) : "";
                log.info("Gemini small-talk status: {}", status);

                if (status == 200 && StringUtils.isNotBlank(body)) {
                    JsonNode json = objectMapper.readTree(body);
                    String ans = extractGeminiText(json);
                    if (StringUtils.isNotBlank(ans)) {
                        long totalDurationMs = (System.nanoTime() - processStart) / 1_000_000;
                        log.debug("Gemini small-talk success in {} ms (HTTP: {} ms)", totalDurationMs, httpDurationMs);
                        return sanitizeResponse(ans);
                    }
                    log.warn("Small-talk: no valid candidates. promptFeedback={}", json.path("promptFeedback").toString());
                } else {
                    log.warn("Small-talk failed: {} Body: {}", status, summarizeResponse(body));
                }
            }
        } catch (Exception e) {
            log.error("Small-talk exception: ", e);
        }

        long totalDurationMs = (System.nanoTime() - processStart) / 1_000_000;
        log.debug("Gemini small-talk fallback after {} ms (HTTP: {} ms)", totalDurationMs, httpDurationMs);
        return "Chào bạn! Mình là trợ lý AI của Tour Gold, sẵn sàng giúp bạn tìm tour phù hợp!";
    }

    // Trích xuất nội dung Gemini
    private String extractGeminiText(JsonNode json) {
        JsonNode candidates = json.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (parts.isArray() && parts.size() > 0) {
                StringBuilder sb = new StringBuilder();
                for (JsonNode p : parts) {
                    String t = p.path("text").asText("");
                    if (!t.isBlank()) sb.append(t);
                }
                return sb.toString().trim();
            }
        }
        return "";
    }

    // Build payload gửi Gemini
    private String buildGeminiPayload(String systemPrompt, String userPrompt) throws Exception {
        String combined = systemPrompt + "\n\n" + userPrompt;
        var root = objectMapper.createObjectNode();

        var contents = root.putArray("contents");
        var content = contents.addObject();
        content.put("role", "user");
        content.putArray("parts").addObject().put("text", combined);

    var gen = root.putObject("generationConfig");
    gen.put("temperature", 0.6);
    gen.put("maxOutputTokens", 320);
    gen.put("topK", 30);
    gen.put("topP", 0.9);

        return objectMapper.writeValueAsString(root);
    }

    private String resolveGeminiApiKey() {
        if (StringUtils.isNotBlank(geminiApiKey)) return geminiApiKey;

        String candidate = null;

        if (environment != null) {
            candidate = environment.getProperty("gemini.api.key");
            if (StringUtils.isBlank(candidate)) {
                candidate = environment.getProperty("GEMINI_API_KEY");
            }
        }

        if (StringUtils.isBlank(candidate)) {
            candidate = System.getenv("GEMINI_API_KEY");
        }
        if (StringUtils.isBlank(candidate)) {
            candidate = System.getenv("gemini.api.key");
        }

        geminiApiKey = candidate != null ? candidate : "";
        if (StringUtils.isNotBlank(geminiApiKey)) {
            log.info("Gemini API key resolved successfully (masked): {}", maskKey(geminiApiKey));
        } else {
            log.error("Gemini API key missing in environment and config.");
        }
        return geminiApiKey;
    }

    private String buildGeminiUrl(String apiKey) {
        String model = StringUtils.defaultIfBlank(geminiModel, "gemini-2.0-flash").trim();
        if (!model.startsWith("gemini")) {
            log.warn("Gemini model '{}' does not look valid; falling back to gemini-2.0-flash.", model);
            model = "gemini-2.0-flash";
        }
        if (log.isDebugEnabled()) {
            log.debug("Calling Gemini model '{}'", model);
        }
        return String.format(Locale.ROOT, GEMINI_URL_TEMPLATE, model, apiKey);
    }

    private String summarizeResponse(String body) {
        if (StringUtils.isBlank(body)) return "";
        final int maxLength = 500;
        String collapsed = body.replaceAll("\\s+", " ").trim();
        return collapsed.length() > maxLength ? collapsed.substring(0, maxLength) + "..." : collapsed;
    }

    private String maskKey(String key) {
        if (StringUtils.isBlank(key)) return "";
        return key.length() <= 4 ? "****" : "****" + key.substring(key.length() - 4);
    }

    private String sanitizeResponse(String text) {
        if (StringUtils.isBlank(text)) {
            return text;
        }
        return text.replace("**", "");
    }

    private String enrichWithTourLinks(String text, List<TourEntity> tours) {
        if (StringUtils.isBlank(text)) {
            return text;
        }
        String base = StringUtils.trimToEmpty(frontendBaseUrl);
        if (base.isBlank()) {
            return text;
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }

        String normalizedAnswer = normalizeForCompare(text);
        if (normalizedAnswer.isBlank()) {
            return text;
        }

        List<AbstractMap.SimpleEntry<Integer, TourLinkInfo>> matches = new ArrayList<>();
        Set<Long> seenIds = new HashSet<>();
        if (tours != null) {
            for (TourEntity tour : tours) {
                TourLinkInfo info = toLinkInfo(tour);
                if (info == null || !seenIds.add(info.getId())) {
                    continue;
                }
                int idx = normalizedAnswer.indexOf(info.getNormalizedName());
                if (idx >= 0) {
                    matches.add(new AbstractMap.SimpleEntry<>(idx, info));
                }
            }
        }

        for (TourLinkInfo info : getLinkableTours()) {
            if (info == null || !seenIds.add(info.getId())) {
                continue;
            }
            int idx = normalizedAnswer.indexOf(info.getNormalizedName());
            if (idx >= 0) {
                matches.add(new AbstractMap.SimpleEntry<>(idx, info));
            }
        }
        if (matches.isEmpty()) {
            return text;
        }

        matches.sort(Comparator.comparingInt(AbstractMap.SimpleEntry::getKey));

        StringBuilder sb = new StringBuilder(text.trim());
        sb.append("\n\nXem thêm chi tiết:\n");
        boolean appended = false;
        for (AbstractMap.SimpleEntry<Integer, TourLinkInfo> entry : matches) {
            TourLinkInfo info = entry.getValue();
            String name = StringUtils.defaultIfBlank(info.getName(), "Chi tiết tour");
            String url = base + "/tours/" + info.getId();
            sb.append("- ").append(name).append(": ").append(url).append("\n");
            appended = true;
        }

        return appended ? sb.toString().trim() : text;
    }

    private String maybeAnswerWithDetailedPrice(String question, List<TourEntity> tours, PriceConstraint constraint) {
        if (StringUtils.isBlank(question)) {
            return null;
        }
        List<TourEntity> candidateTours = tours;
        if (candidateTours == null || candidateTours.isEmpty()) {
            TourEntity fallback = findTourByNameInQuestion(question);
            if (fallback != null) {
                candidateTours = Collections.singletonList(fallback);
            } else {
                return null;
            }
        }
        if (!needsDetailedPriceAnswer(question)) {
            return null;
        }
        TourEntity primary = selectPrimaryTour(question, candidateTours);
        if (primary == null || primary.getTourPrices() == null || primary.getTourPrices().isEmpty()) {
            return null;
        }
        boolean constraintApplied = constraint != null && (constraint.minPrice != null || constraint.maxPrice != null);
        List<TourPriceEntity> priceOptions = filterPriceOptions(primary.getTourPrices(), constraint);
        boolean constraintMatched = !priceOptions.isEmpty();
        if (priceOptions.isEmpty()) {
            priceOptions = filterPriceOptions(primary.getTourPrices(), null);
        }
        if (priceOptions.isEmpty()) {
            return null;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Giá chi tiết cho tour \"").append(StringUtils.defaultIfBlank(primary.getName(), "Tour"))
                .append("\":\n");
        for (TourPriceEntity option : priceOptions) {
            if (option == null || option.getPrice() == null) {
                continue;
            }
            sb.append("* ");
            sb.append(StringUtils.defaultIfBlank(option.getName(), "Gói"));
            sb.append(": ").append(formatCurrency(option.getPrice()));
            if (StringUtils.isNotBlank(option.getDescription())) {
                sb.append(" - ").append(option.getDescription().trim());
            }
            sb.append("\n");
        }

        if (constraintApplied) {
            if (constraintMatched) {
                sb.append("\n(Lọc theo ngân sách ").append(describeConstraint(constraint)).append(")\n");
            } else {
                sb.append("\n(Không có gói giá nào đúng giới hạn ")
                        .append(describeConstraint(constraint))
                        .append(", hiển thị toàn bộ gói hiện có)\n");
            }
        }

        sb.append("\nBạn cần thêm thông tin nào khác về tour này không? Mình luôn sẵn sàng hỗ trợ!\n");

        return enrichWithTourLinks(sb.toString().trim(), Collections.singletonList(primary));
    }

    private boolean needsDetailedPriceAnswer(String question) {
        String normalized = normalizeForCompare(StringUtils.stripAccents(question));
        return normalized.contains("gia chi tiet")
                || normalized.contains("gia tung nguoi")
                || normalized.contains("gia moi nguoi")
                || normalized.contains("gia per person")
                || normalized.contains("bao nhieu mot nguoi")
                || normalized.contains("gia cho tung nguoi")
                || normalized.contains("gia chi tiet tung nguoi");
    }

    private TourEntity selectPrimaryTour(String question, List<TourEntity> tours) {
        if (tours == null || tours.isEmpty()) {
            return null;
        }
        if (tours.size() == 1) {
            return tours.get(0);
        }
        String normalizedQuestion = normalizeForCompare(question);
        return tours.stream()
                .filter(Objects::nonNull)
                .max(Comparator.comparingInt(t -> computeTourScore(normalizedQuestion, normalizeForCompare(t.getName()), t)))
                .orElse(null);
    }

    private int computeTourScore(String normalizedQuestion, String normalizedName, TourEntity tour) {
        if (StringUtils.isBlank(normalizedName)) {
            return 0;
        }
        int score = 0;
        if (StringUtils.isNotBlank(normalizedQuestion)) {
            if (normalizedQuestion.contains(normalizedName)) {
                score += 200;
            }
            for (String token : normalizedQuestion.split("\\s+")) {
                if (token.length() > 2 && normalizedName.contains(token)) {
                    score += 10;
                }
            }
        }
        Long price = findMinPrice(tour);
        if (price != null) {
            score += 5;
        }
        return score;
    }

    private List<TourPriceEntity> filterPriceOptions(List<TourPriceEntity> prices, PriceConstraint constraint) {
        if (prices == null || prices.isEmpty()) {
            return Collections.emptyList();
        }
        return prices.stream()
                .filter(Objects::nonNull)
                .filter(p -> p.getPrice() != null)
                .filter(p -> priceMatchesConstraint(p.getPrice(), constraint))
                .collect(Collectors.toList());
    }

    private TourEntity findTourByNameInQuestion(String question) {
        String normalizedQuestion = normalizeForCompare(question);
        if (StringUtils.isBlank(normalizedQuestion)) {
            return null;
        }
        TourLinkInfo best = getLinkableTours().stream()
                .filter(Objects::nonNull)
                .max(Comparator.comparingInt(info -> computeNameMatchScore(normalizedQuestion, info.getNormalizedName())))
                .orElse(null);
        if (best == null) {
            return null;
        }
        int score = computeNameMatchScore(normalizedQuestion, best.getNormalizedName());
        if (score <= 0) {
            return null;
        }
        return tourRepository.findById(best.getId()).orElse(null);
    }

    private int computeNameMatchScore(String normalizedQuestion, String normalizedName) {
        if (StringUtils.isBlank(normalizedQuestion) || StringUtils.isBlank(normalizedName)) {
            return 0;
        }
        int score = 0;
        if (normalizedQuestion.contains(normalizedName)) {
            score += 300;
        }
        for (String token : normalizedName.split("\\s+")) {
            if (token.length() < 3) {
                continue;
            }
            if (normalizedQuestion.contains(token)) {
                score += 15;
            }
        }
        return score;
    }

    private boolean priceMatchesConstraint(Long price, PriceConstraint constraint) {
        if (constraint == null) {
            return true;
        }
        if (constraint.minPrice != null && price < constraint.minPrice) {
            return false;
        }
        if (constraint.maxPrice != null && price > constraint.maxPrice) {
            return false;
        }
        return true;
    }

    private PriceConstraint extractPriceConstraint(String question) {
        if (StringUtils.isBlank(question)) {
            return null;
        }
        String normalized = StringUtils.normalizeSpace(question);
        Long maxPrice = null;
        Long minPrice = null;

        Matcher maxMatcher = MAX_PRICE_PATTERN.matcher(normalized);
        if (maxMatcher.find()) {
            maxPrice = parseAmount(maxMatcher.group(1), maxMatcher.group(2));
        }

        Matcher minMatcher = MIN_PRICE_PATTERN.matcher(normalized);
        if (minMatcher.find()) {
            minPrice = parseAmount(minMatcher.group(1), minMatcher.group(2));
        }

        if (minPrice == null && maxPrice == null) {
            return null;
        }

        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            long tmp = minPrice;
            minPrice = maxPrice;
            maxPrice = tmp;
        }

        return new PriceConstraint(minPrice, maxPrice);
    }

    private List<TourEntity> applyPriceConstraint(List<TourEntity> tours, PriceConstraint constraint) {
        if (constraint == null || tours == null) {
            return tours;
        }
        return tours.stream()
                .filter(Objects::nonNull)
                .filter(t -> matchesConstraint(t, constraint))
                .collect(Collectors.toList());
    }

    private boolean matchesConstraint(TourEntity tour, PriceConstraint constraint) {
        if (tour == null || constraint == null) {
            return false;
        }
        Long price = findMinPrice(tour);
        if (price == null) {
            return false;
        }
        if (constraint.minPrice != null && price < constraint.minPrice) {
            return false;
        }
        if (constraint.maxPrice != null && price > constraint.maxPrice) {
            return false;
        }
        return true;
    }

    private String buildNoTourMessage(PriceConstraint constraint) {
        if (constraint == null) {
            return "Xin lỗi, hiện chưa có tour phù hợp với yêu cầu giá của bạn.";
        }
        String criteria = describeConstraint(constraint);
        return String.format(
                Locale.ROOT,
                "Xin lỗi, hiện Tour Gold chưa có tour phù hợp với mức giá %s. Bạn có thể thử điều chỉnh ngân sách hoặc liên hệ bộ phận hỗ trợ để được tư vấn thêm nhé!",
                criteria);
    }

    private String describeConstraint(PriceConstraint constraint) {
        if (constraint == null) {
            return "bạn mong muốn";
        }
        if (constraint.minPrice != null && constraint.maxPrice != null) {
            return String.format(Locale.ROOT, "từ %s đến %s", formatCurrency(constraint.minPrice), formatCurrency(constraint.maxPrice));
        }
        if (constraint.maxPrice != null) {
            return String.format(Locale.ROOT, "dưới %s", formatCurrency(constraint.maxPrice));
        }
        return String.format(Locale.ROOT, "từ %s", formatCurrency(constraint.minPrice));
    }

    private Long parseAmount(String numberPart, String unitPart) {
        if (StringUtils.isBlank(numberPart)) {
            return null;
        }
        String cleaned = numberPart.replaceAll("[^0-9.,]", "");
        if (StringUtils.isBlank(cleaned)) {
            return null;
        }
        String candidate = cleaned.replace(',', '.');
        int dotCount = StringUtils.countMatches(candidate, ".");
        if (dotCount > 1) {
            candidate = candidate.replace(".", "");
        } else if (candidate.endsWith(".")) {
            candidate = candidate.substring(0, candidate.length() - 1);
        }
        if (StringUtils.isBlank(candidate)) {
            return null;
        }
        try {
            BigDecimal value = new BigDecimal(candidate);
            long multiplier = resolveUnitMultiplier(unitPart);
            BigDecimal scaled = value.multiply(BigDecimal.valueOf(multiplier));
            return scaled.setScale(0, RoundingMode.HALF_UP).longValue();
        } catch (NumberFormatException ex) {
            log.debug("Không thể phân tích giá trị '{}' với đơn vị '{}'", numberPart, unitPart, ex);
            return null;
        }
    }

    private long resolveUnitMultiplier(String unitRaw) {
        if (StringUtils.isBlank(unitRaw)) {
            return 1L;
        }
        String normalized = StringUtils.stripAccents(unitRaw);
        normalized = StringUtils.lowerCase(normalized, Locale.ROOT);
        normalized = normalized.replaceAll("\\s+", "");
        if (normalized.isBlank()) {
            return 1L;
        }
        if (normalized.startsWith("trieu") || normalized.equals("tr")) {
            return 1_000_000L;
        }
        if (normalized.startsWith("ty") || normalized.startsWith("ti")) {
            return 1_000_000_000L;
        }
        if (normalized.startsWith("nghin") || normalized.startsWith("ngan") || normalized.equals("k")) {
            return 1_000L;
        }
        return 1L;
    }

    // ====== TRI THỨC TOUR ======
    private String buildKnowledgeBase(List<TourEntity> relatedTours) {
        String featured = getFeaturedToursKnowledge();
        String context = buildContextSnippet(relatedTours);
        String catalog = getTourCatalogKnowledge();
        return Stream.of(featured, context, catalog)
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining("\n\n"));
    }

    private String getFeaturedToursKnowledge() {
        ensureKnowledgeCache();
        return StringUtils.defaultString(cachedKnowledge.featured);
    }

    private String getTourCatalogKnowledge() {
        ensureKnowledgeCache();
        return StringUtils.defaultString(cachedKnowledge.catalog);
    }

    private void ensureKnowledgeCache() {
        if (!isCacheExpired()) {
            return;
        }
        synchronized (knowledgeCacheLock) {
            if (!isCacheExpired()) {
                return;
            }
            refreshKnowledgeCache();
        }
    }

    private boolean isCacheExpired() {
        Instant fetched = cachedKnowledge.fetchedAt;
        return fetched == null || fetched.plusMillis(KNOWLEDGE_CACHE_TTL_MS).isBefore(Instant.now());
    }

    private void refreshKnowledgeCache() {
        String featured = computeFeaturedToursKnowledge();
        String catalog = computeTourCatalogKnowledge();
        List<TourLinkInfo> linkableTours = computeLinkableTours();
        cachedKnowledge.featured = StringUtils.defaultString(featured);
        cachedKnowledge.catalog = StringUtils.defaultString(catalog);
        cachedKnowledge.fetchedAt = Instant.now();
        cachedKnowledge.linkableTours = linkableTours;
        log.debug("Knowledge cache refreshed (featured={}, catalog={})",
                cachedKnowledge.featured.length(), cachedKnowledge.catalog.length());
    }

    private String buildContextSnippet(List<TourEntity> tours) {
        if (tours == null || tours.isEmpty()) return "";
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        return tours.stream().limit(5).map(t -> {
            StringBuilder b = new StringBuilder();
            b.append("- Tên tour: ").append(nullSafe(t.getName())).append("\n");
            b.append("  Mô tả: ").append(truncate(nullSafe(t.getDescription()), 150)).append("\n");
            if (t.getStartDate() != null) b.append("  Khởi hành: ").append(fmt.format(t.getStartDate())).append("\n");
            if (t.getEndDate() != null) b.append("  Kết thúc: ").append(fmt.format(t.getEndDate())).append("\n");
            Long minPrice = findMinPrice(t);
            if (minPrice != null) b.append("  Giá từ: ").append(formatCurrency(minPrice)).append("\n");
            return b.toString();
        }).collect(Collectors.joining("\n"));
    }

    private String computeFeaturedToursKnowledge() {
        List<FeaturedTour> featured = featuredTourService.getTopFeaturedTours(10);
        if (featured == null || featured.isEmpty()) return "";

        Map<Long, TourEntity> map = tourRepository.findAllById(
                featured.stream().map(FeaturedTour::getTourId).toList())
                .stream().collect(Collectors.toMap(TourEntity::getId, t -> t));

        StringBuilder sb = new StringBuilder("TOP_TOURS_BY_BOOKINGS:\n");
        int rank = 1;
        for (FeaturedTour ft : featured) {
            TourEntity t = map.get(ft.getTourId());
            if (t == null) continue;
            sb.append(rank++).append(". ").append(t.getName()).append(" - ")
                    .append("Lượt đặt: ").append(ft.getBookTracking() != null ? ft.getBookTracking() : 0);
            Long price = findMinPrice(t);
            if (price != null) sb.append(" - Giá từ: ").append(formatCurrency(price));
            sb.append("\n");
        }
        return sb.toString();
    }

    private String computeTourCatalogKnowledge() {
        List<TourEntity> tours = tourRepository.findAll();
        if (tours == null || tours.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("TOUR_CATALOG:\n");
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        for (TourEntity t : tours) {
            sb.append("- ").append(t.getName());
            if (t.getStartDate() != null)
                sb.append(" (Khởi hành: ").append(fmt.format(t.getStartDate())).append(")");
            Long price = findMinPrice(t);
            if (price != null)
                sb.append(" - Giá từ: ").append(formatCurrency(price));
            sb.append("\n");
        }
        return sb.toString();
    }

    private List<TourLinkInfo> computeLinkableTours() {
        List<TourEntity> tours = tourRepository.findAll();
        if (tours == null || tours.isEmpty()) {
            return Collections.emptyList();
        }
        List<TourLinkInfo> infos = new ArrayList<>(tours.size());
        for (TourEntity tour : tours) {
            TourLinkInfo info = toLinkInfo(tour);
            if (info != null) {
                infos.add(info);
            }
        }
        return infos;
    }

    private List<TourEntity> fetchContextTours(String question) {
        List<TourEntity> primary = tourRepository
                .findTop10ByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(question, question);
        if (!primary.isEmpty()) return primary;

        String lower = question.toLowerCase(Locale.ROOT);
        if (lower.contains("tour") || lower.contains("lịch trình") || lower.contains("nổi bật")) {
            List<FeaturedTour> featured = featuredTourService.getTopFeaturedTours(5);
            List<Long> ids = featured.stream().map(FeaturedTour::getTourId).toList();
            return tourRepository.findAllById(ids);
        }

        return tourRepository.findAll().stream().limit(5).collect(Collectors.toList());
    }

    private Long findMinPrice(TourEntity tour) {
        if (tour.getTourPrices() == null || tour.getTourPrices().isEmpty()) return null;
        return tour.getTourPrices().stream()
                .map(TourPriceEntity::getPrice).filter(Objects::nonNull)
                .min(Long::compareTo).orElse(null);
    }

    private String formatCurrency(Long price) {
        NumberFormat nf = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));
        return nf.format(price) + "đ";
    }

    private List<TourLinkInfo> getLinkableTours() {
        ensureKnowledgeCache();
        List<TourLinkInfo> infos = cachedKnowledge.linkableTours;
        return infos != null ? infos : Collections.emptyList();
    }

    private TourLinkInfo toLinkInfo(TourEntity tour) {
        if (tour == null || tour.getId() == null) {
            return null;
        }
        String name = tour.getName();
        String normalized = normalizeForCompare(name);
        if (normalized.isBlank()) {
            return null;
        }
        return new TourLinkInfo(tour.getId(), name, normalized);
    }

    private String normalizeForCompare(String input) {
        if (input == null) {
            return "";
        }
        String noAccents = StringUtils.stripAccents(input);
        String lower = StringUtils.lowerCase(noAccents);
        return StringUtils.normalizeSpace(lower);
    }

    private static String truncate(String s, int len) {
        return s != null && s.length() > len ? s.substring(0, len) + "…" : s;
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }
}
