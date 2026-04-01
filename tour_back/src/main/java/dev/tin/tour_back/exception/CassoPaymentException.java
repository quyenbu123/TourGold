package dev.tin.tour_back.exception;

/**
 * Exception tùy chỉnh cho các lỗi liên quan đến thanh toán Casso
 * Giúp dễ dàng debug và xác định nguồn gốc lỗi
 */
public class CassoPaymentException extends RuntimeException {
    
    private final String errorCode;
    private final String requestPath;
    
    /**
     * Constructor với thông điệp lỗi
     * 
     * @param message Thông điệp lỗi
     */
    public CassoPaymentException(String message) {
        super(message);
        this.errorCode = "CASSO_ERROR";
        this.requestPath = "unknown";
    }
    
    /**
     * Constructor với thông điệp lỗi và path yêu cầu
     * 
     * @param message Thông điệp lỗi
     * @param requestPath Path của yêu cầu
     */
    public CassoPaymentException(String message, String requestPath) {
        super(message);
        this.errorCode = "CASSO_ERROR";
        this.requestPath = requestPath;
    }
    
    /**
     * Constructor đầy đủ
     * 
     * @param message Thông điệp lỗi
     * @param errorCode Mã lỗi
     * @param requestPath Path của yêu cầu
     */
    public CassoPaymentException(String message, String errorCode, String requestPath) {
        super(message);
        this.errorCode = errorCode;
        this.requestPath = requestPath;
    }
    
    /**
     * Constructor với thông điệp lỗi và nguyên nhân
     * 
     * @param message Thông điệp lỗi
     * @param cause Nguyên nhân lỗi
     */
    public CassoPaymentException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "CASSO_ERROR";
        this.requestPath = "unknown";
    }
    
    /**
     * Constructor với thông điệp lỗi, mã lỗi, path yêu cầu và nguyên nhân
     * 
     * @param message Thông điệp lỗi
     * @param errorCode Mã lỗi
     * @param requestPath Path của yêu cầu
     * @param cause Nguyên nhân lỗi
     */
    public CassoPaymentException(String message, String errorCode, String requestPath, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.requestPath = requestPath;
    }
    
    /**
     * Lấy mã lỗi
     * 
     * @return Mã lỗi
     */
    public String getErrorCode() {
        return errorCode;
    }
    
    /**
     * Lấy path yêu cầu
     * 
     * @return Path yêu cầu
     */
    public String getRequestPath() {
        return requestPath;
    }
    
    @Override
    public String toString() {
        return "CassoPaymentException [errorCode=" + errorCode + ", requestPath=" + requestPath + "]: " + getMessage();
    }
} 