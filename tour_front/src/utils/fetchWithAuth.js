/**
 * Makes authenticated fetch requests by adding the auth token from localStorage
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - The parsed response
 */
export const fetchWithAuth = async (url, options = {}) => {
  try {
    // Set authorization header if token exists
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Make the fetch request with auth headers
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - token expired or invalid
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        throw new Error(
          "Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại."
        );
      }

      // Try to get error details from response
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
  errorDetails = { message: "Đã xảy ra lỗi không xác định" };
      }

      throw new Error(
        errorDetails.message ||
          `Yêu cầu không thành công với mã trạng thái ${response.status}`
      );
    }

    // Check if response is empty
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return data;
    }

    return {};
  } catch (error) {
    console.error("Fetch with auth error:", error);
    throw error;
  }
};
