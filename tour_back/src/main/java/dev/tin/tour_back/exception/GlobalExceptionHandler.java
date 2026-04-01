package dev.tin.tour_back.exception;

import com.auth0.jwt.exceptions.JWTVerificationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    /**
     * Handle authentication exceptions
     */
    @org.springframework.web.bind.annotation.ExceptionHandler({BadCredentialsException.class, AuthenticationException.class, UsernameNotFoundException.class})
    public ResponseEntity<Object> handleAuthenticationException(Exception ex, WebRequest request) {
        log.warn("Authentication error: {}", ex.getMessage());
        
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        body.put("error", "Authentication Failed");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false));
        
        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }
    
    /**
     * Handle authorization exceptions
     */
    @org.springframework.web.bind.annotation.ExceptionHandler({AccessDeniedException.class})
    public ResponseEntity<Object> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied: {}", ex.getMessage());
        
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.FORBIDDEN.value());
        body.put("error", "Access Denied");
        body.put("message", "You do not have permission to access this resource");
        body.put("path", request.getDescription(false));
        
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }
    
    /**
     * Handle JWT verification exceptions
     */
    @org.springframework.web.bind.annotation.ExceptionHandler({JWTVerificationException.class})
    public ResponseEntity<Object> handleJwtException(JWTVerificationException ex, WebRequest request) {
        log.warn("JWT verification error: {}", ex.getMessage());
        
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        body.put("error", "Invalid Token");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false));
        
        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }
    
    /**
     * Handle general exceptions
     */
    @org.springframework.web.bind.annotation.ExceptionHandler({Exception.class})
    public ResponseEntity<Object> handleAllExceptions(Exception ex, WebRequest request) {
        log.error("Unhandled exception", ex);
        
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "Internal Server Error");
        body.put("message", "An unexpected error occurred");
        body.put("path", request.getDescription(false));
        
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
        @NonNull MaxUploadSizeExceededException ex,
        @NonNull HttpHeaders headers,
        @NonNull HttpStatusCode status,
        @NonNull WebRequest request) {
        log.warn("Upload vượt quá giới hạn: {}", ex.getMessage());

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.PAYLOAD_TOO_LARGE.value());
        body.put("error", "File quá lớn");
        body.put("message", "Dung lượng ảnh vượt quá giới hạn hiện tại. Vui lòng chọn ảnh nhỏ hơn hoặc liên hệ quản trị để nâng giới hạn.");
        body.put("path", request.getDescription(false));

        return new ResponseEntity<>(body, HttpStatus.PAYLOAD_TOO_LARGE);
    }
} 