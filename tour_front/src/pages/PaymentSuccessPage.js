import React, { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * PaymentSuccessPage Component
 * Displays confirmation after successful payment
 */
const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Get payment details from location state
  const paymentDetails = location.state?.paymentDetails;

  // Redirect if not authenticated or missing payment details
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!paymentDetails) {
      navigate("/tours");
    }
  }, [isAuthenticated, paymentDetails, navigate]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Vừa xong";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-success text-white py-3">
              <h3 className="h5 mb-0">Thanh Toán Thành Công</h3>
            </div>

            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div
                  className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: "100px", height: "100px" }}
                >
                  <i className="fas fa-check fa-4x"></i>
                </div>{" "}
                <h2 className="h4 mb-1">Cảm Ơn Bạn Đã Đặt Tour!</h2>
                <p className="text-muted">
                  Thanh toán của bạn đã được xử lý thành công.
                </p>
              </div>

              {paymentDetails && (
                <div className="card mb-4 bg-light">
                  <div className="card-body p-4">
                    {" "}
                    <h5 className="mb-3">Chi Tiết Thanh Toán</h5>
                    <div className="row mb-3">
                      <div className="col-md-6 mb-2">
                        <span className="text-muted d-block small">
                          Mã Giao Dịch:
                        </span>
                        <span className="fw-semibold">
                          {paymentDetails.transactionId ||
                            paymentDetails.orderId ||
                            "N/A"}
                        </span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <span className="text-muted d-block small">
                          Số Tiền:
                        </span>
                        <span className="fw-semibold">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(paymentDetails.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <span className="text-muted d-block small">
                          Phương Thức Thanh Toán:
                        </span>
                        <span className="fw-semibold text-capitalize">
                          {paymentDetails.method || "Chuyển Khoản Ngân Hàng"}
                        </span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <span className="text-muted d-block small">Ngày:</span>
                        <span className="fw-semibold">
                          {formatDate(paymentDetails.date)}
                        </span>
                      </div>
                    </div>
                    <div className="alert alert-info mt-3 mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Email xác nhận đã được gửi đến địa chỉ email đã đăng ký
                      của bạn.
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-4">
                <h5 className="mb-3">Bước Tiếp Theo?</h5>
                <div className="d-flex mb-3">
                  <div
                    className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3"
                    style={{ width: "40px", height: "40px", minWidth: "40px" }}
                  >
                    <i className="fas fa-check"></i>
                  </div>
                  <div>
                    <h6 className="mb-1">Xác Nhận Đặt Tour</h6>
                    <p className="text-muted mb-0">
                      Đặt tour của bạn đã được xác nhận và đang chờ phê duyệt từ
                      đội ngũ của chúng tôi.
                    </p>
                  </div>
                </div>

                <div className="d-flex mb-3">
                  <div
                    className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3"
                    style={{ width: "40px", height: "40px", minWidth: "40px" }}
                  >
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div>
                    <h6 className="mb-1">Xác Nhận Qua Email</h6>
                    <p className="text-muted mb-0">
                      Chúng tôi đã gửi một email xác nhận chi tiết với thông tin
                      đặt tour của bạn.
                    </p>
                  </div>
                </div>

                <div className="d-flex">
                  <div
                    className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3"
                    style={{ width: "40px", height: "40px", minWidth: "40px" }}
                  >
                    <i className="fas fa-phone"></i>
                  </div>
                  <div>
                    <h6 className="mb-1">Liên Hệ Từ Đội Ngũ Của Chúng Tôi</h6>
                    <p className="text-muted mb-0">
                      Đội ngũ của chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ
                      để xác nhận tất cả các chi tiết.
                    </p>
                  </div>
                </div>
              </div>
              <div className="d-grid gap-2">
                <Link to="/dashboard/bookings" className="btn btn-primary">
                  Xem Đặt Tour Của Bạn
                </Link>
                <Link to="/tours" className="btn btn-outline-primary">
                  Tìm Thêm Tour Khác
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
