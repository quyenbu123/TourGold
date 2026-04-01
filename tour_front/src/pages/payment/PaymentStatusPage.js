import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import paymentService from "../../services/paymentService";
import { formatVND } from "../../utils/format";

/**
 * PaymentStatusPage Component
 * Hiển thị trạng thái thanh toán sau khi người dùng thanh toán
 */
const PaymentStatusPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams();

  // Lấy bookingId từ URL parameter hoặc từ location state
  const orderId =
    bookingId ||
    new URLSearchParams(location.search).get("orderId") ||
    (location.state && location.state.bookingId);

  // Chuẩn hóa orderId - loại bỏ prefix "TOUR-" nếu có
  const normalizedOrderId = orderId?.replace(/^TOUR-/i, "");

  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheckedTime, setLastCheckedTime] = useState(Date.now());
  const [transaction, setTransaction] = useState(null);

  // Add polling interval state
  const [pollingInterval, setPollingInterval] = useState(null);

  // Kiểm tra trạng thái thanh toán
  const checkPaymentStatus = async () => {
    if (!normalizedOrderId) {
      setError("No booking ID provided");
      setLoading(false);
      return false;
    }

    setLastCheckedTime(Date.now());
    setCheckCount((prev) => prev + 1);

    try {
      // Phương pháp 1: Kiểm tra status API
      console.log("Checking payment status for order:", normalizedOrderId);
      const statusResponse = await api.get(
        `/api/v1/payment/check/status/${normalizedOrderId}`,
        {
          timeout: 120000, // 120 seconds timeout
        }
      );
      console.log("Status API response:", statusResponse.data);

      // Kiểm tra cả status và transaction
      if (
        statusResponse.data.status === "paid" ||
        statusResponse.data.transaction
      ) {
        console.log("Payment confirmed via status API");
        setPaymentStatus("success");
        setTransaction(statusResponse.data.transaction || statusResponse.data);
        return true;
      }

      // Phương pháp 2: Kiểm tra thông qua API transactions
      console.log("Checking through transactions endpoint");
      try {
        const transactionsData = await paymentService.getTransactions();
        console.log("Transactions received:", transactionsData);

        if (
          transactionsData &&
          transactionsData.data &&
          transactionsData.data.records
        ) {
          const records = transactionsData.data.records;
          // Tìm giao dịch khớp với mã đơn hàng
          const matchingTransaction = records.find((transaction) => {
            const description = transaction.description || "";
            // Chỉ tìm kiếm "tour" + số ID
            const searchPattern = new RegExp(
              `tour${normalizedOrderId}\\b`,
              "i"
            );
            console.log(
              "Checking transaction:",
              description,
              "against pattern:",
              searchPattern
            );
            return searchPattern.test(description);
          });

          if (matchingTransaction) {
            console.log("Found matching transaction:", matchingTransaction);
            setPaymentStatus("success");
            setTransaction(matchingTransaction);
            return true;
          }
        }
      } catch (transErr) {
        console.error("Error checking transactions:", transErr);
        // Không throw lỗi ở đây để tiếp tục kiểm tra
      }

      // Chưa tìm thấy thanh toán
      setPaymentStatus("pending");
      return false;
    } catch (err) {
      console.error("Error checking payment status:", err);
      if (err.code === "ECONNABORTED") {
        console.log("Request timeout, will retry on next check");
        return false;
      }
      setError(
        "Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại sau."
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra thủ công
  const handleManualCheck = () => {
    checkPaymentStatus();
  };

  // Tải thông tin booking
  const loadBookingDetails = async () => {
    if (!orderId) return;

    try {
      const response = await api.get(`/api/v1/bookings/${orderId}`);
      setBookingDetails(response.data);
    } catch (err) {
      console.error("Error loading booking details:", err);
    }
  };

  // Lên lịch kiểm tra tự động
  useEffect(() => {
    if (!orderId) {
      navigate("/tours");
      return;
    }

    let isChecking = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const CHECK_INTERVAL = 60000; // Tăng lên 60 giây để tránh rate limit và timeout
    const MAX_CHECKS = 10; // Tối đa 10 phút

    const handleSuccessfulPayment = async () => {
      // Prevent multiple executions
      if (paymentStatus === "success") return;

      console.log("Payment successful, updating booking status...");
      try {
        // Cập nhật trạng thái booking thành COMPLETED (id 4)
        await api.post(`/api/v1/bookings/${normalizedOrderId}/update-status`, {
          statusId: 4, // COMPLETED status
        });
        console.log("Booking status updated to COMPLETED successfully");

        // Store transaction details in a local variable to prevent
        // state update during an unmounted component
        const paymentDetailsToUse = {
          transactionId: transaction?.id,
          amount: transaction?.amount,
          method: transaction?.method || "Bank Transfer",
          date: transaction?.when,
          orderId: orderId,
        };

        // Notify user about successful payment via email (backend will handle this)
        console.log("Payment confirmation email will be sent by the backend");

        // Use timeout to ensure all state updates are processed before navigating
        setTimeout(() => {
          navigate("/payment/success", {
            state: {
              paymentDetails: paymentDetailsToUse,
            },
          });
        }, 100);
      } catch (err) {
        console.error("Error updating booking status:", err);
        // Same approach here for error handling
        const paymentDetailsToUse = {
          transactionId: transaction?.id,
          amount: transaction?.amount,
          method: transaction?.method || "Bank Transfer",
          date: transaction?.when,
          orderId: orderId,
        };

        setTimeout(() => {
          navigate("/payment/success", {
            state: {
              paymentDetails: paymentDetailsToUse,
            },
          });
        }, 100);
      }
    };

    // Kiểm tra trạng thái thanh toán ban đầu
    const initialCheck = async () => {
      try {
        const isPaid = await checkPaymentStatus();
        if (isPaid) {
          handleSuccessfulPayment();
          return true;
        }
      } catch (err) {
        console.error("Error in initial check:", err);
      }
      return false;
    };

    // Lên lịch kiểm tra định kỳ
    const intervalId = setInterval(async () => {
      if (
        isChecking ||
        paymentStatus === "success" ||
        checkCount >= MAX_CHECKS
      ) {
        clearInterval(intervalId);
        if (checkCount >= MAX_CHECKS) {
          setError(
            "Đã vượt quá thời gian chờ thanh toán. Vui lòng kiểm tra lại sau."
          );
        }
        return;
      }

      try {
        isChecking = true;
        const isPaid = await checkPaymentStatus();

        if (isPaid) {
          clearInterval(intervalId);
          handleSuccessfulPayment();
        } else if (error && error.includes("Rate limit")) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            clearInterval(intervalId);
            setError(
              "Đã vượt quá số lần thử lại do giới hạn API. Vui lòng thử lại sau."
            );
          }
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
        if (err.message?.includes("Rate limit")) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            clearInterval(intervalId);
            setError(
              "Đã vượt quá số lần thử lại do giới hạn API. Vui lòng thử lại sau."
            );
          }
        }
      } finally {
        isChecking = false;
      }
    }, CHECK_INTERVAL);

    // Thực hiện kiểm tra ban đầu - Ensure this doesn't set up another interval
    initialCheck();

    // Clean up function to prevent memory leaks
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [orderId, navigate]); // Remove other dependencies to prevent re-runs

  // Format timestamp thành định dạng dễ đọc
  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Hiển thị số tiền theo định dạng VNĐ
  const formatCurrency = (amount) => formatVND(amount);

  // Copy mã đơn hàng vào clipboard
  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    alert("Đã sao chép mã đơn hàng: " + orderId);
  };

  // Hiển thị trạng thái thanh toán
  return (
    <div className="payment-status-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{
                      width: "80px",
                      height: "80px",
                      backgroundColor:
                        paymentStatus === "success" ? "#e6f7ee" : "#fff8e6",
                    }}
                  >
                    <i
                      className={`fas fa-${
                        paymentStatus === "success" ? "check" : "clock"
                      } fa-2x`}
                      style={{
                        color:
                          paymentStatus === "success" ? "#28a745" : "#ffc107",
                      }}
                    ></i>
                  </div>

                  <h1 className="h3 mb-2">
                    {paymentStatus === "success"
                      ? "Thanh toán thành công!"
                      : "Đang chờ thanh toán"}
                  </h1>

                  <p className="text-muted mb-0">
                    {paymentStatus === "success"
                      ? "Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đã được xác nhận."
                      : "Vui lòng hoàn tất thanh toán để xác nhận đặt tour."}
                  </p>
                </div>

                {/* Thông tin đơn hàng */}
                <div className="bg-light rounded p-3 mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="h5 mb-0">Thông tin đơn hàng</h2>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={copyOrderId}
                    >
                      <i className="fas fa-copy me-1"></i> Copy
                    </button>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="small text-muted">Mã đơn hàng</div>
                      <div className="fw-bold">{orderId}</div>
                    </div>

                    <div className="col-md-6">
                      <div className="small text-muted">Trạng thái</div>
                      <div>
                        <span
                          className={`badge ${
                            paymentStatus === "success"
                              ? "bg-success"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {paymentStatus === "success"
                            ? "Đã thanh toán"
                            : "Chờ thanh toán"}
                        </span>
                      </div>
                    </div>

                    {bookingDetails && (
                      <>
                        <div className="col-md-6">
                          <div className="small text-muted">Tour</div>
                          <div className="fw-bold">
                            {bookingDetails.tourName || "N/A"}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="small text-muted">Tổng tiền</div>
                          <div className="fw-bold">
                            {formatCurrency(bookingDetails.totalAmount)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Thông tin thanh toán nếu đã thanh toán thành công */}
                {paymentStatus === "success" && transaction && (
                  <div className="bg-light rounded p-3 mb-4">
                    <h2 className="h5 mb-3">Thông tin thanh toán</h2>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="small text-muted">
                          Số tiền đã thanh toán
                        </div>
                        <div className="fw-bold">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="small text-muted">Ngân hàng</div>
                        <div className="fw-bold">
                          {transaction.bank || "N/A"}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="small text-muted">
                          Thời gian thanh toán
                        </div>
                        <div className="fw-bold">
                          {transaction.when || "N/A"}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="small text-muted">Nội dung</div>
                        <div className="fw-bold text-truncate">
                          {transaction.description || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trạng thái kiểm tra thanh toán */}
                {paymentStatus === "pending" && (
                  <div className="payment-check-status mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="small text-muted">
                        Lần kiểm tra cuối: {formatTime(lastCheckedTime)}
                        {checkCount > 0 && ` (${checkCount}/10)`}
                      </div>

                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleManualCheck}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-1"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Đang kiểm tra...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-sync-alt me-1"></i>
                            Kiểm tra ngay
                          </>
                        )}
                      </button>
                    </div>

                    <div className="alert alert-info mb-0">
                      <div className="d-flex">
                        <div className="flex-shrink-0 me-2">
                          <i className="fas fa-info-circle mt-1"></i>
                        </div>
                        <div>
                          <p className="mb-1">
                            Hệ thống sẽ tự động kiểm tra thanh toán trong vòng
                            10 phút.
                          </p>
                          <p className="small mb-0">
                            Nếu bạn đã thanh toán nhưng trạng thái chưa cập
                            nhật, hãy nhấn "Kiểm tra ngay" hoặc liên hệ với
                            chúng tôi để được hỗ trợ.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hiển thị lỗi nếu có */}
                {error && (
                  <div className="alert alert-danger mb-4">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </div>
                )}

                {/* Nút chuyển hướng */}
                <div className="d-grid gap-2">
                  {paymentStatus === "success" ? (
                    <>
                      <Link
                        to="/dashboard/bookings"
                        className="btn btn-primary"
                      >
                        <i className="fas fa-list-alt me-2"></i>
                        Xem đơn hàng của tôi
                      </Link>
                      <Link to="/" className="btn btn-outline-secondary">
                        <i className="fas fa-home me-2"></i>
                        Về trang chủ
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => navigate(-1)}
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Quay lại trang thanh toán
                      </button>
                      <Link
                        to="/dashboard/bookings"
                        className="btn btn-outline-primary"
                      >
                        <i className="fas fa-list-alt me-2"></i>
                        Xem đơn hàng của tôi
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusPage;
