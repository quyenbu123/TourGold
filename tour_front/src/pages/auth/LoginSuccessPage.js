import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * LoginSuccessPage Component
 * Displayed after successful login, redirects to dashboard after a delay
 */
const LoginSuccessPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Redirect to dashboard after 3 seconds
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const redirectTimer = setTimeout(() => {
      // Redirect to admin dashboard if user is admin, otherwise to user dashboard
      if (user && user.roles && user.roles.includes("ROLE_ADMIN")) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }, 3000);

    return () => clearTimeout(redirectTimer);
  }, [isAuthenticated, navigate, user]);

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="login-success-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-5 text-center">
                <div className="mb-4">
                  <div
                    className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: "80px", height: "80px" }}
                  >
                    <i className="fas fa-check fa-3x"></i>
                  </div>{" "}
                  <h1 className="h3 mb-3">Đăng nhập thành công!</h1>
                  <p className="text-muted mb-4">
                    Chào mừng trở lại,{" "}
                    <strong>{user?.fullName || user?.username}</strong>! Bạn đã
                    đăng nhập thành công.
                  </p>
                  <div className="d-flex align-items-center justify-content-center">
                    <div
                      className="spinner-border spinner-border-sm text-primary me-2"
                      role="status"
                    >
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <span>Đang chuyển hướng đến trang quản lý của bạn...</span>
                  </div>
                </div>

                <div className="d-grid gap-3">
                  {" "}
                  {user && user.roles && user.roles.includes("ROLE_ADMIN") ? (
                    <Link to="/admin" className="btn btn-primary btn-lg">
                      Đến Trang Quản Trị
                    </Link>
                  ) : (
                    <Link to="/dashboard" className="btn btn-primary btn-lg">
                      Đến Trang Quản Lý
                    </Link>
                  )}
                  <Link to="/" className="btn btn-outline-secondary">
                    Quay Lại Trang Chủ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSuccessPage;
