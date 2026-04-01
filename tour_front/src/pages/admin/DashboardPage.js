import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import tourService from "../../services/tourService";
import bookingService from "../../services/bookingService";
import LoadingSpinner from "../../components/common/LoadingSpinner";

/**
 * AdminDashboardPage Component
 * Enhanced dashboard for administrators with visualizations and analytics
 */
const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTours: 0,
    totalBookings: 0,
    pendingBookings: 0,
    revenue: 0,
    recentBookings: [],
    tourTypes: [],
    monthlySales: [],
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("week");
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get tours data
      const tours = await tourService.getAllTours();

      // Get bookings data
      const bookings = await bookingService.getAllBookings();

      // Get tour types from tours
      const tourTypesCount = tours.reduce((counts, tour) => {
        if (tour.typeOfTourEntities && tour.typeOfTourEntities.length > 0) {
          tour.typeOfTourEntities.forEach((type) => {
            counts[type.name] = (counts[type.name] || 0) + 1;
          });
        }
        return counts;
      }, {});

      const tourTypesData = Object.entries(tourTypesCount).map(
        ([name, count]) => ({
          name,
          count,
        })
      );

      // Calculate pending bookings
      const pendingBookings = bookings.filter(
        (booking) =>
          booking.status === "PENDING" ||
          (booking.status && booking.status.name === "PENDING")
      ).length;

      // Calculate total revenue
      const revenue = bookings.reduce((total, booking) => {
        const amount =
          booking.totalAmount ||
          (booking.invoice ? booking.invoice.totalAmount : 0);
        return total + (amount || 0);
      }, 0);

      // Generate monthly sales data for the current year
      const currentYear = new Date().getFullYear();
      const monthlySalesMap = bookings.reduce((months, booking) => {
        if (booking.bookingTime || booking.createdAt) {
          const bookingDate = new Date(
            booking.bookingTime || booking.createdAt
          );
          if (bookingDate.getFullYear() === currentYear) {
            const month = bookingDate.getMonth();
            const amount =
              booking.totalAmount ||
              (booking.invoice ? booking.invoice.totalAmount : 0);
            months[month] = (months[month] || 0) + (amount || 0);
          }
        }
        return months;
      }, {});

      const monthlySales = Array.from({ length: 12 }, (_, i) => ({
        month: `Tháng ${i + 1}`,
        sales: monthlySalesMap[i] || 0,
      }));

      // Get recent bookings (last 5)
      const sortedBookings = [...bookings].sort((a, b) => {
        const dateA = new Date(a.bookingTime || a.createdAt || 0);
        const dateB = new Date(b.bookingTime || b.createdAt || 0);
        return dateB - dateA;
      });

      const recentBookings = sortedBookings.slice(0, 5).map((booking) => {
        return {
          id: booking.id,
          userName: booking.user
            ? booking.user.fullName || booking.user.username
            : "Khách chưa xác định",
          tourName: booking.tour ? booking.tour.name : "Tour chưa xác định",
          date: booking.bookingTime || booking.createdAt,
          totalAmount:
            booking.totalAmount ||
            (booking.invoice ? booking.invoice.totalAmount : 0),
          status: booking.status,
        };
      });

      // Calculate pending payments
      const pendingPayments = bookings.filter(
        (booking) =>
          booking.status === "PAYMENT_PENDING" ||
          (booking.status && booking.status.name === "PAYMENT_PENDING")
      ).length;

      setStats({
        totalTours: tours.length,
        totalBookings: bookings.length,
        pendingBookings,
        revenue,
        recentBookings,
        tourTypes: tourTypesData,
        monthlySales,
        pendingPayments,
      });

      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-hide welcome message after 5 seconds
    const welcomeTimer = setTimeout(() => {
      setShowWelcomeMessage(false);
    }, 5000);

    return () => clearTimeout(welcomeTimer);
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const statusName =
      typeof status === "object" && status !== null ? status.name : status;

    switch (String(statusName).toUpperCase()) {
      case "CONFIRMED":
        return "bg-success";
      case "PENDING":
        return "bg-warning text-dark";
      case "CANCELLED":
        return "bg-danger";
      case "COMPLETED":
        return "bg-info";
      case "PAYMENT_PENDING":
        return "bg-warning text-dark";
      case "PAYMENT_CONFIRMED":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  };

  // Handle retry
  const handleRetry = () => {
    fetchDashboardData();
  };

  return (
    <div className="admin-dashboard-page">
      {loading ? (
        <LoadingSpinner message="Đang tải dữ liệu bảng điều khiển..." />
      ) : error ? (
        <div className="alert alert-danger mb-4" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={handleRetry}
            >
              <i className="fas fa-sync-alt me-1"></i> Thử lại
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Welcome Message */}
          {showWelcomeMessage && (
            <div
              className="alert alert-info alert-dismissible fade show mb-4"
              role="alert"
            >
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <i className="fas fa-info-circle fa-2x me-3"></i>
                </div>
                <div>
                  {" "}
                  <h4 className="alert-heading mb-1">
                    Xin chào, {user?.fullName || user?.username || "Admin"}!
                  </h4>
                  <p className="mb-0">
                    Bạn có {stats.pendingBookings} đặt tour đang chờ xử lý cần
                    được chú ý.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="alert"
                aria-label="Close"
                onClick={() => setShowWelcomeMessage(false)}
              ></button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="row g-4 mb-4">
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100 overflow-hidden">
                <div className="card-body position-relative">
                  <div className="position-absolute top-0 end-0 opacity-10">
                    <i className="fas fa-map-marked-alt fa-4x text-primary"></i>
                  </div>{" "}
                  <h6 className="text-muted mb-2">Tổng Số Tour</h6>
                  <h2 className="mb-1 display-5">{stats.totalTours}</h2>
                  <div className="d-flex align-items-center">
                    <span className="badge rounded-pill bg-success-subtle text-success me-2">
                      <i className="fas fa-arrow-up me-1"></i>12%
                    </span>
                    <small className="text-muted">so với tháng trước</small>
                  </div>
                </div>
                <div className="card-footer bg-primary bg-opacity-10 py-2">
                  <Link
                    to="/admin/tours"
                    className="text-decoration-none d-flex justify-content-between align-items-center"
                  >
                    <span className="text-primary">Xem tất cả tour</span>
                    <i className="fas fa-arrow-right text-primary"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100 overflow-hidden">
                <div className="card-body position-relative">
                  <div className="position-absolute top-0 end-0 opacity-10">
                    <i className="fas fa-ticket-alt fa-4x text-success"></i>
                  </div>{" "}
                  <h6 className="text-muted mb-2">Tổng Số Đặt Tour</h6>
                  <h2 className="mb-1 display-5">{stats.totalBookings}</h2>
                  <div className="d-flex align-items-center">
                    <span className="badge rounded-pill bg-success-subtle text-success me-2">
                      <i className="fas fa-arrow-up me-1"></i>8%
                    </span>
                    <small className="text-muted">so với tháng trước</small>
                  </div>
                </div>
                <div className="card-footer bg-success bg-opacity-10 py-2">
                  <Link
                    to="/admin/bookings"
                    className="text-decoration-none d-flex justify-content-between align-items-center"
                  >
                    <span className="text-success">Xem tất cả đặt tour</span>
                    <i className="fas fa-arrow-right text-success"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100 overflow-hidden">
                <div className="card-body position-relative">
                  <div className="position-absolute top-0 end-0 opacity-10">
                    <i className="fas fa-clock fa-4x text-warning"></i>
                  </div>{" "}
                  <h6 className="text-muted mb-2">Đặt Tour Đang Chờ</h6>
                  <h2 className="mb-1 display-5">{stats.pendingBookings}</h2>
                  <div className="d-flex align-items-center">
                    {stats.pendingBookings > 0 ? (
                      <span className="badge rounded-pill bg-warning-subtle text-warning">
                        Cần chú ý
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-success-subtle text-success">
                        Đã xử lý hết
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-footer bg-warning bg-opacity-10 py-2">
                  <Link
                    to="/admin/bookings?status=pending"
                    className="text-decoration-none d-flex justify-content-between align-items-center"
                  >
                    <span className="text-warning">Xem đặt tour đang chờ</span>
                    <i className="fas fa-arrow-right text-warning"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100 overflow-hidden">
                <div className="card-body position-relative">
                  <div className="position-absolute top-0 end-0 opacity-10">
                    <i className="fas fa-money-bill-wave fa-4x text-info"></i>
                  </div>{" "}
                  <h6 className="text-muted mb-2">Tổng Doanh Thu</h6>
                  <h2 className="mb-1 display-5">
                    {formatCurrency(stats.revenue)}
                  </h2>
                  <div className="d-flex align-items-center">
                    <span className="badge rounded-pill bg-success-subtle text-success me-2">
                      <i className="fas fa-arrow-up me-1"></i>15%
                    </span>
                    <small className="text-muted">so với tháng trước</small>
                  </div>
                </div>
                <div className="card-footer bg-info bg-opacity-10 py-2">
                  <Link
                    to="/admin/reports"
                    className="text-decoration-none d-flex justify-content-between align-items-center"
                  >
                    <span className="text-info">Xem báo cáo tài chính</span>
                    <i className="fas fa-arrow-right text-info"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100 overflow-hidden">
                <div className="card-body position-relative">
                  <div className="position-absolute top-0 end-0 opacity-10">
                    <i className="fas fa-money-check-alt fa-4x text-info"></i>
                  </div>{" "}
                  <h6 className="text-muted mb-2">Thanh Toán Đang Chờ</h6>
                  <h2 className="mb-1 display-5">
                    {stats.pendingPayments || 0}
                  </h2>
                  <div className="d-flex align-items-center">
                    {stats.pendingPayments > 0 ? (
                      <span className="badge rounded-pill bg-info-subtle text-info">
                        Cần phê duyệt
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-success-subtle text-success">
                        Đã xử lý hết
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-footer bg-info bg-opacity-10 py-2">
                  <Link
                    to="/admin/pending-payments"
                    className="text-decoration-none d-flex justify-content-between align-items-center"
                  >
                    <span className="text-info">Xem thanh toán đang chờ</span>
                    <i className="fas fa-arrow-right text-info"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart + Tour Types */}
          <div className="row g-4 mb-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm">
                {" "}
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Doanh Thu Theo Tháng</h5>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className={`btn ${
                        timeRange === "week"
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => setTimeRange("week")}
                    >
                      Tuần
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        timeRange === "month"
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => setTimeRange("month")}
                    >
                      Tháng
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        timeRange === "year"
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => setTimeRange("year")}
                    >
                      Năm
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="chart-container" style={{ height: "250px" }}>
                    <div className="revenue-chart">
                      {/* Revenue Chart - Simplified visualization using CSS */}
                      <div className="d-flex align-items-end h-100">
                        {stats.monthlySales.map((data, index) => {
                          const maxValue = Math.max(
                            ...stats.monthlySales.map((item) => item.sales)
                          );
                          const percentage = maxValue
                            ? (data.sales / maxValue) * 100
                            : 0;

                          return (
                            <div
                              key={index}
                              className="flex-grow-1 mx-1 d-flex flex-column align-items-center"
                            >
                              <div
                                className="bg-primary rounded-top"
                                style={{
                                  height: `${percentage}%`,
                                  width: "100%",
                                  minHeight: data.sales > 0 ? "5px" : "0",
                                  transition: "height 0.5s ease",
                                }}
                              ></div>
                              <div
                                className="text-muted mt-2 small"
                                style={{ fontSize: "10px" }}
                              >
                                {data.month}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white">
                  <h5 className="mb-0">Danh mục tour</h5>
                </div>
                <div className="card-body">
                  {stats.tourTypes.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-tag fa-2x text-muted mb-3"></i>
                      <p className="mb-0">Chưa có danh mục tour</p>
                    </div>
                  ) : (
                    <div>
                      {stats.tourTypes.map((type, index) => {
                        const maxCount = Math.max(
                          ...stats.tourTypes.map((t) => t.count)
                        );
                        const percentage = (type.count / maxCount) * 100;

                        // Generate colors based on index
                        const colors = [
                          "primary",
                          "success",
                          "warning",
                          "info",
                          "danger",
                          "secondary",
                        ];
                        const color = colors[index % colors.length];

                        return (
                          <div key={index} className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                              <span>{type.name}</span>
                              <span className="text-muted">
                                {type.count} hành trình
                              </span>
                            </div>
                            <div className="progress" style={{ height: "8px" }}>
                              <div
                                className={`progress-bar bg-${color}`}
                                style={{ width: `${percentage}%` }}
                                role="progressbar"
                                aria-valuenow={percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white">
                  <h5 className="mb-0">Tác vụ nhanh</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-3">
                      <Link
                        to="/admin/tours/add"
                        className="card text-decoration-none text-center p-4 border-0 shadow-sm h-100 quick-action-card"
                      >
                        <div className="text-primary mb-3">
                          <i className="fas fa-plus-circle fa-3x"></i>
                        </div>
                        <h6 className="mb-2">Thêm tour mới</h6>
                        <p className="mb-0 small text-muted">
                          Tạo gói tour mới với đầy đủ thông tin cần thiết
                        </p>
                      </Link>
                    </div>
                    <div className="col-md-3">
                      <Link
                        to="/admin/bookings"
                        className="card text-decoration-none text-center p-4 border-0 shadow-sm h-100 quick-action-card"
                      >
                        <div className="text-success mb-3">
                          <i className="fas fa-clipboard-check fa-3x"></i>
                        </div>
                        <h6 className="mb-2">Quản lý đặt tour</h6>
                        <p className="mb-0 small text-muted">
                          Xem và xử lý các đơn đặt tour của khách hàng
                        </p>
                      </Link>
                    </div>
                    <div className="col-md-3">
                      <Link
                        to="/test-payment"
                        className="card text-decoration-none text-center p-4 border-0 shadow-sm h-100 quick-action-card"
                      >
                        <div className="text-warning mb-3">
                          <i className="fas fa-bolt fa-3x"></i>
                        </div>
                        <h6 className="mb-2">Kiểm tra thanh toán</h6>
                        <p className="mb-0 small text-muted">
                          Giả lập thông báo thanh toán để kiểm thử
                        </p>
                      </Link>
                    </div>
                    <div className="col-md-3">
                      <Link
                        to="/admin/settings"
                        className="card text-decoration-none text-center p-4 border-0 shadow-sm h-100 quick-action-card"
                      >
                        <div className="text-secondary mb-3">
                          <i className="fas fa-cog fa-3x"></i>
                        </div>
                        <h6 className="mb-2">Cài đặt hệ thống</h6>
                        <p className="mb-0 small text-muted">
                          Cấu hình tùy chọn và tham số vận hành
                        </p>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Đặt tour gần đây</h5>
                  <Link
                    to="/admin/bookings"
                    className="btn btn-sm btn-outline-primary"
                  >
                    Xem tất cả
                  </Link>
                </div>
                <div className="card-body p-0">
                  {stats.recentBookings.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                      <h6 className="mb-0">Chưa có đơn đặt tour</h6>
                      <p className="text-muted mb-0">
                        Các đơn đặt tour sẽ xuất hiện tại đây khi khách hàng hoàn tất đặt chỗ
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Mã đơn</th>
                            <th>Khách hàng</th>
                            <th>Tour</th>
                            <th>Ngày</th>
                            <th>Số tiền</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentBookings.map((booking) => (
                            <tr key={booking.id}>
                              <td>#{booking.id}</td>
                              <td>{booking.userName || "Khách chưa xác định"}</td>
                              <td>
                                <div
                                  className="text-truncate"
                                  style={{ maxWidth: "200px" }}
                                >
                                  {booking.tourName || "Tour chưa xác định"}
                                </div>
                              </td>
                              <td>{formatDate(booking.date)}</td>
                              <td>
                                {formatCurrency(booking.totalAmount || 0)}
                              </td>
                              <td>
                                <span
                                  className={`badge ${getStatusBadgeClass(
                                    booking.status
                                  )}`}
                                >
                                  {typeof booking.status === "object" &&
                                  booking.status !== null
                                    ? booking.status.name
                                    : booking.status || "Không xác định"}
                                </span>
                              </td>
                              <td>
                                <Link
                                  to={`/admin/bookings/${booking.id}`}
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  Chi tiết
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
