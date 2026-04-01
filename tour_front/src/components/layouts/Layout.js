import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import ErrorBoundary from "../common/ErrorBoundary";
import "../../styles/CustomNavbar.css"; // Import các style tùy chỉnh cho navbar

/**
 * Component Layout Chính
 */
const Layout = () => {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHost = hasRole ? hasRole(["ROLE_HOST", "HOST"]) : false;
  const isAdmin = user?.roles?.includes("ROLE_ADMIN");
  const { unreadCount, resetUnread } = useNotifications();
  // Xử lý hiệu ứng cuộn cho navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Đóng menu mobile khi đường dẫn thay đổi
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isHome = location.pathname === "/";
  const navbarClass = `navbar navbar-expand-lg ${
    scrolled || !isHome
      ? "navbar-light navbar-scrolled"
      : "navbar-dark navbar-transparent"
  }`;
  // Avatar mặc định cho người dùng
  const defaultAvatar =
    "https://ui-avatars.com/api/?name=" +
    (user?.username || "Người dùng") +
    "&background=63AB45&color=fff";

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Phần đầu trang */}
      <header className="fixed-top">
        <nav className={navbarClass}>
          <div className="container">
            <Link className="navbar-brand" to="/">
              <img
                src="/assets/images/logos/favicon.png"
                alt="Logo Tour Gold"
                height="40"
                className="d-inline-block align-text-top me-2"
              />
              Tour Gold
            </Link>

            <button
              className={`navbar-toggler ${mobileMenuOpen ? "" : "collapsed"}`}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen ? "true" : "false"}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div
              className={`collapse navbar-collapse ${
                mobileMenuOpen ? "show" : ""
              }`}
              id="navbarNav"
            >
              <ul className="navbar-nav ms-auto align-items-center">
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      location.pathname === "/" ? "active" : ""
                    }`}
                    to="/"
                  >
                    <i className="fas fa-home me-1 d-none d-sm-inline-block"></i>{" "}
                    Trang chủ
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      location.pathname === "/tours" ? "active" : ""
                    }`}
                    to="/tours"
                  >
                    <i className="fas fa-map-marked-alt me-1 d-none d-sm-inline-block"></i>{" "}
                    Tour
                  </Link>
                </li>

                {/* Notifications (public) */}
                <li className="nav-item position-relative">
                  <Link
                    className={`nav-link ${
                      location.pathname === "/announcements" ? "active" : ""
                    }`}
                    to="/announcements"
                    title="Thông báo"
                    onClick={() => resetUnread()}
                  >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                      <span
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                </li>

                <li className="nav-item">
                  <a
                    className="nav-link"
                    href="https://www.facebook.com/BuCatLuong/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fab fa-facebook me-1 d-none d-sm-inline-block"></i>{" "}
                    Facebook
                  </a>
                </li>

                {isAuthenticated && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${
                        location.pathname === "/favorites" ? "active" : ""
                      }`}
                      to="/favorites"
                    >
                      <i className="fas fa-heart me-1"></i> Yêu thích
                    </Link>
                  </li>
                )}

                {isAuthenticated ? (
                  <li className="nav-item dropdown">
                    <button
                      type="button"
                      className="nav-link dropdown-toggle user-dropdown"
                      id="userMenu"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <img
                        src={user?.avatar || defaultAvatar}
                        alt="User Avatar"
                        className="user-avatar"
                      />
                      <span className="d-none d-md-inline">
                        {user?.username || "Tài khoản"}
                      </span>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu">
                      <li>
                        <div className="dropdown-item text-center">
                          <img
                            src={user?.avatar || defaultAvatar}
                            alt="User Avatar"
                            className="user-avatar mb-2"
                            style={{ width: "60px", height: "60px" }}
                          />
                          <h6 className="mb-0">{user?.username}</h6>
                          <small className="text-muted">{user?.email}</small>
                        </div>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>                      <li>
                        <Link className="dropdown-item" to="/dashboard">
                          <i className="fas fa-tachometer-alt me-2"></i>
                          Hồ sơ
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/bookings">
                          <i className="fas fa-ticket-alt me-2"></i>Đặt chỗ của
                          tôi
                        </Link>
                      </li>
                      {(isHost || isAdmin) && (
                        <li>
                          <Link className="dropdown-item" to="/host/dashboard">
                            <i className="fas fa-briefcase me-2"></i>Trung tâm host
                          </Link>
                        </li>
                      )}
                      {!isHost && !isAdmin && (
                        <li>
                          <Link className="dropdown-item" to="/host/apply">
                            <i className="fas fa-clipboard-check me-2"></i>Đăng ký trở thành host
                          </Link>
                        </li>
                      )}
                      {isAdmin && (
                        <li>                          <Link className="dropdown-item" to="/admin">
                            <i className="fas fa-user-shield me-2"></i>Quản trị
                          </Link>
                        </li>
                      )}
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      <li>
                        <button
                          className="dropdown-item text-danger"
                          onClick={handleLogout}
                        >
                          <i className="fas fa-sign-out-alt me-2"></i>Đăng xuất
                        </button>
                      </li>
                    </ul>
                  </li>
                ) : (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/login">
                        <i className="fas fa-sign-in-alt me-1"></i> Đăng nhập
                      </Link>
                    </li>
                    <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
                      <Link to="/register" className="btn btn-primary">
                        <i className="fas fa-user-plus me-1"></i> Đăng ký
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </nav>
      </header>      {/* Khoảng cách cho phần đầu trang cố định - động dựa trên chiều cao navbar */}
      <div
        style={{
          paddingTop: scrolled ? "76px" : "86px",
          transition: "padding 0.3s ease",
        }}
      ></div>

      {/* Nội dung chính */}
      <main className="flex-grow-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Phần chân trang - Giữ mã hiện có */}
      <footer className="bg-dark text-white py-4">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-5">
              <h5>Tour Gold</h5>
              <p className="mb-3">
                Điểm đến hàng đầu cho trải nghiệm du lịch tuyệt vời
              </p>
              <div className="mb-3">
                <a href="#" className="text-white me-3">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="#" className="text-white me-3">
                  <i className="fab fa-instagram"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="fab fa-twitter"></i>
                </a>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <h5>Liên kết</h5>
              <ul className="list-unstyled">
                <li>
                  <Link to="/" className="link-light text-decoration-none">
                    Trang chủ
                  </Link>
                </li>
                <li>
                  <Link to="/tours" className="link-light text-decoration-none">
                    Tour
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="link-light text-decoration-none">
                    Đăng nhập
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-sm-6 col-lg-4">
              <h5>Đăng ký nhận thông tin</h5>
              <div className="input-group">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email của bạn"
                />
                <button className="btn btn-primary" type="button">
                  Đăng ký
                </button>
              </div>
            </div>
          </div>

          <hr className="my-3 opacity-25" />

          <div className="text-center">
            <p className="mb-0">
              &copy; {new Date().getFullYear()} Tour Gold. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
