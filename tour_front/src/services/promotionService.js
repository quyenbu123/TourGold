import api from './api';

const promotionService = {
  getAllPromotions: async () => {
    try {
      const response = await api.get('/api/v1/promotions');
      return response.data;
    } catch (error) {
      console.error('Error fetching all promotions:', error);
      throw error;
    }
  },

  getPromotionById: async (id) => {
    try {
      const response = await api.get(`/api/v1/promotions/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching promotion with id ${id}:`, error);
      throw error;
    }
  },

  createPromotion: async (promotionData) => {
    try {
      const response = await api.post('/api/v1/promotions', promotionData);
      return response.data;
    } catch (error) {
      console.error('Error creating promotion:', error);
      throw error;
    }
  },

  updatePromotion: async (id, promotionData) => {
    try {
      const response = await api.put(`/api/v1/promotions/${id}`, promotionData);
      return response.data;
    } catch (error) {
      console.error(`Error updating promotion with id ${id}:`, error);
      throw error;
    }
  },

  deletePromotion: async (id) => {
    try {
      await api.delete(`/api/v1/promotions/${id}`);
    } catch (error) {
      console.error(`Error deleting promotion with id ${id}:`, error);
      throw error;
    }
  },

  assignPromotionToUser: async (userId, promotionId) => {
    try {
      const response = await api.post(`/api/v1/user-promotions/assign?userId=${userId}&promotionId=${promotionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error assigning promotion ${promotionId} to user ${userId}:`, error);
      throw error;
    }
  },

  getUserPromotions: async (userId) => {
    try {
      const response = await api.get(`/api/v1/user-promotions/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching promotions for user ${userId}:`, error);
      throw error;
    }
  },

  getUsersByPromotionId: async (promotionId) => {
    try {
      const response = await api.get(`/api/v1/user-promotions/promotion/${promotionId}/users`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching users for promotion ${promotionId}:`, error);
      throw error;
    }
  },

  removePromotionFromUser: async (userId, promotionId) => {
    try {
      await api.delete(`/api/v1/user-promotions/remove?userId=${userId}&promotionId=${promotionId}`);
    } catch (error) {
      console.error(`Error removing promotion ${promotionId} from user ${userId}:`, error);
      throw error;
    }
  },

  validateAndApplyPromotion: async (userId, promotionId, orderAmount) => {
    try {
      const response = await api.post('/api/v1/promotions/validate', {
        userId,
        promotionId,
        orderAmount
      });
      return response.data;
    } catch (error) {
      console.error('Error validating and applying promotion:', error);
      throw error;
    }
  }
};

export default promotionService; 