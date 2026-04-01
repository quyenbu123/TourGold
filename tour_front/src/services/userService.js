import api from "./api";

const userService = {
  /**
   * Get all users
   * @returns {Promise} Promise with user data
   */
  getAllUsers: async () => {
    try {
      console.log("Fetching all users...");
      const response = await api.get("/api/v1/users");
      console.log("Raw API response:", response);

      // Check if response has data property or is directly the data
      if (response && response.data) {
        console.log(
          "Response data format:",
          typeof response.data,
          response.data
        );

        // If response.data is already an array, return it
        if (Array.isArray(response.data)) {
          console.log("Data is an array, returning directly");
          return response.data;
        }
        // If response.data has a nested data property that's an array, return that
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log("Found nested data array, returning response.data.data");
          return response.data.data;
        }
        // If response.data has content property that's an array (for paginated responses)
        if (response.data.content && Array.isArray(response.data.content)) {
          console.log(
            "Found paginated content array, returning response.data.content"
          );
          return response.data.content;
        }
        // Check for any array property in the response.data
        const arrayProps = Object.keys(response.data).filter(
          (key) =>
            Array.isArray(response.data[key]) && response.data[key].length > 0
        );

        if (arrayProps.length > 0) {
          console.log(
            `Found array in property: ${arrayProps[0]}, returning it`
          );
          return response.data[arrayProps[0]];
        }

        // Otherwise return the data object itself
        console.log("Returning raw data object");
        return response.data;
      }

      console.log("No data found in response, returning empty array");
      return [];
    } catch (error) {
      console.error("Error fetching users:", error);
      console.error(
        "Error details:",
        error.response ? error.response.data : "No response data"
      );
      throw error;
    }
  },

  /**
   * Get user by ID
   * @param {number} userId - User ID to fetch
   * @returns {Promise} Promise with user data
   */
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/api/v1/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a user
   * @param {number} userId - User ID to delete
   * @returns {Promise} Promise with response data
   */
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/api/v1/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update a user
   * @param {number} userId - User ID to update
   * @param {object} userData - User data to update
   * @returns {Promise} Promise with updated user data
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/api/v1/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },
};

export default userService;
