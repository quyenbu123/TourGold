import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import bookingService from "../../services/bookingService";
import LoadingSpinner from "../../components/common/LoadingSpinner";

/**
 * UserDashboardPage Component
 * User dashboard showing profile information and bookings
 */
const DashboardPage = ({ activeTab: initialActiveTab }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialActiveTab || "profile");

  // Fetch user bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching user bookings...");
        const data = await bookingService.getUserBookings();
        console.log("Raw booking data received:", data);

        if (Array.isArray(data)) {
          console.log(`Received ${data.length} bookings`);
          // Map lại dữ liệu booking
          const mapped = data.map((b) => {
            console.log("Processing booking:", b);
            const mappedBooking = {
              id: b.id || null,
              tourId: b.tourId || null,
              tourName: b.tourName || "Tour chưa xác định",
              bookingTime: b.bookingTime || null,
              checkInDate: b.checkInDate || null,
              checkOutDate: b.checkOutDate || null,
              status: b.status || "UNKNOWN",
              totalAmount: b.totalAmount || 0,
            };
            console.log("Mapped booking:", mappedBooking);
            return mappedBooking;
          });
          // Sắp xếp theo thời gian đặt tour mới nhất
          mapped.sort((a, b) => {
            const dateA = a.bookingTime ? new Date(a.bookingTime) : new Date(0);
            const dateB = b.bookingTime ? new Date(b.bookingTime) : new Date(0);
            return dateB - dateA;
          });

          console.log("Final mapped bookings:", mapped);
          setBookings(mapped);
        } else {
          console.warn("Received non-array data from bookings API:", data);
          setBookings([]);
        }
      } catch (err) {
        console.error("Error fetching user bookings:", err);
        // Hiển thị lỗi thân thiện hơn, không dọa người dùng
        setError("Không thể tải thông tin đặt tour. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id) {
      console.log("User available, fetching bookings for user ID:", user.id);
      fetchBookings();
    } else {
      console.log("User not available, skipping booking fetch");
      setLoading(false);
    }
  }, [user]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa rõ";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatus = (status) => {
    switch (status) {
      case "CONFIRMED":
      case "PAID":
        return "Đã xác nhận";
      case "PENDING":
      case "PAYMENT_PENDING":
        return "Đang chờ";
      case "CANCELLED":
        return "Đã hủy";
      case "COMPLETED":
        return "Hoàn tất";
      default:
        return "Chưa rõ";
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "confirmed":
      case "paid":
        return "bg-success";
      case "pending":
      case "payment_pending":
        return "bg-warning text-dark";
      case "cancelled":
        return "bg-danger";
      case "completed":
        return "bg-info";
      default:
        return "bg-secondary";
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đặt tour này không?")) {
      return;
    }

    try {
      setLoading(true);
      await bookingService.cancelBooking(bookingId);

      // Update bookings list
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: "CANCELLED" }
            : booking
        )
      );
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setError("Không thể hủy đặt tour. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-dashboard-page py-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 mb-4 mb-lg-0">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body text-center py-4">
                <div className="mb-3">
                  <div
                    className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto"
                    style={{ width: "100px", height: "100px" }}
                  >
                    <i className="fas fa-user-circle fa-4x"></i>
                  </div>
                </div>
                <h5 className="card-title mb-1">
                  {user?.fullName || "Khách du lịch"}
                </h5>
                <p className="text-muted small mb-3">
                  {user?.email || "Chưa cung cấp email"}
                </p>
                <Link
                  to="/profile/edit"
                  className="btn btn-sm btn-outline-primary"
                >
                  Chỉnh Sửa Hồ Sơ
                </Link>
              </div>
            </div>

            <div className="list-group shadow-sm">
              <button
                className={`list-group-item list-group-item-action ${
                  activeTab === "profile" ? "active" : ""
                }`}
                onClick={() => setActiveTab("profile")}
              >
                {" "}
                <i className="fas fa-user-circle me-2"></i> Hồ Sơ Của Tôi
              </button>
              <button
                className={`list-group-item list-group-item-action ${
                  activeTab === "bookings" ? "active" : ""
                }`}
                onClick={() => setActiveTab("bookings")}
              >
                <i className="fas fa-ticket-alt me-2"></i> Đặt Tour Của Tôi
              </button>
              <button
                className={`list-group-item list-group-item-action ${
                  activeTab === "favorites" ? "active" : ""
                }`}
                onClick={() => setActiveTab("favorites")}
              >
                <i className="fas fa-heart me-2"></i> Yêu Thích
              </button>
              <button
                className={`list-group-item list-group-item-action ${
                  activeTab === "settings" ? "active" : ""
                }`}
                onClick={() => setActiveTab("settings")}
              >
                <i className="fas fa-cog me-2"></i> Cài Đặt
              </button>
            </div>
          </div>

          <div className="col-lg-9">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                {" "}
                <h2 className="h5 mb-0">
                  {activeTab === "profile" && "Hồ Sơ Của Tôi"}
                  {activeTab === "bookings" && "Đặt Tour Của Tôi"}
                  {activeTab === "favorites" && "Tour Yêu Thích Của Tôi"}
                  {activeTab === "settings" && "Cài Đặt Tài Khoản"}
                </h2>
              </div>
              <div className="card-body p-4">
                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <div>
                    <div className="mb-4">                      <h3 className="h6 text-uppercase text-muted mb-3">
                        Thông Tin Cá Nhân
                      </h3>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <div className="mb-2 text-muted small">Họ Và Tên</div>
                          <div className="fw-bold">
                            {user?.fullName || "Chưa cung cấp"}
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          {" "}
                          <div className="mb-2 text-muted small">
                            Tên Đăng Nhập
                          </div>
                          <div className="fw-bold">
                            {user?.username || "Chưa cung cấp"}
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div className="mb-2 text-muted small">
                            Địa Chỉ Email
                          </div>
                          <div className="fw-bold">
                            {user?.email || "Chưa cung cấp"}
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div className="mb-2 text-muted small">
                            Số Điện Thoại
                          </div>
                          <div className="fw-bold">
                            {user?.phoneNumber || "Chưa cung cấp"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end">
                      {" "}
                      <Link to="/profile/edit" className="btn btn-primary">
                        <i className="fas fa-edit me-2"></i> Chỉnh Sửa Hồ Sơ
                      </Link>
                    </div>
                  </div>
                )}

                {/* Bookings Tab */}
                {activeTab === "bookings" && (
                  <div>
                    {loading ? (
                      <LoadingSpinner message="Đang tải đặt tour của bạn..." />
                    ) : error ? (
                      <div className="alert alert-danger" role="alert">
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {error}
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                        <h3 className="h5 mb-3">Chưa Có Đặt Tour Nào</h3>
                        <p className="text-muted mb-4">
                          Bạn chưa đặt tour nào.
                        </p>
                        <Link to="/tours" className="btn btn-primary">
                          Khám Phá Tour
                        </Link>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle">
                          {" "}
                          <thead className="table-light">
                            <tr>
                              <th>Tên Tour</th>
                              <th>Ngày Đặt</th>
                              <th>Ngày Đi</th>
                              <th>Ngày Về</th>
                              <th>Số Tiền</th>
                              <th>Trạng Thái</th>
                              <th>Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookings.map((booking) => (
                              <tr key={booking.id}>
                                <td>
                                  <Link
                                    to={`/tours/${booking.tourId}`}
                                    className="text-decoration-none"
                                  >
                                    {booking.tourName || "Tour chưa xác định"}
                                  </Link>
                                </td>
                                <td>{formatDate(booking.bookingTime)}</td>
                                <td>{formatDate(booking.checkInDate)}</td>
                                <td>{formatDate(booking.checkOutDate)}</td>
                                <td>
                                  {booking.totalAmount?.toLocaleString("vi-VN")}{" "}
                                  ₫
                                </td>
                                <td>
                                  <span
                                    className={`badge ${getStatusBadgeClass(
                                      booking.status
                                    )}`}
                                  >
                                    {formatStatus(booking.status)}
                                  </span>
                                </td>
                                <td>
                                  <div className="btn-group">
                                    <Link
                                      to={`/bookings/${booking.id}`}                                      className="btn btn-sm btn-outline-primary"
                                      title="Xem Chi Tiết"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </Link>
                                    {booking.status === "PENDING" ||
                                    booking.status === "CONFIRMED" ? (
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() =>
                                          handleCancelBooking(booking.id)
                                        }
                                        title="Hủy Đặt Tour"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Favorites Tab */}
                {activeTab === "favorites" && (
                  <div className="text-center py-5">
                    <i className="fas fa-heart fa-3x text-muted mb-3"></i>                    <h3 className="h5 mb-3">Chưa Có Tour Yêu Thích</h3>
                    <p className="text-muted mb-4">
                      Bạn chưa thêm tour nào vào danh sách yêu thích.
                    </p>
                    <Link to="/tours" className="btn btn-primary">
                      Khám Phá Tour
                    </Link>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === "settings" && (
                  <div>
                    <div className="row mb-4">
                      <div className="col-md-6 mb-4 mb-md-0">
                        <div className="card h-100 border">
                          <div className="card-body">                            <h3 className="h6 mb-3">Đổi Mật Khẩu</h3>
                            <p className="text-muted small mb-3">
                              Cập nhật mật khẩu để bảo mật tài khoản của bạn
                            </p>
                            <button className="btn btn-sm btn-outline-primary">
                              Đổi Mật Khẩu
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="card h-100 border">
                          <div className="card-body">
                            <h3 className="h6 mb-3">Thông Báo Qua Email</h3>
                            <p className="text-muted small mb-3">
                              Quản lý tùy chọn thông báo qua email của bạn
                            </p>
                            <button className="btn btn-sm btn-outline-primary">
                              Cài Đặt Thông Báo
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-4 mb-md-0">
                        <div className="card h-100 border">
                          <div className="card-body">
                            {" "}
                            <h3 className="h6 mb-3">Phương Thức Thanh Toán</h3>
                            <p className="text-muted small mb-3">
                              Quản lý các phương thức thanh toán đã lưu
                            </p>
                            <button className="btn btn-sm btn-outline-primary">
                              Quản Lý Thanh Toán
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="card h-100 border border-danger">
                          <div className="card-body">                            <h3 className="h6 text-danger mb-3">
                              Xóa Tài Khoản
                            </h3>
                            <p className="text-muted small mb-3">
                              Xóa vĩnh viễn tài khoản và tất cả dữ liệu của bạn
                            </p>
                            <button className="btn btn-sm btn-outline-danger">
                              Xóa Tài Khoản
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
