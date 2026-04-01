package dev.tin.tour_back.config;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JWTDecoder {
    private final JWTProperties properties;

    /**
     * Decode and verify a JWT token
     * @param token the JWT token to decode
     * @return decoded JWT
     * @throws JWTVerificationException if token is invalid
     */
    public DecodedJWT decode(String token) {
        return JWT.require(Algorithm.HMAC256(properties.getSecretKey()))
                .build()
                .verify(token);
    }
    
    /**
     * Verify if a token is a refresh token
     * @param token the JWT token to check
     * @return true if token is a refresh token
     */
    public boolean isRefreshToken(String token) {
        try {
            DecodedJWT jwt = decode(token);
            String tokenType = jwt.getClaim("tokenType").asString();
            return "refresh".equals(tokenType);
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Verify if a token is an access token
     * @param token the JWT token to check
     * @return true if token is an access token
     */
    public boolean isAccessToken(String token) {
        try {
            DecodedJWT jwt = decode(token);
            String tokenType = jwt.getClaim("tokenType").asString();
            return "access".equals(tokenType);
        } catch (Exception e) {
            return false;
        }
    }
}
