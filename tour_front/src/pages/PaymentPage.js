import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import paymentService from "../services/paymentService";
import bookingService from "../services/bookingService";
import promotionService from "../services/promotionService";
import { formatVND } from "../utils/format";
import { createPaymentSocket } from "../services/socket";

// Reusable validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10,}$/;

/**
 * Quy Trình Thanh Toán Đặt Tour
 * -----------------------------
 *
 * 1. Người dùng hoàn thành biểu mẫu đặt tour và được chuyển hướng đến Trang Thanh Toán với chi tiết đặt tour
 *
 * 2. Quy trình Trang Thanh Toán:
 *    a. Hiển thị biểu mẫu thông tin khách hàng và tóm tắt đặt tour
 *    b. Người dùng chọn phương thức thanh toán (chuyển khoản ngân hàng / Casso QR)
 *    c. Tạo mã QR cho thanh toán từ điểm cuối cục bộ
 *    d. Bắt đầu quá trình xác minh thanh toán định kỳ
 *
 * 3. Quy Trình Xác Minh Thanh Toán:
 *    a. Chính: Yêu cầu qua điểm cuối cục bộ: http://localhost:8080/api/v1/payment/check/transactions
 *       - Backend chuyển tiếp yêu cầu đến API Casso với giới hạn tốc độ (tối đa 2 yêu cầu/phút)
 *       - Tìm kiếm mô tả giao dịch khớp với mẫu ID đặt tour
 *    b. Thay thế: Kiểm tra thanh toán đặt tour cụ thể qua điểm cuối cục bộ
 *    c. Nếu tìm thấy thanh toán:
 *       - Cập nhật trạng thái thanh toán thành hoàn thành
 *       - Ghi lại thanh toán trong cơ sở dữ liệu
 *       - Hiển thị thông báo thành công và chuyển hướng đến trang xác nhận
 *
 * 4. Người dùng có thể kiểm tra trạng thái thanh toán thủ công nếu xác minh tự động chậm
 *
 * 5. Xử Lý Lỗi:
 *    a. Lỗi xác thực không gây đăng xuất trên các điểm cuối kiểm tra thanh toán
 *    b. Lỗi giới hạn tốc độ được xử lý ở cấp backend
 *    c. Lỗi mạng hiển thị phản hồi phù hợp cho người dùng
 *    d. Xác minh thất bại cho phép người dùng thử lại
 *
 * VÍ DỤ QUY TRÌNH ĐẦY ĐỦ:
 * ----------------------
 * 1. Người dùng đặt tour với giá 2.000.000 VNĐ và được gán ID đặt tour 12345
 *
 * 2. PaymentPage tạo orderId "TOUR-12345" và hiển thị mã QR để thanh toán
 *
 * 3. Khi người dùng thực hiện chuyển khoản ngân hàng với mô tả "TOUR12345":
 *    a. API Casso nhận thông báo về giao dịch chuyển khoản ngân hàng
 *    b. Ứng dụng của chúng ta thăm dò điểm cuối cục bộ mỗi 60 giây:
 *       http://localhost:8080/api/v1/payment/check/transactions
 *    c. Backend chuyển tiếp yêu cầu đến API Casso, tuân thủ giới hạn tốc độ
 *    d. Backend tìm kiếm trong các giao dịch mẫu "TOUR12345"
 *
 * 4. Khi tìm thấy giao dịch khớp:
 *    a. Frontend cập nhật giao diện người dùng để hiển thị thanh toán đã hoàn thành
 *    b. Bản ghi thanh toán được tạo trong cơ sở dữ liệu
 *    c. Người dùng được chuyển hướng đến trang thành công với chi tiết giao dịch
 *    d. Quản trị viên được thông báo về thanh toán mới cần phê duyệt
 *
 * Các Điểm Cuối API Được Sử Dụng:
 * ------------------------------
 * 1. Tạo QR thanh toán:       /api/v1/payment/vietqr/generate
 * 2. Lấy giao dịch:           /api/v1/payment/check/transactions (ĐIỂM CUỐI CỤC BỘ)
 * 3. Kiểm tra trạng thái thanh toán: /api/v1/payment/check/status/{orderId}
 * 4. Xác minh thanh toán:     /api/v1/payment/check/verify/{orderId}
 * 5. Kiểm tra thanh toán đặt tour:  /api/v1/payment/casso/check-booking/{bookingId}
 */

/**
 * Component Trang Thanh Toán
 * Xử lý quá trình thanh toán sau khi đặt tour
 */
const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Tham chiếu cho khoảng thời gian
  const pollingInterval = useRef(null);

  // Trạng thái thanh toán
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [mockAutoApproveUI, setMockAutoApproveUI] = useState(false);
  const [mockSimulating, setMockSimulating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [qrCode, setQrCode] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: "",
  });

  // Biến để theo dõi thời gian kiểm tra gần nhất
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const MIN_CHECK_INTERVAL = 30000; // 30 giây giữa các lần kiểm tra
  const [availablePromotions, setAvailablePromotions] = useState([]);
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [promotionError, setPromotionError] = useState("");

  // Initialize from location state (passed from booking form)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: "/payment", message: "Vui lòng đăng nhập để thanh toán" },
      });
      return;
    }

    // Lấy dữ liệu đặt tour từ trạng thái vị trí
    const bookingData = location.state?.bookingData;
    if (!bookingData) {
      setError(
        "Không tìm thấy thông tin đặt tour. Vui lòng quay lại trang tour và thử lại."
      );
      setLoading(false);
      return;
    }

    setBookingDetails(bookingData);
    setLoading(false);

    // Hàm dọn dẹp để xóa bất kỳ khoảng thời gian thăm dò nào khi unmount
    return () => {
      if (pollingInterval.current) {
        console.log("Đang xóa khoảng thời gian thăm dò khi hủy gắn kết component");
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [location, isAuthenticated, navigate]);

  // Subscribe to payment events via socket
  useEffect(() => {
    const setup = async () => {
      if (!bookingDetails?.id) return;
      const orderId = `TOUR-${bookingDetails.id}`;
      const socket = createPaymentSocket();
      try {
        await socket.connect();
        socket.subscribePayment(orderId, (evt) => {
          if (evt?.type === "payment.verified" && evt?.orderId === orderId) {
            setPaymentStatus("completed");
            setPaymentDetails({ amount: evt.amount, method: evt.method, date: evt.timestamp, bookingId: bookingDetails.id });
            setTimeout(() => handleConfirmPayment(), 1000);
          }
        });
        // Store to ref for cleanup
        pollingInterval.current = { disconnect: socket.disconnect };
      } catch (e) {
        console.error("Socket connect error", e);
      }
    };
    setup();
    return () => {
      const sockRef = pollingInterval.current;
      if (sockRef?.disconnect) sockRef.disconnect();
    };
  }, [bookingDetails?.id]);
  // Fetch available promotions when component mounts
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const promotions = await promotionService.getUserPromotions(user.id);
        setAvailablePromotions(promotions);
      } catch (error) {
        console.error("Lỗi khi tải khuyến mãi:", error);
      }
    };

    if (user?.id) {
      fetchPromotions();
    }
  }, [user]);

  // Xử lý nhập liệu biểu mẫu thông tin khách hàng
  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Xác thực thông tin khách hàng
  const validateCustomerInfo = () => {
    // Chỉ xác thực khi được gọi rõ ràng, không phải trên mỗi lần render
    if (!customerInfo.fullName.trim()) {
      return false;
    }
    if (!customerInfo.email.trim()) {
      return false;
    }
    if (!customerInfo.phone.trim()) {
      return false;
    }

    // Xác thực email cơ bản
    if (!EMAIL_REGEX.test(customerInfo.email)) {
      return false;
    }

    // Xác thực số điện thoại cơ bản (ít nhất 10 chữ số)
    if (!PHONE_REGEX.test(customerInfo.phone.replace(/[^0-9]/g, ""))) {
      return false;
    }

    return true;
  };

  // Handle payment method selection with customer info validation
  const handlePaymentMethodSelect = async (method) => {
    // Always validate customer info first, regardless of payment method
    if (!validateCustomerInfo()) {
      // Set error message based on validation failure
      if (!customerInfo.fullName.trim()) {
        setError("Vui lòng nhập họ tên của bạn");
      } else if (!customerInfo.email.trim()) {
        setError("Vui lòng nhập email của bạn");
      } else if (!EMAIL_REGEX.test(customerInfo.email)) {
        setError("Vui lòng nhập địa chỉ email hợp lệ");
      } else if (!customerInfo.phone.trim()) {
        setError("Vui lòng nhập số điện thoại của bạn");
      } else if (!PHONE_REGEX.test(customerInfo.phone.replace(/[^0-9]/g, ""))) {
        setError("Vui lòng nhập số điện thoại hợp lệ (ít nhất 10 chữ số)");
      }

      // Focus on the first empty required field
      if (!customerInfo.fullName.trim()) {
        document.getElementById("fullName").focus();
      } else if (
        !customerInfo.email.trim() ||
        EMAIL_REGEX.test(customerInfo.email)
      ) {
        document.getElementById("email").focus();
      } else if (
        !customerInfo.phone.trim() ||
        !PHONE_REGEX.test(customerInfo.phone.replace(/[^0-9]/g, ""))
      ) {
        document.getElementById("phone").focus();
      }
      return; // Stop if validation fails
    }

    // If validation passes, clear any previous error
    setError(null);

    try {
      setLoading(true);
      setPaymentMethod(method);

      // Create a unique order ID for this payment
      const orderId = `TOUR-${bookingDetails.id}`;

      if (method === "casso") {
        // Generate QR code for Casso payment
        const amount = bookingDetails.totalAmount.toString();
        const qrData = await paymentService.generateCassoQR(amount, orderId);

        // Cập nhật mô tả chuyển khoản mà không có ký tự đặc biệt
        const simpleDescription = `Thanh toan cho tour TOUR${bookingDetails.id}`;
        if (qrData) {
          qrData.simpleDescription = simpleDescription;
        }

        setQrCode(qrData);

        // Hiển thị cảnh báo về nội dung chuyển khoản
        console.log(
          "QUAN TRỌNG: Ngân hàng không hỗ trợ ký tự đặc biệt trong nội dung chuyển khoản."
        );
        console.log("Nội dung chuyển khoản đơn giản:", simpleDescription);

        // Socket-based flow handles confirmation; no interval polling needed

        // Thiết lập hàm kiểm tra thanh toán với tần suất thấp hơn
        let lastCheckTime = 0;
        const checkPaymentWithRateLimit = async () => {
          const now = Date.now();
          // Chỉ kiểm tra mỗi 60 giây
          if (now - lastCheckTime < 60000) {
            console.log(
              "Đang chờ thời gian rate limit trước khi kiểm tra thanh toán tiếp...",
              Math.ceil((60000 - (now - lastCheckTime)) / 1000),
              "giây"
            );
            return;
          }

          lastCheckTime = now;
          console.log("Đang kiểm tra thanh toán tự động...");

          try {
            // Kiểm tra trạng thái từ API
            const statusData = await paymentService.checkPaymentStatus(orderId);

            if (statusData.status === "paid") {
              // Payment successful
              console.log("Phát hiện thanh toán từ Casso API!");
              if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
                pollingInterval.current = null;
              }
              setPaymentStatus("completed");
              setPaymentDetails(statusData.transaction);

              // Tạo payment record và cập nhật booking
              try {
                await createPaymentRecord(
                  orderId,
                  "casso",
                  statusData.transaction
                );
              } catch (recordErr) {
                console.error("Error creating payment record:", recordErr);
              }

              // Tự động chuyển hướng
              setTimeout(() => {
                handleConfirmPayment();
              }, 2000);
            }
          } catch (err) {
            console.error("Lỗi kiểm tra thanh toán tự động:", err);
          }
        };

        // Keep a manual initial check as fallback
        setTimeout(() => { try { checkPaymentWithRateLimit(); } catch {} }, 5000);
        return;
      } else if (method === "vnpay") {
        // VNPay integration will be implemented later
        // For now, just simulate a pending VNPay payment
        setPaymentDetails({
          orderId,
          amount: bookingDetails.totalAmount,
          method: "vnpay",
          status: "pending",
        });
      }
    } catch (err) {
      console.error("Lỗi khi thiết lập thanh toán:", err);
      setError("Không thể thiết lập thanh toán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Tạo bản ghi thanh toán trong backend
  const createPaymentRecord = async (orderId, method, transactionData) => {
    // Backend đã tự tạo Payment và cập nhật Booking khi webhook/verify thành công,
    // nên không cần gọi thêm endpoint tạo payment ở frontend.
    try {
      console.log("Payment confirmed — record handled by backend.", {
        orderId,
        method,
        transaction: transactionData,
      });
      return true;
    } catch (_) {
      return false;
    }
  };

  // Xử lý xác nhận và chuyển hướng đến trang thành công
  const handleConfirmPayment = () => {
    // Đảm bảo paymentDetails có đủ thông tin
    const details = {
      ...paymentDetails,
      amount: paymentDetails?.amount || bookingDetails?.totalAmount || 0,
      transactionId:
        paymentDetails?.transactionId ||
        paymentDetails?.orderId ||
        "Không xác định",
      method: paymentDetails?.method || "Chuyển khoản ngân hàng",
      date: paymentDetails?.date || new Date().toISOString(),
      bookingId: bookingDetails?.id,
    };

    // Hiển thị thông báo về email xác nhận
    console.log(
      "Email xác nhận thanh toán sẽ được gửi đến địa chỉ email đã đăng ký của bạn"
    );

    navigate("/payment/success", {
      state: { paymentDetails: details },
    });
  };

  const handleMockSimulatePayment = async () => {
    try {
      setMockSimulating(true);
      const bookingId = bookingDetails?.id;
      const amount = bookingDetails?.totalAmount;
      if (!bookingId) {
        alert("Thiếu thông tin đặt tour để mô phỏng.");
        return;
      }
      // Gọi endpoint mô phỏng backend nếu có
      await paymentService.simulatePayment(bookingId, amount);
      // Kiểm tra trạng thái sau khi mô phỏng
      const orderId = `TOUR-${bookingId}`;
      await paymentService.checkPaymentStatus(orderId);
      // Thử xác nhận thủ công
      await manualCheckPayment();
    } catch (e) {
      console.error("Mock simulate error:", e);
      alert("Không thể mô phỏng thanh toán. Vui lòng thử lại.");
    } finally {
      setMockSimulating(false);
    }
  };

  // Simulate a payment for testing purposes
  const simulatePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!bookingDetails || !bookingDetails.id) {
        setError("Không tìm thấy thông tin đặt tour.");
        return;
      }

      console.log(`Simulating payment for booking ID: ${bookingDetails.id}`);

      const result = await paymentService.simulatePayment(
        bookingDetails.id,
        bookingDetails.totalAmount
      );

      if (result && result.error === 0) {
        console.log("Mock payment created successfully:", result);
        // Manually check for the payment
        setTimeout(() => {
          manualCheckPayment();
        }, 1000);
      } else {
        console.error("Failed to create mock payment:", result);
  setError("Không thể mô phỏng thanh toán. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Error simulating payment:", err);
      setError(
        "Lỗi khi tạo thanh toán thử: " + (err.message || "Không rõ nguyên nhân")
      );
    } finally {
      setLoading(false);
    }
  };
  const handleApplyPromotion = async (promotionId) => {
    setPromotionError("");

    try {
      const promotion = await promotionService.validateAndApplyPromotion(
        user.id,
        promotionId,
        bookingDetails.totalAmount
      );
      setAppliedPromotion(promotion);

      // Cập nhật tổng tiền với giảm giá
      const discountedAmount =
        bookingDetails.totalAmount - promotion.discountAmount;
      setBookingDetails((prev) => ({
        ...prev,
        totalAmount: discountedAmount,
      }));
    } catch (error) {
      setPromotionError(
        error.response?.data?.error || "Không thể áp dụng khuyến mãi"
      );
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionError("");

    // Khôi phục tổng tiền ban đầu
    const originalAmount = bookingDetails.packages.reduce(
      (total, pkg) => total + pkg.price * pkg.quantity,
      0
    );
    setBookingDetails((prev) => ({
      ...prev,
      totalAmount: originalAmount,
    }));
  };

  // Add the missing manualCheckPayment function
  const manualCheckPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!bookingDetails || !bookingDetails.id) {
        setError("Không tìm thấy thông tin đặt tour.");
        return;
      }

      console.log(
        `Đang kiểm tra thanh toán cho đặt tour ID: ${bookingDetails.id}`
      );

      // Kiểm tra trạng thái thanh toán
      const orderId = `TOUR-${bookingDetails.id}`;
      const statusData = await paymentService.checkPaymentStatus(orderId);

      if (statusData.status === "paid") {
        // Thanh toán thành công
        console.log("Đã phát hiện thanh toán!");
        setPaymentStatus("completed");
        setPaymentDetails(statusData.transaction);

        // Tạo payment record và cập nhật booking
        try {
          await createPaymentRecord(orderId, "casso", statusData.transaction);
        } catch (recordErr) {
          console.error("Lỗi khi tạo bản ghi thanh toán:", recordErr);
        }

        // Tự động chuyển hướng
        setTimeout(() => {
          handleConfirmPayment();
        }, 2000);
      } else {
        // Thử kiểm tra qua phương thức thứ hai - lấy tất cả giao dịch
        try {
          const transactions = await paymentService.getTransactions();
          const matchingTransaction = paymentService.findMatchingTransaction(
            transactions,
            bookingDetails.id
          );

          if (matchingTransaction) {
            console.log("Đã tìm thấy giao dịch khớp:", matchingTransaction);
            setPaymentStatus("completed");
            setPaymentDetails({
              transactionId: matchingTransaction.id,
              amount: matchingTransaction.amount,
              date: matchingTransaction.when,
              method: "Chuyển khoản ngân hàng",
              description: matchingTransaction.description,
            });

            // Tạo payment record và cập nhật booking
            try {
              await createPaymentRecord(orderId, "casso", matchingTransaction);
            } catch (recordErr) {
              console.error("Lỗi khi tạo bản ghi thanh toán:", recordErr);
            }

            // Tự động chuyển hướng
            setTimeout(() => {
              handleConfirmPayment();
            }, 2000);
          } else {
            console.log(
              "Chưa tìm thấy giao dịch khớp cho booking ID:",
              bookingDetails.id
            );
            setError(
              "Chưa tìm thấy thanh toán cho đặt tour này. Vui lòng kiểm tra lại sau khi đã thanh toán."
            );
          }
        } catch (transErr) {
          console.error("Lỗi khi kiểm tra giao dịch:", transErr);
          setError(
            "Có lỗi xảy ra khi kiểm tra thanh toán. Vui lòng thử lại sau."
          );
        }
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra thanh toán:", err);
      setError("Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Hàm để bắt đầu thăm dò giao dịch
  const startTransactionPolling = (bookingId) => {
    // Việc triển khai này không thực sự thiết lập khoảng thời gian, nhưng trả về một hàm dọn dẹp
    // sẽ được gọi nếu chúng ta đã thiết lập một khoảng thời gian
    return () => {
      console.log("Hàm dọn dẹp thăm dò được gọi");
      // Bất kỳ mã dọn dẹp nào sẽ nằm ở đây
    };
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white py-3">
              <h3 className="h5 mb-0">Hoàn Tất Đặt Tour</h3>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger mb-4" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {!bookingDetails ? (
                <div className="text-center py-4">
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    Không tìm thấy thông tin đặt tour.
                  </div>
                  <button
                    className="btn btn-primary mt-3"
                    onClick={() => navigate("/tours")}
                  >
                    Xem Danh Sách Tour
                  </button>
                </div>
              ) : (
                <>
                  {/* Booking Summary */}
                  <div className="mb-4 pb-3 border-bottom">
                    <h4 className="h6 text-uppercase mb-3">Thông Tin Đặt Tour</h4>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <span className="text-muted">Tour:</span>
                        <p className="fw-semibold mb-0">
                          {bookingDetails.tourName}
                        </p>
                      </div>
                      <div className="col-md-6 mb-2">
                        <span className="text-muted">Ngày:</span>
                        <p className="fw-semibold mb-0">
                          {new Date(bookingDetails.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Tour Packages */}
                    <div className="mt-3">
                      <h5 className="h6 mb-2">Gói Tour Đã Chọn:</h5>
                      {bookingDetails.packages?.map((pkg, index) => (
                        <div
                          key={index}
                          className="d-flex justify-content-between align-items-center mb-2"
                        >
                          <span>
                            {pkg.packageName} x {pkg.quantity}
                          </span>
                          <span className="fw-semibold">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(pkg.price * pkg.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                      <span className="h6 mb-0">Tổng Tiền:</span>
                      <span className="h5 mb-0 text-primary fw-bold">
                        {formatVND(bookingDetails.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information Form - Always show regardless of payment method */}
                  <div className="mb-4">
                    <h4 className="h6 text-uppercase mb-3">
                      Thông Tin Khách Hàng{" "}
                      <span className="text-danger">*</span>
                    </h4>
                    <form id="customerInfoForm">
                      <div className="mb-3">
                        <label htmlFor="fullName" className="form-label">
                          Họ Tên <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="fullName"
                          name="fullName"
                          value={customerInfo.fullName}
                          onChange={handleCustomerInfoChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="email" className="form-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={customerInfo.email}
                          onChange={handleCustomerInfoChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="phone" className="form-label">
                          Số Điện Thoại <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          name="phone"
                          value={customerInfo.phone}
                          onChange={handleCustomerInfoChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label htmlFor="address" className="form-label">
                          Địa Chỉ
                        </label>
                        <textarea
                          className="form-control"
                          id="address"
                          name="address"
                          value={customerInfo.address}
                          onChange={handleCustomerInfoChange}
                          rows="2"
                        ></textarea>
                      </div>
                    </form>
                  </div>

                  {/* Payment Methods */}
                  {!paymentMethod ? (
                    <div>
                      <h4 className="h6 text-uppercase mb-3">
                        Chọn Phương Thức Thanh Toán
                      </h4>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div
                            className={`card h-100 ${
                              validateCustomerInfo()
                                ? "border-primary border-2"
                                : "border-secondary opacity-75"
                            } payment-option`}
                            onClick={() => {
                              // Move validation to click handler to prevent render loop
                              if (validateCustomerInfo()) {
                                handlePaymentMethodSelect("casso");
                              } else {
                                // Set appropriate error
                                if (!customerInfo.fullName.trim()) {
                                  setError("Vui lòng nhập họ tên của bạn");
                                  document.getElementById("fullName").focus();
                                } else if (!customerInfo.email.trim()) {
                                  setError("Vui lòng nhập email của bạn");
                                  document.getElementById("email").focus();
                                } else if (
                                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                    customerInfo.email
                                  )
                                ) {
                                  setError(
                                    "Vui lòng nhập địa chỉ email hợp lệ"
                                  );
                                  document.getElementById("email").focus();
                                } else if (!customerInfo.phone.trim()) {
                                  setError(
                                    "Vui lòng nhập số điện thoại của bạn"
                                  );
                                  document.getElementById("phone").focus();
                                } else if (
                                  !/^\d{10,}$/.test(
                                    customerInfo.phone.replace(/[^0-9]/g, "")
                                  )
                                ) {
                                  setError(
                                    "Vui lòng nhập số điện thoại hợp lệ (ít nhất 10 chữ số)"
                                  );
                                  document.getElementById("phone").focus();
                                }
                              }
                            }}
                            style={{
                              cursor: validateCustomerInfo()
                                ? "pointer"
                                : "not-allowed",
                            }}
                            role="button"
                            aria-disabled={!validateCustomerInfo()}
                          >
                            <div className="card-body text-center p-4">
                              <img
                                src="/static/images/bank-transfer.png"
                                alt="Bank Transfer"
                                className="mb-3"
                                style={{ width: "64px", height: "64px" }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src =
                                    "https://cdn-icons-png.flaticon.com/512/2830/2830284.png";
                                }}
                              />
                              <h5 className="mb-0">Chuyển Khoản Ngân Hàng</h5>
                              <p className="small text-muted mb-0">
                                Thanh toán qua chuyển khoản ngân hàng
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div
                            className={`card h-100 ${
                              validateCustomerInfo() ? "" : "opacity-75"
                            } payment-option`}
                            onClick={() =>
                              validateCustomerInfo() &&
                              handlePaymentMethodSelect("vnpay")
                            }
                            style={{
                              cursor: validateCustomerInfo()
                                ? "pointer"
                                : "not-allowed",
                            }}
                            role="button"
                            aria-disabled={!validateCustomerInfo()}
                          >
                            <div className="card-body text-center p-4">
                              <img
                                src="/static/images/vnpay.png"
                                alt="VNPay"
                                className="mb-3"
                                style={{ width: "64px", height: "64px" }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src =
                                    "https://cdn.haitrieu.com/wp-content/uploads/2022/10/Icon-VNPAY-QR.png";
                                }}
                              />
                              <h5 className="mb-0">VNPay</h5>
                              <p className="small text-muted mb-0">
                                Thanh toán nhanh chóng và an toàn
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`alert ${
                          validateCustomerInfo()
                            ? "alert-info"
                            : "alert-warning"
                        } mt-3`}
                      >
                        <i
                          className={`fas fa-${
                            validateCustomerInfo()
                              ? "info-circle"
                              : "exclamation-triangle"
                          } me-2`}
                        ></i>
                        {validateCustomerInfo()
                          ? "Vui lòng chọn phương thức thanh toán để tiếp tục."
                          : "Vui lòng điền đầy đủ thông tin khách hàng trước khi chọn phương thức thanh toán."}
                      </div>
                    </div>
                  ) : paymentMethod === "casso" && qrCode ? (
                    <div>
                      <h4 className="h6 text-uppercase mb-3">
                        Thanh Toán Chuyển Khoản Ngân Hàng
                      </h4>
                      <div className="row">
                        <div className="col-md-6 mb-4 mb-md-0">
                          <div className="text-center">
                            <img
                              src={qrCode.qrUrl}
                              alt="QR Code"
                              className="img-fluid mb-3"
                              style={{ maxWidth: "200px" }}
                            />
                            <p className="small text-muted">
                              Quét mã QR để hoàn tất thanh toán
                            </p>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="card bg-light">
                            <div className="card-body p-3">
                              <h5 className="card-title h6 mb-3">
                                Chi Tiết Chuyển Khoản Ngân Hàng
                              </h5>
                              <div className="mb-2">
                                <span className="text-muted small">Ngân Hàng:</span>
                                <div className="fw-semibold">
                                  {qrCode.bankCode}
                                </div>
                              </div>
                              <div className="mb-2">
                                <span className="text-muted small">
                                  Số Tài Khoản:
                                </span>
                                <div className="fw-semibold">
                                  {qrCode.accountNumber}
                                </div>
                              </div>
                              <div className="mb-2">
                                <span className="text-muted small">
                                  Tên Tài Khoản:
                                </span>
                                <div className="fw-semibold">
                                  {qrCode.accountName}
                                </div>
                              </div>
                              <div className="mb-2">
                                <span className="text-muted small">
                                  Số Tiền:
                                </span>
                                <div className="fw-semibold">
                                  {formatVND(qrCode.amount)}
                                </div>
                              </div>
                              <div className="mb-2">
                                <span className="text-muted small">
                                  Mô Tả:
                                </span>
                                <div className="fw-semibold">
                                  {qrCode.description}
                                </div>
                              </div>
                              <div className="alert alert-warning mt-3 mb-0 p-2 small">
                                <i className="fas fa-info-circle me-1"></i>
                                Vui lòng ghi rõ mô tả khi chuyển khoản để giúp chúng tôi xác nhận thanh toán của bạn.
                              </div>
                              {qrCode.simpleDescription && (
                                <div className="alert alert-info mt-2 mb-0 p-2 small">
                                  <i className="fas fa-lightbulb me-1"></i>
                                  <strong>Nội dung đơn giản:</strong>{" "}
                                  {qrCode.simpleDescription}
                                  <div className="mt-1">
                                    <small>
                                      Nếu ứng dụng ngân hàng gặp lỗi khi nhập mô
                                      tả có dấu gạch ngang, bạn có thể sử dụng
                                      nội dung đơn giản này.
                                    </small>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Status Message */}
                      <div className="mt-4 mb-0">
                        <div className="d-flex flex-column align-items-start gap-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="mockAutoApproveUI"
                              checked={mockAutoApproveUI}
                              onChange={(e) => setMockAutoApproveUI(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="mockAutoApproveUI">
                              Bật mô phỏng auto-approve (frontend)
                            </label>
                          </div>
                          <button
                            className="btn btn-outline-primary"
                            disabled={mockSimulating}
                            onClick={handleMockSimulatePayment}
                          >
                            {mockSimulating ? "Đang mô phỏng..." : "Mô phỏng thanh toán ngay"}
                          </button>
                          {mockAutoApproveUI && (
                            <small className="text-muted">
                              Khi bật, bạn có thể nhấn "Mô phỏng" để xác nhận nhanh trong lúc API bảo trì.
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : paymentMethod === "vnpay" ? (
                    <div className="mt-4 text-center py-4">
                      <div className="alert alert-warning mb-4">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Thanh toán VNPay hiện không khả dụng. Vui lòng sử dụng
                        Chuyển Khoản Ngân Hàng thay thế.
                      </div>
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => setPaymentMethod("")}
                      >
                        Chọn Phương Thức Thanh Toán Khác
                      </button>
                    </div>
                  ) : null}
                  {/* Available Promotions */}
                  <div className="mb-4">
                    <h4 className="h6 text-uppercase mb-3">
                      Khuyến Mãi Có Sẵn
                    </h4>
                    {availablePromotions.length > 0 ? (
                      <div className="list-group mb-3">
                        {availablePromotions.map((promotion) => (
                          <div
                            key={promotion.promotionId}
                            className="list-group-item"
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="mb-1">{promotion.name}</h6>
                                <p className="mb-1 small text-muted">
                                  {promotion.description}
                                </p>
                                <small className="text-success">
                                  Giảm giá: {formatVND(promotion.discountAmount)}
                                </small>
                              </div>
                              {appliedPromotion?.promotionId ===
                              promotion.promotionId ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={handleRemovePromotion}
                                >
                                  Xóa
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    handleApplyPromotion(promotion.promotionId)
                                  }
                                  disabled={!!appliedPromotion}
                                >
                                  Áp Dụng
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        Không có khuyến mãi nào hiện có
                      </div>
                    )}
                    {promotionError && (
                      <div className="alert alert-danger mt-3">
                        {promotionError}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
