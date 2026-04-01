import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { isDemoMode } from '../../services/api';
import { 
  hasRoleFromToken, 
  isAdminFromToken, 
  isTokenExpired, 
  isTokenStructureValid,
  extractUserFromToken
} from '../../utils/jwtUtils';
import authService from '../../services/authService';

/**
 * ProtectedRoute Component
 * Wraps routes that should only be accessible to authenticated users
 * 
 * @param {Object} props - Component props
 * @param {Array|string} props.requiredRoles - Optional roles required to access this route
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (default: /login)
 */
const ProtectedRoute = ({
  children,
  requiredRoles,
  redirectTo = '/login'
}) => {
  const { isAuthenticated, loading, user, hasRole } = useAuth();
  const location = useLocation();

  // Get token and validate
  const token = localStorage.getItem('token');
  const hasToken = !!token;
  const isTokenValid = hasToken && 
                       isTokenStructureValid(token) && 
                       !isTokenExpired(token);
  
  // Check if this is an admin route
  const isAdminRoute = location.pathname.includes('/admin/');
  
  // Kiểm tra quyền truy cập từ token trước
  const hasRequiredRoleFromToken = requiredRoles && hasToken ? 
    (() => {
      try {
        // For demo mode, always return true
        if (isDemoMode) return true;
        
        if (!isTokenValid) return false;
        
        // Lấy user từ token
        const tokenUser = extractUserFromToken(token);
        if (!tokenUser) return false;
        
        // Nếu là admin route và user là admin, cho phép
        if (isAdminRoute && 
            (tokenUser.isAdmin || 
             tokenUser.username === 'admin' || 
             (tokenUser.roles && 
              (tokenUser.roles.includes('ADMIN') || tokenUser.roles.includes('ROLE_ADMIN'))))) {
          return true;
        }
        
        // Kiểm tra roles cụ thể
        return Array.isArray(requiredRoles) 
          ? requiredRoles.some(role => hasRoleFromToken(token, role))
          : hasRoleFromToken(token, requiredRoles);
      } catch (error) {
        console.error('Lỗi kiểm tra vai trò từ token:', error);
        return false;
      }
    })() : false;
  
  // Check admin status from token
  const isAdminFromJWT = hasToken ? 
    (() => {
      try {
        // For demo mode, always return true
        if (isDemoMode) return true;
        
        if (!isTokenValid) return false;
        
        return isAdminFromToken(token);
      } catch (error) {
        console.error('Lỗi kiểm tra vai trò admin từ token:', error);
        return false;
      }
    })() : false;
  
  // Allow admin access in demo mode
  const allowDemoAccess = isDemoMode && isAdminRoute && hasToken;

  // Debug logging for development only
  if (process.env.NODE_ENV === 'development') {
    console.log('ProtectedRoute Status:', { 
      path: location.pathname,
      isAuthenticated, 
      userId: user?.id,
      username: user?.username,
      userRoles: user?.roles,
      requiredRoles,
      hasRequiredRole: requiredRoles ? hasRole(requiredRoles) : true,
      token: hasToken,
      isTokenValid,
      hasRequiredRoleFromToken,
      isAdminFromJWT,
      demoMode: isDemoMode,
      allowDemoAccess
    });
  }
  // Verify auth once more using our service
  useEffect(() => {
    if (hasToken && !isAuthenticated) {
      console.warn('Token tồn tại nhưng ngữ cảnh xác thực chưa sẵn sàng - đang xác minh trực tiếp');
      const isValidAuth = authService.verifyAuth();
      
      if (isValidAuth) {
        console.log('Xác thực từ dịch vụ thành công, tiếp tục truy cập');
      } else {
        console.warn('Xác thực từ dịch vụ thất bại');
      }
    }
  }, [isAdminRoute, hasToken, isAuthenticated, loading]);
  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Đang xác thực quyền truy cập..." />;
  }
  // Demo mode with token - allow access
  if (allowDemoAccess) {
    console.log('Chế độ demo - cho phép truy cập vào khu vực admin với token');
    return children;
  }
  // Token is valid but context not ready - try to extract user from token
  if (!isAuthenticated && isTokenValid) {
    console.log('Token hợp lệ nhưng context chưa sẵn sàng - kiểm tra vai trò từ token');
    
    if (requiredRoles) {
      if (isAdminRoute && isAdminFromJWT) {
        return children;
      } else if (hasRequiredRoleFromToken) {
        return children;
      } else {
        console.warn('Truy cập bị từ chối: Token hợp lệ nhưng thiếu vai trò yêu cầu');
        return <Navigate to="/unauthorized" state={{ from: location }} replace />;
      }
    }
    
    // No specific roles required, valid token is enough
    return children;
  }
  // No authentication at all - redirect to login
  if (!isAuthenticated && !isTokenValid && !allowDemoAccess) {
    console.warn('Truy cập bị từ chối: Chưa đăng nhập');
    
    // Add query param to indicate session expired if token exists but is invalid
    const loginRedirect = hasToken && !isTokenValid ? 
      `${redirectTo}?session=expired` : 
      redirectTo;
      
    return (
      <Navigate 
        to={loginRedirect} 
        state={{ 
          from: location, 
          message: "Vui lòng đăng nhập để truy cập trang này" 
        }} 
        replace 
      />
    );
  }

  // Special handling for admin routes
  if (isAdminRoute || 
      (requiredRoles && (requiredRoles.includes('ADMIN') || requiredRoles.includes('ROLE_ADMIN')))) {
    // Check admin access through multiple methods in priority order
    if (      user?.username === 'admin' || 
      isAdminFromJWT || 
      hasRole('ADMIN') || 
      (hasToken && isDemoMode)
    ) {
      console.log('Quyền truy cập admin được cấp');
      return children;
    }
    
    // If admin required but not admin, redirect to unauthorized
    console.warn('Quyền truy cập admin bị từ chối cho người dùng:', user?.username);
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }
  // Check for any other required roles
  if (requiredRoles && !allowDemoAccess) {
    // First check token-based role
    if (hasRequiredRoleFromToken) {
      console.log('Tìm thấy vai trò yêu cầu trong token');
      return children;
    }
    
    // Then check context-based role
    if (!hasRole(requiredRoles)) {
      console.warn('Truy cập bị từ chối: Thiếu vai trò cần thiết', {
        path: location.pathname,
        username: user?.username,
        userRoles: user?.roles,
        requiredRoles
      });
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  // Access granted for authenticated user
  return children;
};

export default ProtectedRoute; 