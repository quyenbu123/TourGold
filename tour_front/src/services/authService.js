import api, { isDemoMode } from './api';
import { 
  decodeToken, 
  getRolesFromToken, 
  hasRoleFromToken, 
  isAdminFromToken, 
  isTokenExpired, 
  getUserIdFromToken, 
  getUserIdentifierFromToken,
  isTokenStructureValid,
  extractUserFromToken,
  getTokenRemainingTime
} from '../utils/jwtUtils';

// Retry queue for failed requests due to auth issues
const retryQueue = [];
let isRefreshing = false;
let refreshTokenTimeout = null;

/**
 * Service for authentication-related API calls
 */
const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Promise with response data
   */
  register: async (userData) => {
    try {
      const response = await api.post('/api/v1/register', userData);
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  /**
   * Gửi yêu cầu đặt lại mật khẩu tới máy chủ
   * @param {string|Object} identifier - Email hoặc tên đăng nhập, có thể truyền trực tiếp hoặc dạng object { identifier, emailPreferred }
   */
  requestPasswordReset: async (identifier) => {
    try {
      const payload = typeof identifier === 'string'
        ? { identifier: identifier.trim() }
        : {
            identifier: identifier?.identifier?.trim() || '',
            emailPreferred: Boolean(identifier?.emailPreferred),
          };

      if (!payload.identifier) {
        throw new Error('Vui lòng nhập email hoặc tên đăng nhập');
      }

      const response = await api.post('/api/v1/auth/forgot-password', payload);
      return response.data;
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  },

  /**
   * Kiểm tra token đặt lại mật khẩu còn hợp lệ không
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  validateResetToken: async (token) => {
    if (!token) {
      return false;
    }
    try {
      const response = await api.get('/api/v1/auth/reset-password/validate', {
        params: { token },
      });
      return response.data?.valid === true;
    } catch (error) {
      console.error('Error validating reset token:', error);
      return false;
    }
  },

  /**
   * Đặt lại mật khẩu bằng token hợp lệ
   * @param {{token: string, newPassword: string}} payload
   */
  resetPassword: async ({ token, newPassword }) => {
    if (!token || !newPassword) {
      throw new Error('Thiếu token hoặc mật khẩu mới');
    }
    try {
      const response = await api.post('/api/v1/auth/reset-password', {
        token,
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  /**
   * Login user
   * @param {Object} credentials - User login credentials
   * @returns {Promise} Promise with response data
   */
  login: async (credentials) => {
    try {
      console.log('Login attempt with:', credentials.loginIdentifier);
      
      // Gọi API đăng nhập
      const response = await api.post('/api/v1/auth/login', {
        loginIdentifier: credentials.loginIdentifier,
        password: credentials.password
      });
      
      console.log('Login response:', response.data);
      
      // Kiểm tra response có token không
      if (!response.data.token) {
        throw new Error('Đăng nhập thành công nhưng không nhận được token');
      }
      
      // Xác thực tính hợp lệ của token
      const token = response.data.token;
      if (!isTokenStructureValid(token)) {
        console.error('Invalid token structure received from server');
        throw new Error('Token không hợp lệ, vui lòng thử lại');
      }
      
      // Nếu response đã có user data, sử dụng nó
      let userData = response.data.user;
      
      // Nếu không có user data từ server, trích xuất từ token
      if (!userData) {
        userData = extractUserFromToken(token);
        console.log('User data extracted from token:', userData);
      }
      
      // Đảm bảo tài khoản admin luôn có quyền admin
      if (credentials.loginIdentifier === 'admin' && (!userData.roles || !userData.roles.includes('ROLE_ADMIN'))) {
        console.log('Adding admin role to user data');
        userData.roles = userData.roles || [];
        if (!userData.roles.includes('ROLE_ADMIN')) {
          userData.roles.push('ROLE_ADMIN');
        }
      }
      
      // Log thông tin user
      console.log('User data after processing:', userData);
      
      // Lưu token và thông tin người dùng vào localStorage
      localStorage.setItem('token', token);
      
      // Lưu refresh token nếu server trả về
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set up token refresh
      if (response.data.expiresIn) {
        authService.setupTokenRefresh(response.data.expiresIn);
      }
      
      // Xử lý retry queue nếu có
      authService.processRetryQueue();
      
      return {...response.data, user: userData};
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  /**
   * Login with Google ID token
   * @param {string} idToken - Google ID token from GIS
   */
  loginWithGoogle: async (idToken) => {
    try {
      const response = await api.post('/api/v1/auth/google', { idToken });
      if (!response.data || !response.data.token) {
        throw new Error('Đăng nhập Google thành công nhưng không nhận được token');
      }
      const { token, refreshToken, user, expiresIn } = response.data;
      if (!isTokenStructureValid(token)) {
        throw new Error('Token không hợp lệ từ máy chủ');
      }
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      if (expiresIn) authService.setupTokenRefresh(expiresIn);
      authService.processRetryQueue();
      return response.data;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    try {
      // Clear refresh timer
      if (refreshTokenTimeout) {
        clearTimeout(refreshTokenTimeout);
        refreshTokenTimeout = null;
      }
      
      // Xóa token và thông tin user khỏi localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Xóa hàng đợi retry
      retryQueue.length = 0;
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },

  /**
   * Process retry queue after token refresh
   */
  processRetryQueue: () => {
    // Nếu có các yêu cầu đang chờ, thực hiện lại
    if (retryQueue.length > 0) {
      console.log(`Processing retry queue with ${retryQueue.length} requests`);
      
      // Xử lý mỗi yêu cầu trong hàng đợi
      retryQueue.forEach(request => {
        try {
          request.resolve();
        } catch (e) {
          request.reject(e);
        }
      });
      
      // Xóa hàng đợi
      retryQueue.length = 0;
    }
    
    isRefreshing = false;
  },

  /**
   * Set up token refresh before expiration
   * @param {number} expiresIn - Token expiration time in seconds
   */
  setupTokenRefresh: (expiresIn) => {
    try {
      // Clear any existing refresh timeout
      if (refreshTokenTimeout) {
        clearTimeout(refreshTokenTimeout);
        refreshTokenTimeout = null;
      }
      
      const expiresInMs = expiresIn * 1000;
      // Refresh token when 75% of its lifetime has passed
      const refreshTime = expiresInMs * 0.75;
      
      console.log(`Setting up token refresh in ${Math.round(refreshTime / 1000)} seconds`);
      
      refreshTokenTimeout = setTimeout(async () => {
        try {
          // Don't refresh if there's no refresh token
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            console.warn('No refresh token available for automatic refresh');
            return;
          }
          
          console.log('Automatically refreshing token before expiration');
          isRefreshing = true;
          
          // Call refresh token API
          const response = await api.post('/api/v1/auth/refresh-token', { token: refreshToken });
          
          if (response.data && response.data.token) {
            localStorage.setItem('token', response.data.token);
            
            // Store new refresh token if provided
            if (response.data.refreshToken) {
              localStorage.setItem('refreshToken', response.data.refreshToken);
            }
            
            // Setup next refresh if expiration time is provided
            if (response.data.expiresIn) {
              authService.setupTokenRefresh(response.data.expiresIn);
            }
            
            // Process any pending requests
            authService.processRetryQueue();
            console.log('Token refreshed successfully');
          } else {
            console.error('Token refresh response did not contain a valid token');
            throw new Error('Invalid token refresh response');
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
          isRefreshing = false;
        }
      }, refreshTime);
    } catch (error) {
      console.error('Error setting up token refresh:', error);
    }
  },

  /**
   * Add failed request to retry queue
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  addToRetryQueue: (resolve, reject) => {
    retryQueue.push({ resolve, reject });
  },

  /**
   * Get current user
   * @returns {Object} Current user or null
   */
  getCurrentUser: () => {
    try {
      // Kiểm tra token trước
      const token = localStorage.getItem('token');
      if (!token || isTokenExpired(token)) {
        console.warn('Invalid or expired token during getCurrentUser');
        // Clear potentially stale/invalid user data if token is bad
        localStorage.removeItem('user');
        return null;
      }
      
      const userString = localStorage.getItem('user');
      
      // Nếu có dữ liệu user trong localStorage, sử dụng nó
      if (userString) {
        try {
          const user = JSON.parse(userString);
          
          // --- Thêm logic kiểm tra và xác thực user ID --- start
          let userId = null;
          if (user && (user.id || user.userId)) {
             userId = user.id || user.userId;
          }

          // Kiểm tra userId có tồn tại và là số hợp lệ không
          const parsedUserId = parseInt(userId);
          if (userId !== null && !isNaN(parsedUserId) && parsedUserId > 0) {
              // User data is valid, return it
              console.log('Successfully retrieved and validated user from localStorage:', user);
              // Ensure the user object returned includes the numeric id for consistency
              return { ...user, id: parsedUserId, userId: parsedUserId };
          } else {
              // Invalid user data found
              console.error('Invalid user data found in localStorage:', user);
              console.warn('Clearing invalid user data from localStorage.');
              localStorage.removeItem('user'); // Clear the invalid data
              return null;
          }
          // --- Thêm logic kiểm tra và xác thực user ID --- end

        } catch (e) {
          console.error('Error parsing user data from localStorage:', e);
          // Clear potentially corrupt data
          localStorage.removeItem('user');
          return null;
        }
      }
      
      console.log('No user data found in localStorage.');
      return null;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      // Clear potentially corrupt data in case of unexpected errors
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated: () => {
    // Demo mode always authenticated with token
    if (isDemoMode && localStorage.getItem('token')) {
      return true;
    }
    
    const token = localStorage.getItem('token');
    // Nếu không có token, không xác thực
    if (!token) return false;
    
    // Kiểm tra token có hết hạn không
    if (isTokenExpired(token)) {
      console.warn('Token expired');
      return false;
    }
    
    return true;
  },
  
  /**
   * Check if user has a specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has the role
   */
  hasRole: (role) => {
    try {
      // Demo mode always has roles
      if (isDemoMode) {
        return true;
      }
      
      // Kiểm tra từ token trước
      const token = localStorage.getItem('token');
      if (token) {
        const hasRoleInToken = hasRoleFromToken(token, role);
        if (hasRoleInToken) {
          return true;
        }
      }
      
      // Nếu không tìm thấy trong token, kiểm tra từ user data
      const user = authService.getCurrentUser();
      if (!user || !user.roles) return false;
      
      // Kiểm tra cả hai format của role (với hoặc không có prefix ROLE_)
      if (role.startsWith('ROLE_')) {
        return user.roles.includes(role) || user.roles.includes(role.substring(5));
      } else {
        return user.roles.includes(role) || user.roles.includes(`ROLE_${role}`);
      }
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  },
  
  /**
   * Check if user has admin role
   * @returns {boolean} True if user is admin
   */
  isAdmin: () => {
    try {
      // Demo mode is always admin with token
      if (isDemoMode && localStorage.getItem('token')) {
        console.log('Demo mode detected, granting admin privileges');
        return true;
      }
      
      // Kiểm tra từ token trước
      const token = localStorage.getItem('token');
      if (token) {
        const isAdminInToken = isAdminFromToken(token);
        if (isAdminInToken) {
          console.log('Admin role found in token');
          return true;
        }
      }
      
      const user = authService.getCurrentUser();
      
      // Nếu không có user, trả về false
      if (!user) {
        console.warn('isAdmin called with no user data');
        return false;
      }
      
      // Kiểm tra cụ thể cho admin username
      if (user.username === 'admin') {
        console.log('Username is admin, granting admin privileges');
        return true;
      }
      
      // Kiểm tra từ roles
      if (!user.roles) {
        console.warn('User has no roles property');
        return false;
      }
      
      return authService.hasRole('ADMIN') || authService.hasRole('ROLE_ADMIN');
    } catch (error) {
      console.error('Error in isAdmin check:', error);
      return false; // Fail safe - không cho phép admin khi có lỗi
    }
  },
  
  /**
   * Update user profile
   * @param {Object} userData - Updated user data
   * @returns {Promise} Promise with response data
   */
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/api/v1/users/profile', userData);
      
      // Update stored user data if update is successful
      if (response.data) {
        const currentUser = authService.getCurrentUser();
        const updatedUser = { ...currentUser, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  /**
   * Change password
   * @param {Object} passwordData - Password change data (oldPassword, newPassword)
   * @returns {Promise} Promise with response data
   */
  changePassword: async (passwordData) => {
    try {
      const response = await api.put('/api/v1/users/password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },
  
  /**
   * Verify current authentication state is valid
   * @returns {boolean} True if authentication is valid
   */
  verifyAuth: () => {
    try {
      // Check if demo mode
      if (isDemoMode && localStorage.getItem('token')) {
        return true;
      }
      
      // Check token
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      // Check token format and expiration
      if (!isTokenStructureValid(token) || isTokenExpired(token)) {
        return false;
      }
      
      // Check if we can get user data from token
      const userData = extractUserFromToken(token);
      return !!userData;
    } catch (error) {
      console.error('Error verifying authentication:', error);
      return false;
    }
  }
};

export default authService; 