import React, { useState } from "react";
import { Link } from "react-router-dom";
import paymentService from "../services/paymentService";

/**
 * TestPaymentPage Component
 * A utility page for simulating payments during Casso maintenance
 */
const TestPaymentPage = () => {
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      setError("Vui lòng nhập mã đặt tour");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convert inputs to numbers
      const bookingIdNum = parseInt(bookingId);
      const amountNum = amount ? parseInt(amount) : null;

      console.log(
        `Simulating payment for booking ID: ${bookingIdNum}, amount: ${
          amountNum || "default"
        }`
      );

      const response = await paymentService.simulatePayment(
        bookingIdNum,
        amountNum
      );

      setResult(response);

      if (
        response &&
        response.error === 0 &&
        response.data &&
        response.data.records
      ) {
        console.log("Mock payment created successfully:", response);
      } else {
        setError(
          "Không thể mô phỏng thanh toán. Vui lòng kiểm tra phản hồi từ máy chủ."
        );
      }
    } catch (err) {
      console.error("Error simulating payment:", err);
      setError("Lỗi: " + (err.message || "Không rõ nguyên nhân"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white py-3">
              <h3 className="h5 mb-0">Mô Phỏng Thanh Toán Thử Nghiệm</h3>
            </div>

            <div className="card-body p-4">
              <div className="alert alert-warning mb-4">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <strong>Chỉ Dùng Để Thử Nghiệm:</strong> Trang này chỉ dành cho
                mục đích kiểm tra trong thời gian API Casso đang bảo trì.
              </div>

              {error && (
                <div className="alert alert-danger mb-4">
                  <i className="fas fa-times-circle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  {" "}
                  <label htmlFor="bookingId" className="form-label">
                    Mã Đặt Tour <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="bookingId"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    placeholder="Nhập mã số đặt tour"
                    required
                  />
                </div>

                <div className="mb-3">
                  {" "}
                  <label htmlFor="amount" className="form-label">
                    Số Tiền (tùy chọn)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Để trống để dùng số tiền mặc định"
                    />
                    <span className="input-group-text">VND</span>
                  </div>
                  <div className="form-text">
                    Nếu để trống, số tiền mặc định sẽ được sử dụng.
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>{" "}
                        Đang Mô Phỏng Thanh Toán...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-bolt me-2"></i>
                        Mô Phỏng Thanh Toán
                      </>
                    )}
                  </button>

                  <Link to="/dashboard" className="btn btn-outline-secondary">
                    <i className="fas fa-arrow-left me-2"></i>
                    Quay Lại Bảng Điều Khiển
                  </Link>
                </div>
              </form>

              {result && (
                <div className="mt-4">
                  <h5 className="h6 mb-3">Kết Quả Mô Phỏng:</h5>
                  <div className="card bg-light">
                    <div className="card-body p-3">
                      <pre
                        style={{
                          backgroundColor: "#f8f9fa",
                          padding: "1rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.875rem",
                          overflow: "auto",
                          maxHeight: "200px",
                        }}
                      >
                        {JSON.stringify(result, null, 2)}
                      </pre>
                      {result.error === 0 && (
                        <div className="alert alert-success mt-3 mb-0">
                          <i className="fas fa-check-circle me-2"></i>
                          Đã tạo thanh toán giả lập thành công! Bạn có thể kiểm
                          tra trạng thái đặt tour.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPaymentPage;
