/**
 * Utilities for JWT token handling
 */

/**
 * Decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null;

    // Split the token
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) return null;

    // Decode the payload (2nd part)
    const base64Url = tokenParts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT token:", error);
    return null;
  }
};

/**
 * Parse a JWT token and extract the payload
 * @param {string} token - JWT token
 * @returns {Object|null} Parsed token payload or null if invalid
 */
export const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error parsing JWT token:", e);
    return null;
  }
};

/**
 * Get user ID from JWT token
 * @param {string} token - JWT token
 * @returns {number|null} User ID from token or null if not found
 */
export const getUserIdFromToken = (token) => {
  try {
    const decoded = parseJwt(token);
    if (!decoded) return null;

    // Handle different JWT formats
    if (decoded.sub) {
      return parseInt(decoded.sub, 10);
    }

    if (decoded.userId) {
      return parseInt(decoded.userId, 10);
    }

    if (decoded.id) {
      return parseInt(decoded.id, 10);
    }

    return null;
  } catch (e) {
    console.error("Error getting user ID from token:", e);
    return null;
  }
};

/**
 * Get user roles from token
 * @param {string} token - JWT token
 * @returns {Array} Array of roles
 */
export const getRolesFromToken = (token) => {
  try {
    const payload = decodeToken(token);
    if (!payload) return [];

    // JWT might store roles in different claims
    // Check multiple possible fields for roles
    const roles =
      payload.au ||
      payload.authorities ||
      payload.roles ||
      payload.scope?.split(" ") ||
      payload.perms ||
      payload.groups ||
      payload.role ||
      [];

    // Convert to array if it's not already
    return Array.isArray(roles) ? roles : [roles];
  } catch (error) {
    console.error("Error extracting roles from token:", error);
    return [];
  }
};

/**
 * Check if token has a specific role
 * @param {string} token - JWT token
 * @param {string|Array} rolesToCheck - Role(s) to check for
 * @returns {boolean} True if token has the role
 */
export const hasRoleFromToken = (token, rolesToCheck) => {
  try {
    const roles = getRolesFromToken(token);

    if (roles.length === 0) return false;

    // Special case for demo mode
    if (localStorage.getItem("demoMode") === "true") {
      console.log("Demo mode detected, allowing roles");
      return true;
    }

    // Handle case when checking multiple roles (any match is success)
    if (Array.isArray(rolesToCheck)) {
      return rolesToCheck.some((role) => {
        const normalizedRole = role.startsWith("ROLE_") ? role : `ROLE_${role}`;
        const simpleRole = role.startsWith("ROLE_") ? role.substring(5) : role;

        return roles.includes(normalizedRole) || roles.includes(simpleRole);
      });
    }

    // Check for a single role
    const normalizedRole = rolesToCheck.startsWith("ROLE_")
      ? rolesToCheck
      : `ROLE_${rolesToCheck}`;
    const simpleRole = rolesToCheck.startsWith("ROLE_")
      ? rolesToCheck.substring(5)
      : rolesToCheck;

    return roles.includes(normalizedRole) || roles.includes(simpleRole);
  } catch (error) {
    console.error("Error checking roles from token:", error);
    return false;
  }
};

/**
 * Check if token has admin role
 * @param {string} token - JWT token
 * @returns {boolean} True if token has admin role
 */
export const isAdminFromToken = (token) => {
  try {
    // Special case for demo mode
    if (localStorage.getItem("demoMode") === "true") {
      console.log("Demo mode detected, granting admin privileges");
      return true;
    }

    const payload = decodeToken(token);
    if (!payload) return false;

    // Special cases for common admin identifiers
    if (
      payload.username === "admin" ||
      payload.preferred_username === "admin"
    ) {
      return true;
    }

    return hasRoleFromToken(token, ["ADMIN", "ROLE_ADMIN"]);
  } catch (error) {
    console.error("Error checking admin role from token:", error);
    return false;
  }
};

/**
 * Get user name/email from token
 * @param {string} token - JWT token
 * @returns {string|null} Username or email or null if not found
 */
export const getUserIdentifierFromToken = (token) => {
  try {
    const payload = decodeToken(token);
    if (!payload) return null;

    // Check various claims that might contain user identifier
    return (
      payload.username ||
      payload.preferred_username ||
      payload.e ||
      payload.email ||
      payload.name ||
      null
    );
  } catch (error) {
    console.error("Error extracting user identifier from token:", error);
    return null;
  }
};

/**
 * Get username from token
 * @param {string} token - JWT token
 * @returns {string|null} Username or null if not found
 */
export const getUsernameFromToken = (token) => {
  try {
    const payload = decodeToken(token);
    if (!payload) return null;

    // Ưu tiên các trường username trước
    return (
      payload.username ||
      payload.preferred_username ||
      payload.login ||
      payload.user ||
      null
    );
  } catch (error) {
    console.error("Error extracting username from token:", error);
    return null;
  }
};

/**
 * Extract full user data from token
 * @param {string} token - JWT token
 * @returns {Object|null} User data object or null if invalid token
 */
export const extractUserFromToken = (token) => {
  try {
    const payload = decodeToken(token);
    if (!payload) return null;

    // Build a user object from token claims
    return {
      id: getUserIdFromToken(token),
      username:
        getUsernameFromToken(token) || getUserIdentifierFromToken(token),
      email: payload.e || payload.email || payload.mail,
      roles: getRolesFromToken(token),
      tokenType: payload.tokenType || "access",
      isAdmin: isAdminFromToken(token),
    };
  } catch (error) {
    console.error("Error extracting user data from token:", error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return true;

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    // Add a small buffer (5 seconds) to account for clock differences
    return currentTime >= expirationTime - 5000;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // Assume expired on error
  }
};

/**
 * Calculate remaining time in seconds before token expires
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiration, 0 if expired or invalid
 */
export const getTokenRemainingTime = (token) => {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return 0;

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    if (currentTime >= expirationTime) return 0;

    return Math.floor((expirationTime - currentTime) / 1000);
  } catch (error) {
    console.error("Error calculating token remaining time:", error);
    return 0;
  }
};

/**
 * Validate token structure and basic claims
 * @param {string} token - JWT token
 * @returns {boolean} True if token structure is valid
 */
export const isTokenStructureValid = (token) => {
  try {
    if (!token) return false;

    // Check token format (should have 3 parts separated by dots)
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Decode and check payload
    const payload = decodeToken(token);
    if (!payload) return false;

    // Token should have at least some standard claims
    return !!(payload.sub || payload.iat || payload.exp);
  } catch (error) {
    console.error("Error validating token structure:", error);
    return false;
  }
};
