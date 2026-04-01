import api from "./api";
import authService from "./authService";
import { getUserIdFromToken } from "../utils/jwtUtils";

/**
 * Service for booking-related API calls
 */
const bookingService = {
  /**
   * Create a new booking
   * @param {Object} bookingData - The booking data
   * @returns {Promise} Promise with response data
   */
  createBooking: async (bookingData) => {
    try {
      // Check authentication status
      if (!authService.isAuthenticated()) {
        console.error("User not authenticated");
        throw new Error("Bạn cần đăng nhập để đặt tour");
      }

      // If no userId is provided, try to get it from multiple sources
      if (!bookingData.userId) {
        console.log(
          "No userId provided in bookingData, attempting to retrieve it"
        );

        // Try getting from auth context first
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.id) {
          bookingData.userId = currentUser.id;
          console.log(
            "Retrieved userId from authService.getCurrentUser():",
            bookingData.userId
          );
        } else {
          // If not available from context, try localStorage with multiple possible formats
          const userSources = [
            { key: "user", fields: ["id", "userId", "user_id", "userID"] },
            { key: "userData", fields: ["id", "userId", "user_id", "userID"] },
            {
              key: "currentUser",
              fields: ["id", "userId", "user_id", "userID"],
            },
            { key: "authUser", fields: ["id", "userId", "user_id", "userID"] },
          ];

          for (const source of userSources) {
            try {
              const dataStr = localStorage.getItem(source.key);
              if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data) {
                  for (const field of source.fields) {
                    if (data[field]) {
                      bookingData.userId = data[field];
                      console.log(
                        `Retrieved userId from localStorage.${source.key}.${field}:`,
                        bookingData.userId
                      );
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              console.error(
                `Error retrieving userId from localStorage.${source.key}:`,
                e
              );
            }
          }
        }
      }

      // If still no userId, try to extract it from JWT token
      if (!bookingData.userId) {
        try {
          const token = localStorage.getItem("token");
          if (token) {
            const userId = getUserIdFromToken(token);
            if (userId) {
              bookingData.userId = userId;
              console.log(
                "Retrieved userId from JWT token:",
                bookingData.userId
              );
            }
          }
        } catch (e) {
          console.error("Error extracting userId from token:", e);
        }
      }

      // Final check - if still no userId, can't proceed
      if (!bookingData.userId) {
        console.error("Could not determine userId for booking");
        throw new Error("Không thể xác định ID người dùng để đặt tour");
      }

      console.log("Sending booking request with data:", bookingData);

      // Send API request
      const response = await api.post("/api/v1/bookings", bookingData);
      console.log("Booking created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error creating booking:", error);

      // Enhanced error handling
      let errorMessage = "Đã xảy ra lỗi khi đặt tour. Vui lòng thử lại sau.";

      if (error.response) {
        // Server responded with an error status
        console.error("Error response from server:", error.response.data);

        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = "Bạn cần đăng nhập để đặt tour";
        } else if (error.response.status === 400) {
          errorMessage = "Dữ liệu đặt tour không hợp lệ";
        } else if (error.response.status === 404) {
          errorMessage = "Không tìm thấy thông tin tour";
        } else if (error.response.status === 500) {
          errorMessage = "Lỗi hệ thống. Vui lòng thử lại sau";
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error("No response received:", error.request);
        errorMessage =
          "Không nhận được phản hồi từ máy chủ. Vui lòng kiểm tra kết nối mạng.";
      } else {
        // Error in setting up the request
        console.error("Error setting up request:", error.message);
        errorMessage = error.message || errorMessage;
      }

      throw new Error(errorMessage);
    }
  },

  /**
   * Get all bookings for the current user
   * @returns {Promise} Promise with response data
   */
  getUserBookings: async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        throw new Error("User not authenticated or ID not available");
      }

      const response = await api.get(
        `/api/v1/users/${currentUser.id}/bookings`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      throw error;
    }
  },

  /**
   * Get all bookings (admin only)
   * @returns {Promise} Promise with response data
   */
  getAllBookings: async () => {
    try {
      const response = await api.get("/api/v1/admin/bookings");
      return response.data;
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      throw error;
    }
  },

  /**
   * Get a specific booking by ID
   * @param {number} bookingId - The booking ID
   * @returns {Promise} Promise with response data
   */
  getBookingById: async (bookingId) => {
    try {
      const response = await api.get(`/api/v1/bookings/${bookingId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching booking ${bookingId}:`, error);
      throw error;
    }
  },

  /**
   * Cancel a booking
   * @param {number} bookingId - The booking ID to cancel
   * @returns {Promise} Promise with response data
   */
  cancelBooking: async (bookingId) => {
    try {
      const response = await api.put(`/api/v1/bookings/${bookingId}/status`, {
        status: "CANCELLED",
      });
      return response.data;
    } catch (error) {
      console.error(`Error cancelling booking ${bookingId}:`, error);
      throw error;
    }
  },

  /**
   * Update booking status
   * @param {number} bookingId - The booking ID to update
   * @param {string} status - The new status
   * @returns {Promise} Promise with response data
   */
  updateBookingStatus: async (bookingId, status) => {
    try {
      const response = await api.put(`/api/v1/bookings/${bookingId}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating booking ${bookingId} status:`, error);
      throw error;
    }
  },
};

export default bookingService;
