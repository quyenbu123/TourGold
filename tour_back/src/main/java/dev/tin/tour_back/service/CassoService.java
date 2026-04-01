package dev.tin.tour_back.service;

import dev.tin.tour_back.exception.CassoPaymentException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CassoService {
    
    private final RestTemplate restTemplate;
    
    @Value("${checkpayment.Casso.api-key}")
    private String apiKey;
    
    @Value("${checkpayment.Casso.api-get-piad}")
    private String apiUrl;
    
    // Rate limiting variables
    private long lastRequestTime = 0;
    private final long MIN_REQUEST_INTERVAL = 60000; // Minimum 60 seconds between API calls to respect Casso's 2 req/min limit
    
    public CassoService() {
        this.restTemplate = new RestTemplate();
    }
    
    /**
     * Lấy danh sách giao dịch từ Casso API với phân trang
     * 
     * @param page Số trang (mặc định 1)
     * @param limit Số lượng giao dịch mỗi trang (mặc định 20)
     * @return Dữ liệu giao dịch từ Casso
     * @throws CassoPaymentException Nếu có lỗi khi gọi API Casso
     */
    public Map<String, Object> getTransactions(Integer page, Integer limit) {
        try {
            // Validate input parameters
            if (page != null && page <= 0) {
                throw new CassoPaymentException("Page number must be positive", "INVALID_PARAM", "/api/v1/payment/check/transactions");
            }
            
            if (limit != null && (limit <= 0 || limit > 100)) {
                throw new CassoPaymentException("Limit must be between 1 and 100", "INVALID_PARAM", "/api/v1/payment/check/transactions");
            }

            // Set default values if not provided
            page = page != null ? page : 1;
            limit = limit != null ? limit : 20;
            
            // Rate limiting check
            long currentTime = System.currentTimeMillis();
            long timeSinceLastRequest = currentTime - lastRequestTime;
            
            if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
                try {
                    System.out.println("Rate limiting: Waiting " + (MIN_REQUEST_INTERVAL - timeSinceLastRequest) + 
                        " ms before making Casso API request");
                    Thread.sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new CassoPaymentException("Rate limiting interrupted", "RATE_LIMIT_INTERRUPTED", "/api/v1/payment/check/transactions", e);
                }
            }
            
            // Update last request time
            lastRequestTime = System.currentTimeMillis();
            
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "apikey " + apiKey);
        headers.set("Content-Type", "application/json");
        
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
        
            String url = apiUrl + "?page=" + page + "&limit=" + limit;
            
            System.out.println("Making Casso API request to: " + url);
        
        ResponseEntity<Map> response = restTemplate.exchange(
            url,
            HttpMethod.GET,
            requestEntity,
            Map.class
        );
        
            Map<String, Object> result = response.getBody() != null ? response.getBody() : new HashMap<>();
            
            // Log transaction count if successful
            if (result.containsKey("data") && result.get("data") instanceof Map) {
                Map<String, Object> data = (Map<String, Object>) result.get("data");
                if (data.containsKey("records") && data.get("records") instanceof List) {
                    List<Map<String, Object>> records = (List<Map<String, Object>>) data.get("records");
                    System.out.println("Successfully retrieved " + records.size() + " transactions from Casso API (Page " + page + ")");
                    
                    // Log pagination info if available
                    if (data.containsKey("totalPages")) {
                        System.out.println("Total pages: " + data.get("totalPages"));
                    }
                    if (data.containsKey("totalRecords")) {
                        System.out.println("Total records: " + data.get("totalRecords"));
                    }
                }
            }
            
            return result;
        } catch (HttpClientErrorException e) {
            // Xử lý lỗi HTTP từ API (như 429 Too Many Requests)
            System.err.println("HTTP Error calling Casso API: " + e.getStatusCode() + " " + e.getStatusText());
            e.printStackTrace();
            
            // Log thêm thông tin để debug
            String errorDetail = "HTTP Error: " + e.getStatusCode() + " " + e.getStatusText();
            if (e.getStatusCode().value() == 429) {
                errorDetail = "Rate limit exceeded (429 Too Many Requests). Please wait before making another request.";
            }
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);
            errorResponse.put("message", errorDetail);
            return errorResponse;
        } catch (ResourceAccessException e) {
            // Xử lý lỗi kết nối
            System.err.println("Connection error calling Casso API: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);
            errorResponse.put("message", "Cannot connect to Casso API: " + e.getMessage());
            return errorResponse;
        } catch (CassoPaymentException e) {
            // Đã xử lý ở trên, propagate lên
            throw e;
        } catch (Exception e) {
            // Xử lý mọi lỗi khác
            System.err.println("Casso API error: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);  // Using integer value for compatibility
            errorResponse.put("message", "Failed to fetch transactions: " + e.getMessage());
            return errorResponse;
        }
    }
    
    /**
     * Lấy tất cả giao dịch từ Casso API bằng cách tự động phân trang
     * 
     * @return Danh sách tất cả giao dịch
     * @throws CassoPaymentException Nếu có lỗi khi gọi API Casso
     */
    public Map<String, Object> getAllTransactions() {
        try {
            // Lấy trang đầu tiên để biết tổng số trang
            Map<String, Object> firstPage = getTransactions(1, 100);
            
            if (!firstPage.containsKey("data") || !(firstPage.get("data") instanceof Map)) {
                return firstPage;
            }
            
            Map<String, Object> data = (Map<String, Object>) firstPage.get("data");
            if (!data.containsKey("totalPages") || !data.containsKey("records")) {
                return firstPage;
            }
            
            int totalPages = ((Number) data.get("totalPages")).intValue();
            List<Map<String, Object>> allRecords = new ArrayList<>((List<Map<String, Object>>) data.get("records"));
            
            // Nếu chỉ có 1 trang, trả về kết quả ngay
            if (totalPages <= 1) {
                return firstPage;
            }
            
            // Lấy các trang còn lại
            for (int page = 2; page <= totalPages; page++) {
                // Đợi rate limit
                long currentTime = System.currentTimeMillis();
                long timeSinceLastRequest = currentTime - lastRequestTime;
                if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
                    Thread.sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
                }
                
                Map<String, Object> nextPage = getTransactions(page, 100);
                if (nextPage.containsKey("data") && nextPage.get("data") instanceof Map) {
                    Map<String, Object> nextData = (Map<String, Object>) nextPage.get("data");
                    if (nextData.containsKey("records") && nextData.get("records") instanceof List) {
                        allRecords.addAll((List<Map<String, Object>>) nextData.get("records"));
                    }
                }
            }
            
            // Cập nhật lại data với tất cả records
            data.put("records", allRecords);
            data.put("page", 1);
            data.put("pageSize", allRecords.size());
            data.put("nextPage", 1);
            data.put("prevPage", 1);
            data.put("totalPages", 1);
            data.put("totalRecords", allRecords.size());
            
            return firstPage;
        } catch (Exception e) {
            System.err.println("Error getting all transactions: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", 1);
            errorResponse.put("message", "Failed to fetch all transactions: " + e.getMessage());
            return errorResponse;
        }
    }
    
    /**
     * Kiểm tra xem giao dịch có tồn tại cho mã đơn hàng cụ thể không
     * 
     * @param orderId Mã đơn hàng cần kiểm tra
     * @param amount Số tiền cần kiểm tra (tùy chọn)
     * @return true nếu tìm thấy giao dịch, false nếu không
     * @throws CassoPaymentException Nếu có lỗi khi gọi API Casso
     */
    public boolean verifyPayment(String orderId, Long amount) {
        try {
            if (orderId == null || orderId.trim().isEmpty()) {
                throw new CassoPaymentException("Order ID cannot be empty", "INVALID_PARAM", "/api/v1/payment/check/verify");
            }
            // Lấy trang đầu để biết tổng số trang
            Map<String, Object> firstPage = getTransactions(1, 100);
            if (!firstPage.containsKey("data") || !(firstPage.get("data") instanceof Map)) {
                return false;
            }
            Map<String, Object> data = (Map<String, Object>) firstPage.get("data");
            int totalPages = 1;
            if (data.containsKey("totalPages")) {
                totalPages = ((Number) data.get("totalPages")).intValue();
            }
            // Lấy trang cuối cùng
            Map<String, Object> lastPage = getTransactions(totalPages, 100);
            if (lastPage.containsKey("data") && lastPage.get("data") instanceof Map) {
                Map<String, Object> lastData = (Map<String, Object>) lastPage.get("data");
                if (lastData.containsKey("records") && lastData.get("records") instanceof List) {
                    List<Map<String, Object>> records = (List<Map<String, Object>>) lastData.get("records");
                for (Map<String, Object> record : records) {
                    String description = (String) record.get("description");
                        Long transactionAmount = null;
                        if (record.containsKey("amount") && record.get("amount") instanceof Number) {
                            transactionAmount = ((Number) record.get("amount")).longValue();
                        }
                        if (description != null && containsOrderId(description, orderId)) {
                        if (amount == null || transactionAmount.equals(amount)) {
                            return true;
                            }
                        }
                    }
                }
            }
            return false;
        } catch (CassoPaymentException e) {
            throw e;
        } catch (Exception e) {
            throw new CassoPaymentException("Error verifying payment: " + e.getMessage(), 
                "VERIFICATION_ERROR", "/api/v1/payment/check/verify", e);
        }
    }
    
    /**
     * Kiểm tra xem description có chứa mã đơn hàng không
     * 
     * @param description Nội dung giao dịch
     * @param orderId Mã đơn hàng cần tìm
     * @return true nếu tìm thấy, false nếu không
     */
    private boolean containsOrderId(String description, String orderId) {
        if (description == null || orderId == null) {
            return false;
        }
        
        // Các cách thể hiện orderId trong mô tả giao dịch
        String[] patterns = {
            "booking\\s*(id)?\\s*[:#]?\\s*" + Pattern.quote(orderId),   // "booking id: 123", "booking #123"
            "tour\\s*(id)?\\s*[:#]?\\s*" + Pattern.quote(orderId),      // "tour id: 123", "tour #123"
            "order\\s*(id)?\\s*[:#]?\\s*" + Pattern.quote(orderId),     // "order id: 123", "order #123"
            "#\\s*" + Pattern.quote(orderId),                           // "#123"
            "id\\s*[:#]?\\s*" + Pattern.quote(orderId),                 // "id: 123"
            "ma\\s*[:#]?\\s*" + Pattern.quote(orderId),                 // "ma: 123" (tiếng Việt)
            "mã\\s*[:#]?\\s*" + Pattern.quote(orderId),                 // "mã: 123" (tiếng Việt có dấu)
            "\\b" + Pattern.quote(orderId) + "\\b"                      // Số chính xác
        };
        
        String lowerDescription = description.toLowerCase();
        
        // Thử từng pattern
        for (String patternStr : patterns) {
            Pattern pattern = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(lowerDescription);
            if (matcher.find()) {
                return true;
            }
        }
        
        // Trường hợp đặc biệt: nếu orderId chỉ gồm số, và description chỉ có một con số duy nhất
        if (orderId.matches("\\d+")) {
            // Tìm tất cả số trong mô tả
            Pattern numPattern = Pattern.compile("\\d+");
            Matcher numMatcher = numPattern.matcher(description);
            
            // Nếu chỉ có một số và số đó trùng với orderId
            boolean foundMatch = false;
            int count = 0;
            
            while (numMatcher.find()) {
                count++;
                if (numMatcher.group().equals(orderId)) {
                    foundMatch = true;
                }
            }
            
            if (count == 1 && foundMatch) {
                return true;
            }
        }

        String desc = description.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        String id1 = orderId.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        boolean result = desc.contains(id1);
        
        if (result) {
            System.out.println("[MATCH SUCCESS] Description contains order ID: description='" + desc + "', orderID='" + id1 + "'");
        } else {
            System.out.println("[DEBUG] So sánh orderId: desc='" + desc + "', id1='" + id1 + "', result=" + result);
        }
        
        return result;
    }
    
    /**
     * Lấy giao dịch mới nhất theo mã đơn hàng
     * 
     * @param orderId Mã đơn hàng cần tìm
     * @return Thông tin giao dịch nếu tìm thấy, null nếu không có
     */
    public Map<String, Object> getLatestTransactionByOrderId(String orderId) {
        // Lấy trang đầu để biết tổng số trang
        Map<String, Object> firstPage = getTransactions(1, 100);
        if (!firstPage.containsKey("data") || !(firstPage.get("data") instanceof Map)) {
            return null;
        }
        Map<String, Object> data = (Map<String, Object>) firstPage.get("data");
        int totalPages = 1;
        if (data.containsKey("totalPages")) {
            totalPages = ((Number) data.get("totalPages")).intValue();
        }
        // Lấy trang cuối cùng
        Map<String, Object> lastPage = getTransactions(totalPages, 100);
        if (lastPage.containsKey("data") && lastPage.get("data") instanceof Map) {
            Map<String, Object> lastData = (Map<String, Object>) lastPage.get("data");
            if (lastData.containsKey("records") && lastData.get("records") instanceof List) {
                List<Map<String, Object>> records = (List<Map<String, Object>>) lastData.get("records");
                List<Map<String, Object>> matchingTransactions = new ArrayList<>();
                for (Map<String, Object> record : records) {
                    String description = (String) record.get("description");
                    if (description != null && containsOrderId(description, orderId)) {
                        matchingTransactions.add(record);
                    }
                }
                if (!matchingTransactions.isEmpty()) {
                    matchingTransactions.sort((t1, t2) -> {
                        LocalDateTime date1 = LocalDateTime.parse(t1.get("when").toString());
                        LocalDateTime date2 = LocalDateTime.parse(t2.get("when").toString());
                        return date2.compareTo(date1);
                    });
                    return matchingTransactions.get(0);
                }
            }
        }
        return null;
    }
}