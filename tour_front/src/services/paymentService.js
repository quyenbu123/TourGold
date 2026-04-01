import api from "./api";
import authService from "./authService";
import { createLogger } from "../utils/debugLogger";
import { BACKEND_URL } from "../config/env";

// Create a logger instance for the payment service
const logger = createLogger("PaymentService");

// Maximum number of retries for API calls
const MAX_RETRIES = 2;

// Delay between retries (in ms)
const RETRY_DELAY = 3000;

/**
 * Helper function to add retry logic to API calls
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise} - The API call result
 */
const withRetry = async (
  apiCall,
  maxRetries = MAX_RETRIES,
  delay = RETRY_DELAY
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${maxRetries}...`);
      }

      return await apiCall();
    } catch (error) {
      lastError = error;

      // Check if this is a rate limit error (status 429)
      const isRateLimit = error.response && error.response.status === 429;

      // Don't retry if it's not a rate limit or network error
      // Only retry on network errors (no response) or rate limit errors
      if (!isRateLimit && error.response) {
        logger.error(`Error not suitable for retry: ${error.message}`);
        break;
      }

      if (attempt < maxRetries) {
        const waitTime = isRateLimit
          ? parseInt(error.response?.headers?.["retry-after"] || 60) * 1000
          : delay;

        logger.warn(
          `API call failed, waiting ${waitTime / 1000}s before retry: ${
            error.message
          }`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
};

/**
 * Service for payment-related API calls
 */
const paymentService = {
  /**
   * Generate QR code for Casso payment
   * @param {string} amount - The payment amount
   * @param {string} orderId - The order ID
   * @returns {Promise} Promise with QR code data
   */
  generateCassoQR: async (amount, orderId) => {
    return withRetry(async () => {
      logger.info(
        `Generating QR code for amount: ${amount}, orderId: ${orderId}`
      );
      const response = await api.get("/api/v1/payment/vietqr/generate", {
        params: { amount, orderId },
      });
      logger.debug("QR code generated successfully");
      return response.data;
    });
  },

  /**
   * Check payment status
   * @param {string} orderId - The order ID to check
   * @returns {Promise} Promise with payment status
   */
  checkPaymentStatus: async (orderId) => {
    return withRetry(async () => {
      logger.info(`Checking payment status for orderId: ${orderId}`);
      const response = await api.get(`/api/v1/payment/check/status/${orderId}`);
      logger.debug(`Payment status response: ${response.data.status}`);

      // Check if payment was verified and status was updated
      if (
        response.data.status === "paid" &&
        response.data.bookingStatus === "PAID"
      ) {
        logger.info(
          `Payment confirmed and booking status updated to PAID for orderId: ${orderId}`
        );
      }

      return response.data;
    });
  },

  /**
   * Check payment status of a specific booking through local endpoint
   * @param {number} bookingId - The booking ID to check
   * @returns {Promise} Promise with payment status information
   */
  checkBookingPayment: async (bookingId) => {
    return withRetry(async () => {
      logger.info(
        `Checking payment status for booking ID via local endpoint: ${bookingId}`
      );
      const response = await api.get(
        `/api/v1/payment/casso/check-payment/${bookingId}`
      );
      logger.debug(
        "Payment check response from local endpoint:",
        response.data
      );
      return response.data;
    });
  },

  /**
   * Manually trigger Casso transaction check and booking update
   * @returns {Promise} Promise with update results
   */
  manualCheckAndUpdate: async () => {
    return withRetry(async () => {
      logger.info("Running manual transaction check and update");
      const response = await api.post("/api/v1/payment/casso/check-and-update");
      return response.data;
    });
  },

  /**
   * Check and update payment status for a specific booking
   * @param {number} bookingId - The booking ID to check and update
   * @returns {Promise} Promise with the update result
   */
  checkAndUpdateBookingPayment: async (bookingId) => {
    return withRetry(async () => {
      logger.info(
        `Checking and updating payment status for booking ID: ${bookingId}`
      );
      const response = await api.post(
        `/api/v1/payments/check-payment/${bookingId}/update`
      );
      logger.debug("Payment update response:", response.data);
      return response.data;
    });
  },

  /**
   * Verify if a payment has been completed
   * @param {string} orderId - The order ID
   * @param {number} amount - The expected amount
   * @returns {Promise} Promise with verification result
   */
  verifyPayment: async (orderId, amount) => {
    return withRetry(async () => {
      logger.info(
        `Verifying payment for orderId: ${orderId}, amount: ${amount}`
      );
      const response = await api.get(
        `/api/v1/payment/check/verify/${orderId}`,
        {
          params: { amount },
        }
      );
      logger.debug(`Payment verification result: ${response.data.verified}`);

      // Check if payment was verified and status was updated
      if (response.data.verified && response.data.bookingStatus === "PAID") {
        logger.info(
          `Payment verified and booking status updated to PAID for orderId: ${orderId}`
        );
      }

      return response.data;
    });
  },

  /**
   * Process payment for a booking
   * @param {object} paymentData - The payment data
   * @returns {Promise} Promise with payment result
   */
  processPayment: async (paymentData) => {
    return withRetry(async () => {
      if (!authService.isAuthenticated()) {
        logger.error("Payment process attempted without authentication");
        throw new Error("Bạn cần đăng nhập để thực hiện thanh toán");
      }

      logger.info(`Processing payment with data:`, paymentData);
      const response = await api.post("/api/v1/payment/process", paymentData);

      // If payment is successful, we should get a notification or email
      if (response.data && response.data.success) {
        logger.info(
          "Payment processed successfully, email notification should be sent"
        );
      }

      return response.data;
    });
  },

  /**
   * Lấy giao dịch từ backend endpoint để tránh gọi trực tiếp Casso API
   * @returns {Promise<Object>} Danh sách giao dịch
   */
  getTransactions: async () => {
    try {
      // Sử dụng endpoint local để tránh gọi trực tiếp đến Casso API
      logger.info(
        `Getting transactions from backend endpoint: ${BACKEND_URL}/api/v1/payment/check/transactions`
      );

      // Use the full URL to ensure we're using the local endpoint
      const response = await withRetry(async () => {
        return await api.get("/api/v1/payment/check/transactions");
      });

      // Check for API error
      if (response.data && response.data.error) {
        logger.error(
          `API trả về lỗi: ${response.data.message || "Không rõ nguyên nhân"}`
        );
        if (response.data.errorCode) {
          logger.error(`Error code: ${response.data.errorCode}`);
        }
      }

      // Log received data
      if (response.data && response.data.data && response.data.data.records) {
        logger.info(
          `Received ${response.data.data.records.length} transactions from local endpoint`
        );
        logger.debug(
          "First transaction sample:",
          response.data.data.records[0]
        );
      } else {
        logger.warn(
          "Received transaction data but structure is unexpected:",
          response.data
        );
      }

      return response.data;
    } catch (error) {
      logger.error("Error fetching transactions from local endpoint:", error);

      // Create a fallback response if API call fails
      const fallbackResponse = {
        error: 1,
  message: `Không thể tải danh sách giao dịch: ${error.message}. Vui lòng đảm bảo máy chủ backend đang chạy.`,
        data: { records: [] },
      };

      // Show a more user-friendly error in the console
      logger.error("API Error:", error.message);
      logger.error(`Hãy đảm bảo máy chủ backend đang chạy tại ${BACKEND_URL}`);

      // Return the fallback response to prevent frontend crashes
      return fallbackResponse;
    }
  },

  /**
   * Tìm giao dịch phù hợp với bookingId
   * @param {Object} transactions - Dữ liệu giao dịch từ API
   * @param {string|number} bookingId - ID của booking cần kiểm tra
   * @returns {Object|null} Giao dịch phù hợp hoặc null nếu không tìm thấy
   */
  findMatchingTransaction: (transactions, bookingId) => {
    if (!transactions || !transactions.data || !transactions.data.records) {
      logger.warn("No transaction data or invalid format", transactions);
      return null;
    }

    const records = transactions.data.records;
    logger.info(
      `Searching for transactions matching booking ID: ${bookingId} in ${records.length} records`
    );

    // Các mẫu tìm kiếm cho bookingId trong mô tả giao dịch
    const searchTerms = [
      `TOUR${bookingId}`,
      `TOUR-${bookingId}`,
      `TOUR ${bookingId}`,
      `tour${bookingId}`,
      `tour-${bookingId}`,
      `tour ${bookingId}`,
    ];

    // Tìm trong từng giao dịch
    const matchingTransaction = records.find((transaction) => {
      const description = transaction.description || "";
      const matches = searchTerms.some((term) => description.includes(term));
      if (matches) {
        logger.info(`Found matching transaction: ${description}`);
      }
      return matches;
    });

    if (!matchingTransaction) {
      logger.info(`No matching transaction found for booking ID: ${bookingId}`);
    }

    return matchingTransaction;
  },

  /**
   * Simulate a payment (for testing only)
   * Creates a mock Casso transaction for the given booking
   * @param {number} bookingId - The booking ID
   * @param {number} amount - Optional payment amount
   * @returns {Promise} Promise with simulation result
   */
  simulatePayment: async (bookingId, amount) => {
    return withRetry(async () => {
      logger.info(
        `Simulating payment for booking ID: ${bookingId}, amount: ${
          amount || "default"
        }`
      );
      const response = await api.post(
        "/api/v1/mock/casso/generate-transaction",
        null,
        {
          params: { bookingId, amount },
        }
      );
      logger.debug("Payment simulation result:", response.data);
      return response.data;
    });
  },

  /**
   * Approve payment for a booking (admin function)
   * @param {number} bookingId - The booking ID to approve
   * @param {string} adminNote - Optional admin note
   * @returns {Promise} Promise with the approval result
   */
  approveBookingPayment: async (bookingId, adminNote = "") => {
    return withRetry(async () => {
      logger.info(`Approving payment for booking ID: ${bookingId}`);
      const response = await api.post(`/api/v1/payments/approve/${bookingId}`, {
        adminNote,
      });
      logger.debug("Payment approval response:", response.data);
      return response.data;
    });
  },

  /**
   * Reject payment for a booking (admin function)
   * @param {number} bookingId - The booking ID to reject
   * @param {string} reason - Reason for rejection
   * @returns {Promise} Promise with the rejection result
   */
  rejectBookingPayment: async (bookingId, reason) => {
    return withRetry(async () => {
      logger.info(`Rejecting payment for booking ID: ${bookingId}`);
      const response = await api.post(`/api/v1/payments/reject/${bookingId}`, {
        reason,
      });
      logger.debug("Payment rejection response:", response.data);
      return response.data;
    });
  },

  /**
   * Refresh booking status from the server
   * @param {number} bookingId - The booking ID to refresh
   * @returns {Promise} Promise with the updated booking data
   */
  refreshBookingStatus: async (bookingId) => {
    return withRetry(async () => {
      logger.info(`Refreshing status for booking ID: ${bookingId}`);
      const response = await api.get(`/api/v1/bookings/${bookingId}/status`);
      logger.debug("Booking status response:", response.data);
      return response.data;
    });
  },
};

export default paymentService;
