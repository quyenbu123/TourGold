import axios from 'axios';
import api from './api'; // Import the configured axios instance

const API_URL = 'http://localhost:8080/api/v1/favorites';

export const favoriteService = {
    getUserFavorites: async (userId) => {
        try {
            const response = await api.get(`${API_URL}/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user favorites:', error);
            throw error;
        }
    },

    addToFavorites: async (userId, tourId) => {
        try {
            const response = await api.post(`${API_URL}/user/${userId}/tour/${tourId}`);
            return response.data;
        } catch (error) {
            console.error('Error adding to favorites:', error);
            throw error;
        }
    },

    removeFromFavorites: async (userId, tourId) => {
        try {
            await api.delete(`${API_URL}/user/${userId}/tour/${tourId}`);
        } catch (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }
    },

    isFavorite: async (userId, tourId) => {
        try {
            const response = await api.get(`${API_URL}/user/${userId}/tour/${tourId}`);
            return response.data;
        } catch (error) {
            console.error('Error checking favorite status:', error);
            throw error;
        }
    }
}; 