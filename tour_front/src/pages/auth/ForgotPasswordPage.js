import React, { useState } from "react";
import { Link } from "react-router-dom";
import authService from "../../services/authService";

const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setStatus({ type: "error", message: "Vui lòng nhập email hoặc tên đăng nhập" });
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: "", message: "" });
      await authService.requestPasswordReset(identifier);
      setStatus({
        type: "success",
        message:
          "Nếu tài khoản tồn tại, chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến và thư mục spam.",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.";
      setStatus({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <h1 className="h3 mb-3 fw-normal">Quên mật khẩu</h1>
                  <p className="text-muted">
                    Nhập email hoặc tên đăng nhập của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                  </p>
                </div>

                {status.message && (
                  <div
                    className={`alert ${
                      status.type === "success" ? "alert-success" : "alert-danger"
                    }`}
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

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="identifier" className="form-label">
                      Email hoặc tên đăng nhập
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-envelope"></i>
                      </span>
                      <input
                        type="text"
                        id="identifier"
                        className="form-control"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        placeholder="Nhập email hoặc tên đăng nhập"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div className="d-grid">
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Đang gửi...
                        </>
                      ) : (
                        "Gửi hướng dẫn"
                      )}
                    </button>
                  </div>
                </form>

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

export default ForgotPasswordPage;
