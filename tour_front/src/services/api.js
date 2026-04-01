import axios from "axios";
import { isTokenExpired, isTokenStructureValid } from "../utils/jwtUtils";
import { BACKEND_URL } from "../config/env";

// URL kết nối đến backend

// Xác định trạng thái demo mode dựa trên môi trường
export const isDemoMode =
  process.env.NODE_ENV === "development" ||
  localStorage.getItem("demoMode") === "true" ||
  false; // Đặt false để mặc định tắt

console.log(
  `Application running in ${process.env.NODE_ENV} mode. Demo mode: ${isDemoMode}`
);

// Lấy auth token từ localStorage
export const getAuthToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    // Validate token structure and expiration
    if (!isTokenStructureValid(token)) {
      console.warn("Invalid token structure detected");
      return null;
    }

    if (isTokenExpired(token)) {
      console.warn("Expired token detected");
      return null;
    }

    return token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// URLs that should skip authentication
const PUBLIC_URLS = [
  "/api/v1/auth/login",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/reset-password/validate",
  "/api/v1/register",
  "/api/v1/tours/public",
  "/api/v1/type-of-tours",
];

// URLs that should not trigger logout on 401
const SKIP_LOGOUT_URLS = [
  // Payment related endpoints
  "/api/v1/payment/check/",
  "/payment/check/transactions",
  "/api/v1/payment/casso",
  "/api/v1/payment/vietqr",

  // Tour related endpoints
  "/api/v1/tours/",
  "/api/v1/tours/public",

  // Public data endpoints
  "/api/v1/type-of-tours",
  "/api/v1/service-types",
];

// Cấu hình mặc định cho axios
const getAxiosConfig = () => ({
  baseURL: BACKEND_URL,
  timeout: 120000, // Tăng timeout lên 120 giây
  headers: {
    "Content-Type": "application/json",
  },
  // Tùy chọn cho retry các request bị lỗi mạng
  retry: 3,
  retryDelay: 2000, // Tăng delay giữa các lần retry
});

// Tạo instance axios với cấu hình mặc định
const api = axios.create(getAxiosConfig());

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    // Nếu là lỗi timeout và chưa retry
    if (error.code === "ECONNABORTED" && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log("Request timeout, retrying with increased timeout...");

      // Tăng timeout cho lần retry
      originalRequest.timeout = 180000; // 3 phút cho lần retry

      // Thêm delay trước khi retry
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return api(originalRequest);
    }

    // Xử lý lỗi 401 (Unauthorized) với danh sách URL bỏ qua logout
    if (error.response && error.response.status === 401) {
      const requestUrl = originalRequest.url || "";
      const shouldSkipLogout = SKIP_LOGOUT_URLS.some((url) => requestUrl.includes(url));

      if (!shouldSkipLogout) {
        // Chỉ đăng xuất với các endpoint yêu cầu đăng nhập chặt chẽ (không nằm trong danh sách bỏ qua)
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
      // Trả về lỗi để caller tự xử lý fallback (ví dụ: recommendations có thể trả về [])
      return Promise.reject(error);
    }

    // Log lỗi chi tiết
    console.error("API Error:", {
      url: originalRequest.url,
      method: originalRequest.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
      timeout: originalRequest.timeout,
    });

    return Promise.reject(error);
  }
);

/**
 * Handle 401 Unauthorized errors
 * @param {Object} error - Axios error object
 * @returns {Promise} Promise to reject or retry
 */
const handleUnauthorizedError = (error) => {
  if (!error.response) {
    console.error("Network error occurred:", error);
    return Promise.reject(error);
  }

  const { config } = error.response;
  const requestUrl = config.url;

  // Add debugging
  console.log(`Handling 401 error for URL: ${requestUrl}`);

  // Check if this URL should skip logout
  const SKIP_LOGOUT_URLS = ["/auth/login", "/auth/refresh"];
  const shouldSkipLogout = SKIP_LOGOUT_URLS.some((url) =>
    requestUrl.includes(url)
  );

  // Check if this is a tour operation
  const isTourOperation =
    requestUrl.includes("/api/v1/tours/") &&
    ["put", "post", "delete"].includes(config.method);

  // Log for debugging
  console.log(
    `401 for ${requestUrl}, skip logout: ${shouldSkipLogout}, tour op: ${isTourOperation}`
  );

  // Handle tour operations specially
  if (isTourOperation) {
    console.error(
      "Tour operation failed: Permission denied or authentication issue"
    );

    if (window.location.pathname.includes("/admin/")) {
      // Show notification without logout
      const event = new CustomEvent("auth:permissionError", {
        detail: {
          message:
            "Permission denied. You may not have the right privileges for this operation.",
          endpoint: requestUrl,
        },
      });
      window.dispatchEvent(event);
    }
  } else if (!shouldSkipLogout) {
    // For all other 401 errors that aren't in the skip list
    console.log("Logging out user due to 401 error");
    // Clear authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect to login page if not already there
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login?session=expired";
    }
  }

  return Promise.reject(error);
};

// Helper functions for multipart form data
export const sendMultipartFormData = async (url, formData, config = {}) => {
  try {
    const token = getAuthToken();
    const headers = {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await axios.post(url, formData, {
      ...config,
      headers,
      baseURL: BACKEND_URL,
    });

    return response.data;
  } catch (error) {
    console.error("Error sending multipart form data:", error);
    throw error;
  }
};

/**
 * Create a user-friendly error message from an API error
 * @param {Object} error - Axios error object
 * @returns {Object} User-friendly error object
 */
export const createUserFriendlyError = (error) => {
  const defaultMsg = "Đã xảy ra lỗi khi kết nối với máy chủ";

  if (!error.response) {
    return {
      message: "Không thể kết nối đến máy chủ",
      type: "network",
      original: error,
    };
  }

  switch (error.response.status) {
    case 401:
      return {
        message: "Phiên làm việc đã hết hạn, vui lòng đăng nhập lại",
        type: "auth",
        status: 401,
        original: error,
      };
    case 403:
      return {
        message: "Bạn không có quyền thực hiện thao tác này",
        type: "permission",
        status: 403,
        original: error,
      };
    case 429:
      return {
        message: "Quá nhiều yêu cầu, vui lòng thử lại sau",
        type: "rate-limit",
        status: 429,
        original: error,
      };
    case 404:
      return {
        message: "Không tìm thấy dữ liệu yêu cầu",
        type: "not-found",
        status: 404,
        original: error,
      };
    case 400:
      return {
        message: error.response.data?.message || "Dữ liệu không hợp lệ",
        type: "validation",
        status: 400,
        original: error,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: "Lỗi máy chủ, vui lòng thử lại sau",
        type: "server",
        status: error.response.status,
        original: error,
      };
    default:
      return {
        message: error.response.data?.message || defaultMsg,
        type: "unknown",
        status: error.response.status,
        original: error,
      };
  }
};

export default api;
