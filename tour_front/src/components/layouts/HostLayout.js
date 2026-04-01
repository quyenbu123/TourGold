import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../common/ErrorBoundary';
import '../../styles/hostLayout.css';

const NAV_ITEMS = [
  { to: '/host/dashboard', label: 'Bảng điều khiển', icon: 'fas fa-tachometer-alt' },
  { to: '/host/add-tour', label: 'Tạo tour mới', icon: 'fas fa-plus-circle' },
];

const HostLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const getIsMobile = () => (typeof window !== 'undefined' ? window.innerWidth < 992 : false);
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileSidebar(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setShowMobileSidebar(false);
  }, [location.pathname]);

  const displayName = useMemo(() => user?.fullName || user?.username || 'Nhà tổ chức', [user]);
  const email = useMemo(() => user?.email || 'no-reply@example.com', [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Không thể đăng xuất:', error);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setShowMobileSidebar((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const sidebarClass = [
    'host-sidebar',
    sidebarCollapsed ? 'collapsed' : '',
    showMobileSidebar ? 'show' : '',
    'bg-white',
    'border-end',
    'shadow-sm',
  ]
    .filter(Boolean)
    .join(' ');

  const sidebarStyle = {
    width: sidebarCollapsed ? 72 : 260,
    transition: 'width 0.3s ease, transform 0.3s ease',
    position: isMobile ? 'fixed' : 'relative',
    inset: isMobile ? '0 auto 0 0' : undefined,
    height: isMobile ? '100vh' : 'auto',
    transform: isMobile && !showMobileSidebar ? 'translateX(-100%)' : 'translateX(0)',
    zIndex: isMobile ? 1040 : 1020,
  };

  return (
    <div className="host-layout d-flex min-vh-100 bg-light">
  <aside className={sidebarClass} style={sidebarStyle}>
        <div className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom">
          <Link to="/host/dashboard" className="text-decoration-none text-dark fw-bold">
            <i className="fas fa-compass me-2 text-primary"></i>
            {!sidebarCollapsed && <span>Trung tâm host</span>}
          </Link>
          {isMobile && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={toggleSidebar}
              aria-label="Đóng thanh bên"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <nav className="py-3">
          <ul className="nav flex-column">
            {NAV_ITEMS.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'nav-link',
                      'px-3',
                      'py-2',
                      'd-flex',
                      'align-items-center',
                      sidebarCollapsed ? 'justify-content-center' : '',
                      isActive ? 'active text-primary fw-semibold' : 'text-dark',
                    ].join(' ')
                  }
                >
                  <i className={`${item.icon} ${sidebarCollapsed ? 'mx-auto' : 'me-2'}`}></i>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto px-3 pb-3">
          <div className="border rounded p-3 bg-light text-center">
            <div className="mb-2">
              <i className="fas fa-user-circle fa-2x text-primary"></i>
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="fw-semibold">{displayName}</div>
                <div className="text-muted small text-truncate" title={email}>
                  {email}
                </div>
              </>
            )}
            <button type="button" className="btn btn-outline-danger btn-sm w-100 mt-3" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt me-1"></i>
              {!sidebarCollapsed && 'Đăng xuất'}
            </button>
          </div>
        </div>
      </aside>

      {isMobile && showMobileSidebar && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1030 }}
          onClick={toggleSidebar}
        ></div>
      )}

      <div className="flex-grow-1 d-flex flex-column">
        <header className="border-bottom bg-white shadow-sm">
          <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary d-lg-none"
                  onClick={toggleSidebar}
                  aria-label="Mở hoặc đóng thanh bên"
                >
                  <i className="fas fa-bars"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary d-none d-lg-inline-flex"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  aria-label="Thu gọn thanh điều hướng"
                >
                  <i className={`fas fa-angle-double-${sidebarCollapsed ? 'right' : 'left'}`}></i>
                </button>
                <h1 className="h5 mb-0">Trung tâm host</h1>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="text-end">
                  <div className="fw-semibold">{displayName}</div>
                  <div className="text-muted small">{email}</div>
                </div>
                <Link to="/" className="btn btn-outline-primary btn-sm">
                  <i className="fas fa-globe me-1"></i> Trang chính
                </Link>
              </div>
            </div>
          </div>
        </header>

  <main className="flex-grow-1 p-4">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        <footer className="border-top bg-white py-3">
          <div className="container-fluid d-flex justify-content-between text-muted small">
            <span>&copy; {new Date().getFullYear()} Trung tâm host</span>
            <span>Luôn cập nhật trải nghiệm tour của bạn</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HostLayout;
