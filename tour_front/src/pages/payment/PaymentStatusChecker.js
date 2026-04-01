import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import paymentService from "../../services/paymentService";

/**
 * PaymentStatusChecker Component
 * Allows users to check the status of their payment by entering booking ID
 */
const PaymentStatusChecker = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      setError("Vui lòng nhập mã đặt tour để kiểm tra");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Store the booking ID to prevent closures with stale values
      const bookingIdToCheck = bookingId;

      // Check payment status directly (this endpoint doesn't require auth)
      try {
        const orderId = `TOUR-${bookingIdToCheck}`;
        const statusResponse = await paymentService.checkPaymentStatus(orderId);

        if (statusResponse.status === "paid") {
          setResult({
            isPaid: true,
            method: "direct",
            transaction: statusResponse.transaction,
          });
          return;
        }
      } catch (err) {
        console.error("Error checking direct payment status:", err);
        // Continue to next check method instead of setting error
      }

      // Fallback to transactions check using the local endpoint (doesn't require auth)
      try {
        console.log("Using local endpoint to check transactions");
        const transactions = await paymentService.getTransactions();

        console.log("Successfully retrieved transactions from local endpoint");
        const matchingTransaction = paymentService.findMatchingTransaction(
          transactions,
          bookingId
        );

        if (matchingTransaction) {
          console.log("Found matching transaction:", matchingTransaction);
          setResult({
            isPaid: true,
            method: "transaction",
            transaction: matchingTransaction,
          });
          return;
        } else {
          console.log(
            "No matching transaction found for booking ID:",
            bookingId
          );
        }
      } catch (err) {
        console.error(
          "Error checking transactions through local endpoint:",
          err
        );
      }

      // If authenticated, try the booking check method
      if (isAuthenticated) {
        try {
          const bookingResponse = await paymentService.checkBookingPayment(
            bookingId
          );
          if (bookingResponse.isPaid) {
            setResult({
              isPaid: true,
              method: "booking",
              transaction: bookingResponse.transaction,
            });
            return;
          }
        } catch (err) {
          console.error("Error checking booking payment:", err);
        }
      }

      // If we get here, no payment was found
      setResult({
        isPaid: false,
        message: "Chưa tìm thấy thanh toán cho đơn hàng này",
      });
    } catch (err) {
      console.error("Error checking payment:", err);
      setError("Không thể kiểm tra thanh toán. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewBooking = () => {
    if (bookingId) {
      // Kiểm tra xem người dùng có đăng nhập hay không trước khi chuyển hướng
      if (!isAuthenticated) {
        setError("Vui lòng đăng nhập để xem chi tiết đặt tour");
        return;
      }
      navigate(`/bookings/${bookingId}`);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white py-3">
              <h3 className="h5 mb-0">Kiểm tra trạng thái thanh toán</h3>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger mb-4" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {!isAuthenticated && (
                <div className="alert alert-info mb-4">
                  <i className="fas fa-info-circle me-2"></i>
                  Bạn đang kiểm tra thanh toán mà không đăng nhập. Một số tính
                  năng có thể bị hạn chế.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="bookingId" className="form-label">
                    Mã đặt tour
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="bookingId"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    placeholder="Nhập mã đặt tour của bạn"
                    required
                  />
                  <div className="form-text">
                    Nhập mã đặt tour để kiểm tra trạng thái thanh toán.
                  </div>
                </div>

                <div className="d-grid">
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
                        ></span>
                        Đang kiểm tra...
                      </>
                    ) : (
                      "Kiểm tra ngay"
                    )}
                  </button>
                </div>
              </form>

              {result && (
                <div className="mt-4">
                  <h4 className="h6 text-uppercase mb-3">Kết quả kiểm tra</h4>

                  <div
                    className={`alert ${
                      result.isPaid ? "alert-success" : "alert-warning"
                    }`}
                  >
                    <h5 className="alert-heading">
                      {result.isPaid ? (
                        <>
                          <i className="fas fa-check-circle me-2"></i>
                          Đã thanh toán
                        </>
                      ) : (
                        <>
                          <i className="fas fa-clock me-2"></i>
                          Chưa thanh toán
                        </>
                      )}
                    </h5>
                    <p className="mb-0">
                      {result.isPaid
                        ? "Chúng tôi đã xác nhận thanh toán cho đặt tour của bạn. Cảm ơn quý khách!"
                        : "Chúng tôi chưa nhận được thanh toán cho đặt tour này. Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ nếu bạn đã thanh toán."}
                    </p>
                  </div>

                  <div className="d-flex justify-content-between mt-3">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setResult(null)}
                    >
                      Kiểm tra mã khác
                    </button>

                    {result.isPaid && (
                      <button
                        className="btn btn-success"
                        onClick={handleViewBooking}
                      >
                        Xem chi tiết đặt tour
                      </button>
                    )}
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

export default PaymentStatusChecker;
