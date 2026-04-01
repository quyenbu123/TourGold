import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * UnauthorizedPage Component
 * Displayed when a user tries to access a restricted page
 */
const UnauthorizedPage = () => {
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  return (
    <div className="unauthorized-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-5 text-center">
                <div className="mb-4">
                  <div
                    className="bg-danger text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: "80px", height: "80px" }}
                  >
                    <i className="fas fa-lock fa-3x"></i>
                  </div>{" "}
                  <h1 className="h3 mb-3">Từ Chối Truy Cập</h1>
                  <p className="text-muted">
                    Bạn không có quyền truy cập trang này. Khu vực này chỉ dành
                    cho người dùng được ủy quyền.
                  </p>
                </div>

                <div className="d-grid gap-3">
                  {" "}
                  <Link to="/" className="btn btn-primary btn-lg">
                    Quay Lại Trang Chủ
                  </Link>
                  {from !== "/" && (
                    <Link to={from} className="btn btn-outline-secondary">
                      Quay Lại
                    </Link>
                  )}
                  <Link to="/login" className="btn btn-outline-primary">
                    Đăng Nhập Với Tài Khoản Khác
                  </Link>
                </div>

                <div className="mt-4">
                  {" "}
                  <p className="small text-muted mb-0">
                    Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ với đội ngũ hỗ
                    trợ của chúng tôi để được trợ giúp.
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

export default UnauthorizedPage;
