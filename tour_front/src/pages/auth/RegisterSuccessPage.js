import React from "react";
import { Link, useLocation, Navigate } from "react-router-dom";

/**
 * RegisterSuccessPage Component
 * Displayed after successful user registration
 */
const RegisterSuccessPage = () => {
  const location = useLocation();
  const email = location.state?.email;

  // If no email was provided in location state, redirect to register page
  if (!email) {
    return <Navigate to="/register" replace />;
  }

  return (
    <div className="register-success-page py-5">
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
                  <h1 className="h3 mb-3">Đăng Ký Thành Công!</h1>
                  <p className="text-muted">
                    Cảm ơn bạn đã đăng ký với Tour Gold. Tài khoản của bạn đã
                    được tạo thành công.
                  </p>
                  <p className="mb-0">
                    Một email xác nhận đã được gửi đến <strong>{email}</strong>.
                    Vui lòng kiểm tra hộp thư đến của bạn và làm theo hướng dẫn
                    để xác thực địa chỉ email của bạn.
                  </p>
                </div>

                <div className="d-grid gap-3">
                  {" "}
                  <Link to="/login" className="btn btn-primary btn-lg">
                    Tiếp Tục Đến Đăng Nhập
                  </Link>
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

export default RegisterSuccessPage;
