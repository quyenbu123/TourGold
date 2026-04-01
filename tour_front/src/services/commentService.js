import api from './api';
import authService from './authService';

/**
 * Service for comment-related API calls
 */
const commentService = {
  /**
   * Add a new comment to a tour
   * @param {Object} commentData - Comment data with userId, tourId, content, etc.
   * @returns {Promise} Promise with response data
   */
  addComment: async (commentData) => {
    try {
      // Kiểm tra xem người dùng đã đăng nhập chưa
      if (!authService.isAuthenticated()) {
        throw new Error('Bạn cần đăng nhập để bình luận');
      }
      
      // Nếu không có userId thì lấy từ user hiện tại
      if (!commentData.userId) {
        const currentUser = authService.getCurrentUser();
        console.log('Current user from auth service:', currentUser);
        
        if (currentUser && currentUser.id) {
          commentData.userId = currentUser.id;
        } else {
          // Try to get user data from localStorage directly
          try {
            const userString = localStorage.getItem('user');
            console.log('Raw user string from localStorage:', userString);
            
            if (userString) {
              const userData = JSON.parse(userString);
              console.log('User data from localStorage:', userData);
              
              // Check multiple possible ID fields
              if (userData.id) {
                commentData.userId = userData.id;
              } else if (userData.userId) {
                commentData.userId = userData.userId;
              } else if (userData.user_id) {
                commentData.userId = userData.user_id;
              } else if (userData.userID) {
                commentData.userId = userData.userID;
              } else if (userData.username) {
                // If we have a username but no ID, use 1 as default ID for demo
                console.log('Using username as identifier:', userData.username);
                commentData.userId = 1;
                // Add username to the comment data for reference
                commentData.username = userData.username;
              } else {
                // Last resort - if we have a token but not a proper user ID
                console.log('No user ID found, using default ID for logged in user');
                commentData.userId = 1; // Use a default ID for now
              }
            } else {
              throw new Error('Không tìm thấy thông tin người dùng trong localStorage');
            }
          } catch (e) {
            console.error('Error parsing user from localStorage:', e);
            throw new Error('Không thể xác định người dùng');
          }
        }
      }
      
      console.log('Submitting comment with data:', commentData);
      const response = await api.post('/api/v1/comment', commentData);
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  /**
   * Get all comments for a specific tour
   * @param {number} tourId - The ID of the tour
   * @returns {Promise} Promise with response data
   */
  getCommentsByTour: async (tourId) => {
    try {
      const response = await api.get(`/api/v1/comment/${tourId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching comments for tour ${tourId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a comment
   * @param {number} tourId - The tour ID
   * @param {number} userId - The user ID who made the comment
   * @param {string} timestamp - The timestamp of the comment
   * @returns {Promise} Promise with response data
   */
  deleteComment: async (tourId, userId, timestamp) => {
    try {
      // Kiểm tra xem người dùng đã đăng nhập chưa
      if (!authService.isAuthenticated()) {
        throw new Error('Bạn cần đăng nhập để xóa bình luận');
      }
      
      // Get current user ID using similar approach to addComment
      let currentUserId = null;
      const currentUser = authService.getCurrentUser();
      
      if (currentUser && currentUser.id) {
        currentUserId = currentUser.id;
      } else {
        // Try to get from localStorage
        try {
          const userString = localStorage.getItem('user');
          if (userString) {
            const userData = JSON.parse(userString);
            if (userData) {
              if (userData.id) currentUserId = userData.id;
              else if (userData.userId) currentUserId = userData.userId;
              else if (userData.user_id) currentUserId = userData.user_id;
              else if (userData.userID) currentUserId = userData.userID;
              else currentUserId = 1; // Default for demo
            }
          }
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
          currentUserId = 1; // Default for demo
        }
      }
      
      console.log('Current user ID:', currentUserId, 'Comment user ID:', userId);
      
      // Check if user is admin before allowing delete
      const isAdmin = authService.isAdmin();
      console.log('Is admin:', isAdmin);
      
      // Allow deletion if admin or same user (using loose comparison for number/string type differences)
      if (currentUserId != userId && !isAdmin) {
        throw new Error('Bạn không có quyền xóa bình luận này');
      }
      
      const response = await api.delete(`/api/v1/comment/delete/${tourId}/${userId}/${timestamp}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting comment:`, error);
      throw error;
    }
  }
};

export default commentService; 