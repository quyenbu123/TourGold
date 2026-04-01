import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ErrorBoundary from "../common/ErrorBoundary";

/**
 * AdminLayout Component
 * Enhanced layout for admin dashboard with modern UI elements
 */
const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    window.innerWidth < 992
  );
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("adminDarkMode") === "true"
  );
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Đặt Tour Mới",
      message: "Bạn có một yêu cầu đặt tour mới",
      time: "5 phút trước",
      read: false,
    },
    {
      id: 2,
      title: "Cập Nhật Hệ Thống",
      message: "Hệ thống sẽ bảo trì vào tối nay",
      time: "2 giờ trước",
      read: true,
    },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 992);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("admin-dark-mode");
    } else {
      document.body.classList.remove("admin-dark-mode");
    }
    localStorage.setItem("adminDarkMode", darkMode);
  }, [darkMode]);

  // Check if current route is active
  const isActiveRoute = (route) => {
    if (route === "/admin" && location.pathname === "/admin") {
      return true;
    }
    return location.pathname.startsWith(route) && route !== "/admin";
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Handle notification toggle
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  // Calculate unread notifications count
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  return (
    <div className={`admin-layout d-flex ${darkMode ? "dark-mode" : ""}`}>
      {/* Sidebar */}
      <div
        className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${
          darkMode ? "bg-dark" : "bg-primary"
        }`}
        style={{
          width: sidebarCollapsed ? "70px" : "260px",
          transition: "width 0.3s ease",
        }}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header d-flex align-items-center p-3 border-bottom border-secondary">
          {" "}
          <Link
            to="/admin"
            className="d-flex align-items-center text-decoration-none text-white"
          >
            <i className="fas fa-mountain fs-4 me-2"></i>
            {!sidebarCollapsed && (
              <span className="fs-5 fw-bold">Quản Trị Tour</span>
            )}
          </Link>
          <button
            className="btn btn-link text-white ms-auto d-none d-lg-block"
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <i
              className={`fas fa-angle-${sidebarCollapsed ? "right" : "left"}`}
            ></i>
          </button>
        </div>

        {/* Admin Navigation */}
        <nav className="py-3 flex-grow-1">
          <ul className="nav flex-column">
            <li className="nav-item mb-2">
              <Link
                to="/admin"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin") && !isActiveRoute("/admin/tours")
                    ? "active"
                    : ""
                }`}
              >
                {" "}
                <i className="fas fa-tachometer-alt me-2"></i>
                {!sidebarCollapsed && <span>Tổng Quan</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Tổng Quan</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/tours"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/tours") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-map-marked-alt me-2"></i>
                {!sidebarCollapsed && <span>Tour</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Tour</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/bookings"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/bookings") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-ticket-alt me-2"></i>
                {!sidebarCollapsed && <span>Đặt Tour</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Đặt Tour</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/users"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/users") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-users me-2"></i>
                {!sidebarCollapsed && <span>Người Dùng</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Người Dùng</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/host-registrations"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/host-registrations") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-user-tie me-2"></i>
                {!sidebarCollapsed && <span>Duyệt Host</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Duyệt Host</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/promotions"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/promotions") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-tags me-2"></i>
                {!sidebarCollapsed && <span>Khuyến Mãi</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Khuyến Mãi</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/announcements"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/announcements") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-bell me-2"></i>
                {!sidebarCollapsed && <span>Thông Báo</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Thông Báo</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/broadcast"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/broadcast") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-bullhorn me-2"></i>
                {!sidebarCollapsed && <span>Gửi Thông Báo</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Gửi Thông Báo</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/reports"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/reports") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-chart-bar me-2"></i>
                {!sidebarCollapsed && <span>Báo Cáo</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Báo Cáo</span>
                )}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/settings"
                className={`nav-link text-white py-2 px-3 d-flex align-items-center ${
                  isActiveRoute("/admin/settings") ? "active" : ""
                }`}
              >
                {" "}
                <i className="fas fa-cog me-2"></i>
                {!sidebarCollapsed && <span>Cài Đặt</span>}
                {sidebarCollapsed && (
                  <span className="admin-tooltip">Cài Đặt</span>
                )}
              </Link>
            </li>
          </ul>
        </nav>

        {/* User Profile in Sidebar */}
        <div className="mt-auto p-3 border-top border-secondary">
          <div
            className={`d-flex ${
              sidebarCollapsed ? "justify-content-center" : "align-items-center"
            }`}
          >
            {!sidebarCollapsed ? (
              <>
                <div className="flex-shrink-0">
                  <div className="position-relative">
                    <i className="fas fa-user-circle fs-4 text-white"></i>
                    <span
                      className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white"
                      style={{ width: "12px", height: "12px" }}
                    ></span>
                  </div>
                </div>
                <div className="flex-grow-1 ms-2">
                  <div className="fw-bold text-white">
                    {user?.fullName || user?.username || "Admin User"}
                  </div>
                  <div className="text-white-50 small">
                    {user?.email || "admin@example.com"}
                  </div>
                </div>
                <div>
                  <button
                    className="btn btn-sm btn-outline-light ms-2"
                    onClick={handleLogout}
                    aria-label="Logout"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
              </>
            ) : (
              <button
                className="btn btn-sm btn-outline-light"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-grow-1 d-flex flex-column admin-content ${
          darkMode ? "bg-dark text-white" : "bg-light"
        }`}
        style={{ height: "100vh", overflow: "auto" }}
      >
        {/* Top Navigation */}
        <header
          className={`border-bottom shadow-sm py-2 ${
            darkMode ? "bg-dark text-white border-secondary" : "bg-white"
          }`}
        >
          <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <button
                  className={`btn btn-sm d-lg-none me-2 ${
                    darkMode ? "btn-outline-light" : "btn-outline-dark"
                  }`}
                  onClick={toggleSidebar}
                >
                  <i className="fas fa-bars"></i>
                </button>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb m-0 py-2">
                    <li className="breadcrumb-item">
                      <Link
                        to="/admin"
                        className={darkMode ? "text-light" : ""}
                      >
                        Admin
                      </Link>
                    </li>
                    {location.pathname !== "/admin" && (
                      <li
                        className="breadcrumb-item active"
                        aria-current="page"
                      >
                        {location.pathname.includes("/tours") && "Tours"}
                        {location.pathname.includes("/bookings") && "Bookings"}
                        {location.pathname.includes("/users") && "Users"}
                        {location.pathname.includes("/reports") && "Reports"}
                        {location.pathname.includes("/settings") && "Settings"}
                      </li>
                    )}
                  </ol>
                </nav>
              </div>
              <div className="d-flex align-items-center">
                {/* Notifications */}
                <div className="dropdown me-3 position-relative">
                  {" "}
                  <button
                    className={`btn ${
                      darkMode ? "btn-dark" : "btn-light"
                    } position-relative`}
                    onClick={toggleNotifications}
                  >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {unreadCount}
                        <span className="visually-hidden">
                          thông báo chưa đọc
                        </span>
                      </span>
                    )}
                  </button>
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div
                      className={`position-absolute dropdown-menu dropdown-menu-end show shadow ${
                        darkMode ? "bg-dark text-white border-secondary" : ""
                      }`}
                      style={{ width: "320px", right: 0 }}
                    >
                      {" "}
                      <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                        <h6 className="m-0">Thông Báo</h6>
                        <button
                          className={`btn btn-sm ${
                            darkMode
                              ? "btn-outline-light"
                              : "btn-outline-secondary"
                          }`}
                          onClick={markAllAsRead}
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      </div>
                      <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                        {" "}
                        {notifications.length === 0 ? (
                          <div className="p-3 text-center text-muted">
                            Không có thông báo
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`border-bottom p-3 ${
                                notification.read
                                  ? ""
                                  : darkMode
                                  ? "bg-dark"
                                  : "bg-light"
                              }`}
                            >
                              <div className="d-flex">
                                <div
                                  className={`flex-shrink-0 me-3 ${
                                    notification.read
                                      ? "text-muted"
                                      : "text-primary"
                                  }`}
                                >
                                  <i className="fas fa-info-circle"></i>
                                </div>
                                <div className="flex-grow-1">
                                  <div className="d-flex justify-content-between">
                                    <h6
                                      className={`mb-1 ${
                                        notification.read ? "text-muted" : ""
                                      }`}
                                    >
                                      {notification.title}
                                    </h6>
                                    <small className="text-muted">
                                      {notification.time}
                                    </small>
                                  </div>
                                  <p
                                    className={`mb-0 small ${
                                      notification.read ? "text-muted" : ""
                                    }`}
                                  >
                                    {notification.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>{" "}
                      <div className="p-2 border-top text-center">
                        <Link to="/admin/notifications" className="small">
                          Xem tất cả thông báo
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dark Mode Toggle */}
                <button
                  className={`btn ${darkMode ? "btn-dark" : "btn-light"} me-3`}
                  onClick={toggleDarkMode}
                  title={
                    darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                  }
                >
                  <i className={`fas fa-${darkMode ? "sun" : "moon"}`}></i>
                </button>

                <Link
                  to="/"
                  className={`btn btn-sm ${
                    darkMode ? "btn-outline-light" : "btn-outline-primary"
                  } me-2`}
                >
                  <i className="fas fa-globe me-1"></i> Xem Trang Web
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow-1 p-4">
          <ErrorBoundary>
            {/** Wrap nested routes in Suspense to stabilize render timing */}
            <React.Suspense fallback={<div>Đang tải...</div>}>
              <Outlet />
            </React.Suspense>
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer
          className={`p-3 border-top ${
            darkMode ? "border-secondary text-muted" : "text-muted"
          }`}
        >
          <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center">
              {" "}
              <div>
                <small>
                  &copy; {new Date().getFullYear()} Hệ Thống Quản Lý Tour. Đã
                  đăng ký bản quyền.
                </small>
              </div>
              <div>
                <small>Phiên bản 1.0.0</small>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
