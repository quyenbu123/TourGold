import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import authService from "../../services/authService";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [tokenValid, setTokenValid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState(null);

  const token = searchParams.get("token") || "";

  useEffect(() => {
    let isMounted = true;
    const validate = async () => {
      if (!token) {
        setTokenValid(false);
        return;
      }

      setTokenValid(null);
      const valid = await authService.validateResetToken(token);
      if (isMounted) {
        setTokenValid(valid);
        if (!valid) {
          setStatus({
            type: "error",
            message: "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.",
          });
        }
      }
    };

    validate();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setStatus({ type: "error", message: "Thiếu token đặt lại mật khẩu" });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: "error", message: "Mật khẩu phải có ít nhất 6 ký tự" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Mật khẩu xác nhận không khớp" });
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: "", message: "" });
      await authService.resetPassword({ token, newPassword });
      setStatus({ type: "success", message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ." });
      const timerId = setTimeout(() => navigate("/login"), 2000);
      setRedirectTimer(timerId);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
      setStatus({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

  const renderContent = () => {
    if (tokenValid === null) {
      return (
        <div className="text-center text-muted py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Đang kiểm tra token đặt lại mật khẩu...</p>
        </div>
      );
    }

    if (!tokenValid) {
      return (
        <div className="text-center py-4">
          <i className="fas fa-times-circle fa-3x text-danger mb-3"></i>
          <h2 className="h4">Token không hợp lệ</h2>
          <p className="text-muted">
            Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.
          </p>
          <Link to="/forgot-password" className="btn btn-outline-primary">
            Yêu cầu lại
          </Link>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="newPassword" className="form-label">
            Mật khẩu mới
          </label>
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-lock"></i>
            </span>
            <input
              type="password"
              id="newPassword"
              className="form-control"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nhập mật khẩu mới"
              minLength={6}
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="confirmPassword" className="form-label">
            Xác nhận mật khẩu
          </label>
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-lock"></i>
            </span>
            <input
              type="password"
              id="confirmPassword"
              className="form-control"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              minLength={6}
              required
            />
          </div>
        </div>

        <div className="d-grid">
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang cập nhật...
              </>
            ) : (
              "Cập nhật mật khẩu"
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="reset-password-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <h1 className="h3 mb-3 fw-normal">Đặt lại mật khẩu</h1>
                  <p className="text-muted">
                    Nhập mật khẩu mới cho tài khoản của bạn.
                  </p>
                </div>

                {status.message && (
                  <div
                    className={`alert ${status.type === "success" ? "alert-success" : "alert-danger"}`}
                    role="alert"
                  >
                    {status.type === "success" ? (
                      <i className="fas fa-check-circle me-2"></i>
                    ) : (
                      <i className="fas fa-exclamation-circle me-2"></i>
                    )}
                    {status.message}
                  </div>
                )}

                {renderContent()}

                <div className="mt-4 text-center">
                  <Link to="/login" className="text-decoration-none">
                    <i className="fas fa-arrow-left me-2"></i>Quay lại đăng nhập
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

export default ResetPasswordPage;
