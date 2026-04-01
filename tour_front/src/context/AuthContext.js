import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { isTokenExpired, isTokenStructureValid, extractUserFromToken } from '../utils/jwtUtils';

// Create the auth context
const AuthContext = createContext();

/**
 * AuthProvider Component
 * Provides authentication state and methods to children components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state on load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Check if token is valid
        if (!token || !isTokenStructureValid(token) || isTokenExpired(token)) {          console.warn('Không tìm thấy token hợp lệ trong quá trình khởi tạo');
          setUser(null);
          return;
        }
        
        // Get current user from service
        const currentUser = authService.getCurrentUser();
        
        if (currentUser) {          console.log('Đã tìm thấy xác thực hợp lệ trong localStorage');
          setUser(currentUser);
        } else {
          console.warn('Tìm thấy token nhưng không lấy được dữ liệu người dùng');
          // Attempt to verify auth using service
          const isValid = authService.verifyAuth();
          if (isValid) {
            // Try again to get user after verification
            const verifiedUser = authService.getCurrentUser();
            if (verifiedUser) {
              setUser(verifiedUser);
            } else {
              // Clear invalid auth state
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        }
      } catch (err) {        console.error('Lỗi khởi tạo xác thực:', err);
        setError('Không thể khởi tạo xác thực');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    // Set up a token validation interval
    const validationInterval = setInterval(() => {
      try {
        const token = localStorage.getItem('token');
        // If no token or token is expired, clear user state
        if (!token || isTokenExpired(token)) {
          if (user) {
            console.warn('Token đã hết hạn trong phiên làm việc, đang đăng xuất');
            setUser(null);
            // We don't remove token here to avoid race conditions
          }
        }
      } catch (err) {
        console.error('Lỗi trong khoảng thời gian xác thực token:', err);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(validationInterval);
  }, []);

  /**
   * Login user
   * @param {Object} credentials - User login credentials
   * @returns {Promise} Promise with user data
   */
  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      const data = await authService.login(credentials);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Promise with registration result
   */
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const data = await authService.register(userData);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log user out
   */
  const logout = async () => {
    try {
      setLoading(true);
      
      // Gọi API logout nếu cần
      await authService.logout();
      
      // Xóa user state
      setUser(null);
      console.log('Đã đăng xuất người dùng thành công');
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has specified role
   * @param {string|Array} requiredRoles - Role(s) to check
   * @returns {boolean} True if user has the required role(s)
   */
  const hasRole = (requiredRoles) => {
    if (!user) {
      console.warn('hasRole được gọi khi không có người dùng');
      return false;
    }

    // Kiểm tra nếu user.roles không tồn tại
    if (!user.roles) {
      console.warn('Người dùng không có thuộc tính roles:', user);
      
      // Đặc biệt kiểm tra cho user admin
      if (user.username === 'admin') {
        console.log('Tên người dùng là admin, cấp quyền admin');
        return true;
      }
      
      return false;
    }
    
    // Đảm bảo roles là mảng
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.some(role => {
        // Kiểm tra cả hai dạng role (có hoặc không có prefix ROLE_)
        const normalizedRole = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
        const simpleRole = role.startsWith('ROLE_') ? role.substring(5) : role;
        
        return userRoles.includes(normalizedRole) || userRoles.includes(simpleRole);
      });
    }
    
    // Kiểm tra cả hai dạng role (có hoặc không có prefix ROLE_)
    const normalizedRole = requiredRoles.startsWith('ROLE_') ? requiredRoles : `ROLE_${requiredRoles}`;
    const simpleRole = requiredRoles.startsWith('ROLE_') ? requiredRoles.substring(5) : requiredRoles;
    
    return userRoles.includes(normalizedRole) || userRoles.includes(simpleRole);
  };
  
  /**
   * Check if user is admin
   * @returns {boolean} True if user has admin role
   */
  const isAdmin = () => {
    return authService.isAdmin();
  };
  
  /**
   * Force refresh user state from localStorage
   */
  const refreshUser = () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Lỗi khi làm mới trạng thái người dùng:', err);
      return false;
    }
  };

  // Create context value
  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    logout,
    hasRole,
    isAdmin,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * Custom hook to use authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};

export default AuthContext; 