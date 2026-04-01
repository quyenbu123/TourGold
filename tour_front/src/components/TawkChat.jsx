import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Tawk embed constants
const TAWK_SRC = "https://embed.tawk.to/68eb8daeec7a4f19550100b3/1j7c22slq";

function loadTawkScript() {
  if (document.getElementById("tawk-script")) return; // already loaded
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = TAWK_SRC;
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  s1.id = "tawk-script";
  const s0 = document.getElementsByTagName("script")[0];
  s0.parentNode.insertBefore(s1, s0);
}

const FloatingLoginChatButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="Đăng nhập để chat với hỗ trợ"
    style={{
      position: "fixed",
      right: 20,
      bottom: 20,
      zIndex: 9999,
      borderRadius: 24,
      padding: "10px 14px",
      backgroundColor: "#28a745",
      color: "#fff",
      border: "none",
      boxShadow: "0 4px 10px rgba(0,0,0,.15)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
    }}
  >
    <i className="fas fa-comments"></i>
    <span className="d-none d-sm-inline">Chat hỗ trợ</span>
  </button>
);

const TawkChat = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const onLoginChatClick = () => {
    // Redirect to login, remember current path to return later if your app supports it
    navigate("/login", { state: { from: location.pathname } });
  };

  // Load Tawk only when:
  // - user is authenticated
  // - NOT on admin routes
  useEffect(() => {
    const isAdminRoute = location.pathname.startsWith("/admin");

    if (isAuthenticated && !isAdminRoute) {
      // Expose Tawk API before script loads (as recommended by Tawk)
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();
      loadTawkScript();
    }

    // Optional cleanup: we do not remove Tawk script to avoid reloading between pages
    // If needed, we could hide widget on admin route
    if (window.Tawk_API) {
      try {
        if (isAdminRoute) {
          window.Tawk_API.hideWidget && window.Tawk_API.hideWidget();
        } else if (isAuthenticated) {
          window.Tawk_API.showWidget && window.Tawk_API.showWidget();
        }
      } catch (e) {
        // ignore
      }
    }
  }, [isAuthenticated, location.pathname]);

  // Render nothing if on admin pages
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  // If not logged in, render a floating button that redirects to login when clicked
  if (!isAuthenticated) {
    return <FloatingLoginChatButton onClick={onLoginChatClick} />;
  }

  // If logged in, let Tawk widget render itself
  return null;
};

export default TawkChat;

