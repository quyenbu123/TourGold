import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";

/**
 * LoginPage Component
 * Allows users to log in to their account
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error: authError, refreshUser } = useAuth();

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get redirect path from location state or default to home
  const from = location.state?.from || "/";
  const message = location.state?.message || "";
  // Check for session expired message from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionExpired = params.get("session");

    if (sessionExpired === "expired") {
      setError("Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }, [location.search]);

  // If user is already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Form validation
    if (!username.trim() || !password) {
      setError("Tên đăng nhập và mật khẩu là bắt buộc");
      return;
    }

    try {
      setError("");
      setLoading(true);

      // Gửi đúng tham số như backend yêu cầu (loginIdentifier thay vì username)
      await login({
        loginIdentifier: username,
        password: password,
      });

      // Authentication successful, redirect
      navigate("/login-success", {
        state: { from: from },
        replace: true,
      });
    } catch (err) {
      let errorMessage =
        "Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập của bạn.";

      if (err.message && err.message.includes("Network Error")) {
        errorMessage = "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (authError) {
        errorMessage = authError;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                {" "}
                <div className="text-center mb-4">
                  <h1 className="h3 mb-3 fw-normal">Chào mừng trở lại!</h1>
                  <p className="text-muted">
                    Đăng nhập để truy cập tài khoản của bạn
                  </p>
                </div>
                {message && (
                  <div className="alert alert-info mb-4" role="alert">
                    <i className="fas fa-info-circle me-2"></i>
                    {message}
                  </div>
                )}
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  {" "}
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Email hoặc Tên đăng nhập
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-user"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nhập email hoặc tên đăng nhập của bạn"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label htmlFor="password" className="form-label mb-0">
                        Mật khẩu
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-decoration-none small"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-lock"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu của bạn"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="rememberMe"
                    />{" "}
                    <label className="form-check-label" htmlFor="rememberMe">
                      Ghi nhớ đăng nhập
                    </label>
                  </div>
                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading}
                    >
                      {" "}
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Đang đăng nhập...
                        </>
                      ) : (
                        "Đăng nhập"
                      )}
                    </button>
                  </div>
                </form>
                <div className="my-3 d-flex align-items-center">
                  <div className="flex-grow-1" style={{height:1, background:'#e0e0e0'}}></div>
                  <span className="mx-3 text-muted">Hoặc</span>
                  <div className="flex-grow-1" style={{height:1, background:'#e0e0e0'}}></div>
                </div>
                <div className="d-grid justify-content-center">
                  <GoogleSignInButton 
                    onSuccess={async () => {
                      try {
                        // Immediately sync AuthContext with the new token/user in localStorage
                        const ok = refreshUser && (await refreshUser());
                        // Navigate to success page (or back to origin path)
                        navigate("/login-success", { state: { from: from }, replace: true });
                      } catch (e) {
                        // Even if refresh fails for some reason, still navigate and let init run on that page
                        navigate("/login-success", { state: { from: from }, replace: true });
                      }
                    }}
                    onError={(err) => setError(err?.response?.data?.message || err?.message || 'Đăng nhập Google thất bại')}
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="mb-0">
                    Chưa có tài khoản?{" "}
                    <Link to="/register" className="text-decoration-none">
                      Đăng ký
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
