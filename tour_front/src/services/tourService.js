import api, { sendMultipartFormData, isDemoMode } from './api';
import authService from './authService';
import { isAdminFromToken } from '../utils/jwtUtils';
import mockApiService from '../utils/mockApiService';

const canManageTours = () => {
  try {
    return authService.isAdmin() || authService.hasRole('HOST');
  } catch (error) {
    console.error('Không thể xác định quyền quản lý tour:', error);
    return false;
  }
};

/**
 * Service for tour-related API calls
 */
const tourService = {
  getMyTours: async () => {
    try {
      const response = await api.get('/api/v1/tours/my');
      return response.data;
    } catch (error) {
      console.error('Error fetching host tours:', error);
      throw error;
    }
  },
  /**
   * Get all tours
   * @returns {Promise} Promise with response data
   */
  getAllTours: async () => {
    try {
      try {
        // Nếu ở chế độ demo và không gửi được request, dùng dữ liệu mẫu
        if (isDemoMode) {
          try {
            console.debug('[tourService] (demo) GET /api/v1/tours ...');
            const response = await api.get('/api/v1/tours');
            const data = response.data;
            console.debug('[tourService] (demo) tours length:', Array.isArray(data) ? data.length : 'not-array', data);
            if (Array.isArray(data) && data.length === 0) {
              console.warn('[tourService] (demo) API returned empty list, falling back to mock data');
              return mockApiService.getAllTours();
            }
            return data;
          } catch (demoError) {
            console.log('Using mock data in demo mode');
            return mockApiService.getAllTours();
          }
        }

        console.debug('[tourService] GET /api/v1/tours ...');
        const response = await api.get('/api/v1/tours');
        const data = response.data;
        console.debug('[tourService] tours length:', Array.isArray(data) ? data.length : 'not-array');
        return data;
      } catch (apiError) {
        console.warn('Error fetching tours from API, using fallback data:', apiError);

        // Nếu endpoint không tồn tại hoặc có lỗi kết nối, trả về dữ liệu mẫu
        return mockApiService.getAllTours();
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      // Trả về mảng rỗng thay vì throw lỗi
      return [];
    }
  },

  /**
   * Get all tours for the admin page (full data)
   * @returns {Promise} Promise with response data
   */
  getAllToursForAdmin: async () => {
    try {
      const response = await api.get('/api/v1/tours/admin/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin tours:', error);
      throw error;
    }
  },

  /**
   * Get tour by ID
   * @param {number} tourId - The ID of the tour
   * @returns {Promise} Promise with response data
   */
  getTourById: async (tourId) => {
    try {
      try {
        // Sử dụng endpoint public cho tất cả người dùng
        const response = await api.get(`/api/v1/tours/public/${tourId}`);
        return response.data;
      } catch (apiError) {
        console.warn(`Error fetching tour ${tourId}, using fallback data:`, apiError);

        // Trả về dữ liệu mẫu cho tour với ID tương ứng
        return {
          id: parseInt(tourId),
          name: `Tour #${tourId} (Demo)`,
          description: "Đây là dữ liệu mẫu khi API không hoạt động. Trong môi trường thực tế, dữ liệu này sẽ được lấy từ backend.",
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          maxQuantity: 20,
          typeOfTourEntities: [
            { id: 1, name: "City Tour" },
            { id: 5, name: "Nature" }
          ],
          tourPrices: [
            { id: 1, name: "Standard Package", price: 1500000, description: "Gói tiêu chuẩn" },
            { id: 2, name: "Premium Package", price: 2500000, description: "Gói cao cấp" }
          ],
          itineraries: [
            { id: 1, date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), itinerary: "Ngày 1: Khởi hành và nhận phòng khách sạn" },
            { id: 2, date_time: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), itinerary: "Ngày 2: Tham quan các địa điểm du lịch" },
            { id: 3, date_time: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(), itinerary: "Ngày 3: Khám phá ẩm thực địa phương" }
          ],
          services: [
            { id: 1, name: "Xe đưa đón", description: "Xe đưa đón tận nơi", price: 200000 },
            { id: 2, name: "Hướng dẫn viên", description: "Hướng dẫn viên chuyên nghiệp", price: 300000 }
          ],
          images: []
        };
      }
    } catch (error) {
      console.error(`Error fetching tour ${tourId}:`, error);
      // Trả về đối tượng trống thay vì throw lỗi
      return {};
    }
  },

  /**
   * Get tour by ID (admin only)
   * @param {number} tourId - The ID of the tour
   * @returns {Promise} Promise with response data
   */
  getAdminTourById: async (tourId) => {
    try {
      // Xác thực người dùng trực tiếp từ token
      const token = localStorage.getItem('token');

      // Nếu không có token, báo lỗi ngay
      if (!token) {
        console.error('getAdminTourById: No authentication token found');
  throw new Error('Cần đăng nhập để truy cập tour này');
      }

      // Kiểm tra quyền admin trực tiếp từ token
      const hasAdminRightInToken = isAdminFromToken(token);

      // Nếu không phải admin và không ở chế độ demo, kiểm tra user data
      if (!hasAdminRightInToken && !isDemoMode) {
        const user = authService.getCurrentUser();

        if (!user) {
          console.warn('getAdminTourById: No user data found');
          // Trong chế độ demo, tiếp tục ngay cả khi không có user data
        } else if (!authService.isAdmin() && !isDemoMode) {
          console.warn('getAdminTourById: User is not admin', user);
          throw new Error('Không có quyền truy cập: cần quyền quản trị viên');
        }
      } else if (hasAdminRightInToken) {
        console.log('Admin rights detected in token');
      }

      try {
        // Sử dụng endpoint admin cho chi tiết tour
        console.log(`Fetching admin tour ${tourId} with token`);
        const response = await api.get(`/api/v1/tours/${tourId}`);
        return response.data;
      } catch (apiError) {
        console.warn(`Error fetching admin tour ${tourId}, error:`, apiError);

        // Nếu lỗi là 401/403 và đang ở chế độ demo, hãy thử lấy dữ liệu public
        if ((apiError.response?.status === 401 || apiError.response?.status === 403) && isDemoMode) {
          console.log('In demo mode - trying to fetch public tour data instead');
          try {
            const publicResponse = await api.get(`/api/v1/tours/public/${tourId}`);
            return publicResponse.data;
          } catch (publicError) {
            console.error('Also failed to get public tour data:', publicError);
          }
        }

        if (isDemoMode) {
          console.log('Using fallback demo data for tour');
          // Trả về dữ liệu mẫu cho tour với ID tương ứng
          return {
            id: parseInt(tourId),
            name: `Tour #${tourId} (Demo Data)`,
            description: "Đây là dữ liệu mẫu trong chế độ demo. Dữ liệu này được sử dụng khi không thể kết nối với backend.",
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            maxQuantity: 20,
            typeOfTourEntities: [
              { id: 1, name: "City Tour" },
              { id: 5, name: "Nature" }
            ],
            tourPrices: [
              { id: 1, name: "Standard Package", price: 1500000, description: "Gói tiêu chuẩn" },
              { id: 2, name: "Premium Package", price: 2500000, description: "Gói cao cấp" }
            ],
            images: []
          };
        }

        // Nếu không phải demo mode hoặc đã thử tất cả các cách, ném lỗi
        throw apiError;
      }
    } catch (error) {
      console.error(`Error in getAdminTourById for tour ${tourId}:`, error);

      // Nếu đang ở chế độ demo, trả về dữ liệu mẫu thay vì ném lỗi
      if (isDemoMode) {
        return {
          id: parseInt(tourId),
          name: `Tour #${tourId} (Error Fallback)`,
          description: "Dữ liệu mẫu được hiển thị do có lỗi khi tải dữ liệu từ server.",
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          maxQuantity: 20,
          typeOfTourEntities: [
            { id: 1, name: "City Tour" },
            { id: 5, name: "Nature" }
          ],
          tourPrices: [
            { id: 1, name: "Standard Package", price: 1500000, description: "Gói tiêu chuẩn" },
            { id: 2, name: "Premium Package", price: 2500000, description: "Gói cao cấp" }
          ],
          images: []
        };
      }

      // Không ở chế độ demo, ném lỗi
      throw error;
    }
  },

  /**
   * Create new tour (admin only)
   * @param {Object} tourData - The tour data to create
   * @returns {Promise} Promise with response data
   */
  createTour: async (tourData) => {
    try {
      if (!canManageTours()) {
        throw new Error(
          'Không có quyền thực hiện: cần quyền quản trị viên hoặc host'
        );
      }

      // Tất cả dữ liệu liên quan đến tour sẽ được gửi trong một lần gọi API
      console.log('Submitting complete tour data to API in one call:', tourData);

      // Create the tour with all data in a single request
      const tourResponse = await api.post('/api/v1/tours', tourData);
      const createdTour = tourResponse.data;
      console.log('Tour created:', createdTour);

      return createdTour;
    } catch (error) {
      console.error('Error creating tour:', error);
      throw error;
    }
  },

  /**
   * Update tour (admin only)
   * @param {number} tourId - The ID of the tour to update
   * @param {Object} tourData - The updated tour data
   * @returns {Promise} Promise with response data
   */
  updateTour: async (tourId, tourData) => {
    try {
      if (!canManageTours()) {
        throw new Error(
          'Không có quyền truy cập: cần quyền quản trị viên hoặc host'
        );
      }

      // Make a copy of tourData to avoid modifying the original
      const updateData = { ...tourData };

      console.log('Submitting complete tour update to API in one call:', updateData);

      // Thực hiện tối đa 3 lần retry nếu gặp lỗi Optimistic Locking
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Update the tour with all data in a single request
          const response = await api.put(`/api/v1/tours/${tourId}`, updateData);
          const updatedTour = response.data;
          console.log('Tour updated:', updatedTour);

          return updatedTour;
        } catch (error) {
          // Kiểm tra xem lỗi có phải là Optimistic Locking không
          if (error.response &&
              (error.response.status === 409 || // HTTP Conflict
               error.response.data?.message?.includes('OptimisticLockingFailure') ||
               error.response.data?.message?.includes('StaleObjectStateException') ||
               error.message?.includes('OptimisticLockingFailure'))) {

            retryCount++;
            console.warn(`Optimistic locking error detected, retry ${retryCount}/${maxRetries}`);

            if (retryCount >= maxRetries) {
              console.error('Maximum retries reached for optimistic locking error');
              throw new Error(
                'Không thể cập nhật tour do có thay đổi đồng thời. Vui lòng tải lại và thử lại.'
              );
            }

            // Lấy lại dữ liệu tour mới nhất từ server
            const freshTourData = await api.get(`/api/v1/tours/${tourId}`);

            // Kết hợp dữ liệu từ server với thay đổi của người dùng
            updateData.version = freshTourData.data.version; // Cập nhật version nếu entity sử dụng version

            // Đợi một khoảng thời gian ngắn trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          } else {
            // Nếu không phải lỗi Optimistic Locking, ném lỗi để xử lý ở nơi gọi
            throw error;
          }
        }
      }
    } catch (error) {
      console.error(`Error updating tour ${tourId}:`, error);
      throw error;
    }
  },

  /**
   * Delete tour (admin only)
   * @param {number} tourId - The ID of the tour to delete
   * @returns {Promise} Promise with response data
   */
  deleteTour: async (tourId) => {
    try {
      if (!canManageTours()) {
        throw new Error(
          'Không có quyền truy cập: cần quyền quản trị viên hoặc host'
        );
      }

      const response = await api.delete(`/api/v1/tours/${tourId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting tour ${tourId}:`, error);
      throw error;
    }
  },

  /**
   * Toggle the display status of a tour (admin only)
   * @param {number} tourId - The ID of the tour
   * @returns {Promise} Promise with response data
   */
  toggleTourDisplay: async (tourId) => {
    try {
      if (!canManageTours()) {
        throw new Error(
          'Không có quyền truy cập: cần quyền quản trị viên hoặc host'
        );
      }
      const response = await api.put(`/api/v1/tours/${tourId}/toggle-display`);
      return response.data;
    } catch (error) {
      console.error(`Error toggling display for tour ${tourId}:`, error);
      throw error;
    }
  },


  /**
   * Upload main image for a tour (admin only)
   * @param {number} tourId - The ID of the tour
   * @param {File} image - The image file to upload
   * @returns {Promise} Promise with response data
   */
  uploadMainImage: async (tourId, image) => {
    try {
      if (!canManageTours()) {
        throw new Error(
          'Không có quyền truy cập: cần quyền quản trị viên hoặc host'
        );
      }

      const formData = new FormData();
      formData.append('image', image);

      return await sendMultipartFormData(
        `/api/v1/tours/${tourId}/main-image`,
        formData
      );
    } catch (error) {
      console.error(`Error uploading main image for tour ${tourId}:`, error);
      throw error;
    }
  },

  /**
   * Upload additional images for a tour (admin only)
   * @param {number} tourId - The ID of the tour
   * @param {Array<File>} images - The image files to upload
   * @returns {Promise} Promise with response data
   */
  uploadAdditionalImages: async (tourId, images) => {
    try {
      if (!canManageTours()) {
        throw new Error(
          'Không có quyền truy cập: cần quyền quản trị viên hoặc host'
        );
      }

      const formData = new FormData();
      images.forEach((image) => {
        formData.append('images', image);
      });

      return await sendMultipartFormData(
        `/api/v1/tours/${tourId}/additional-images`,
        formData
      );
    } catch (error) {
      console.error(`Error uploading additional images for tour ${tourId}:`, error);
      throw error;
    }
  },

  /**
   * Get all images for a tour
   * @param {number} tourId - The ID of the tour
   * @returns {Promise} Promise with response data
   */
  getTourImages: async (tourId) => {
    try {
      try {
        const response = await api.get(`/api/v1/tours/${tourId}/images`);
        return response.data;
      } catch (apiError) {
        console.warn(`Error fetching images for tour ${tourId}, using fallback data:`, apiError);

        // Trả về dữ liệu mẫu
        return [
          {
            id: 1,
            tourId: parseInt(tourId),
            url: "https://picsum.photos/800/600?random=1",
            description: "Ảnh mẫu 1"
          },
          {
            id: 2,
            tourId: parseInt(tourId),
            url: "https://picsum.photos/800/600?random=2",
            description: "Ảnh mẫu 2"
          },
          {
            id: 3,
            tourId: parseInt(tourId),
            url: "https://picsum.photos/800/600?random=3",
            description: "Ảnh mẫu 3"
          }
        ];
      }
    } catch (error) {
      console.error(`Error fetching images for tour ${tourId}:`, error);
      // Trả về mảng rỗng thay vì throw lỗi
      return [];
    }
  },

  /**
   * Delete tour image (admin only)
   * @param {number} imageId - The ID of the image to delete
   * @returns {Promise} Promise with response data
   */
  deleteImage: async (imageId) => {
    try {
      if (!canManageTours()) {
        throw new Error(
          'Không có quyền truy cập: cần quyền quản trị viên hoặc host'
        );
      }

      const response = await api.delete(`/api/v1/tours/images/${imageId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting image ${imageId}:`, error);
      throw error;
    }
  },

  /**
   * Get all tour types
   * @returns {Promise} Promise with response data
   */
  getTourTypes: async () => {
    try {
      try {
        const response = await api.get('/api/v1/type-of-tours');
        return response.data;
      } catch (apiError) {
        console.warn('Error fetching tour types, using fallback data:', apiError);

        // Trả về dữ liệu mẫu
        return [
          { id: 1, name: "City Tour" },
          { id: 2, name: "Beach" },
          { id: 3, name: "Mountain" },
          { id: 4, name: "Cultural" },
          { id: 5, name: "Nature" },
          { id: 6, name: "Historical" },
          { id: 7, name: "Adventure" }
        ];
      }
    } catch (error) {
      console.error('Error fetching tour types:', error);
      // Trả về mảng mẫu thay vì throw lỗi
      return [
        { id: 1, name: "City Tour" },
        { id: 2, name: "Beach" },
        { id: 3, name: "Mountain" },
        { id: 4, name: "Cultural" }
      ];
    }
  },

  /**
   * Alias for getTourTypes - used to maintain compatibility with existing code
   * @returns {Promise} Promise with response data
   */
  getAllTourTypes: async () => {
    return tourService.getTourTypes();
  },

  /**
   * Add new tour type (admin only)
   * @param {string} name - The name of the tour type
   * @returns {Promise} Promise with response data
   */
  addTourType: async (name) => {
    try {
      // Kiểm tra xem người dùng có phải là admin không
      if (!authService.isAdmin()) {
  throw new Error('Không có quyền truy cập: cần quyền quản trị viên');
      }

      const response = await api.post('/api/v1/type-of-tours', { name });
      return response.data;
    } catch (error) {
      console.error('Error adding tour type:', error);
      throw error;
    }
  },

  /**
   * Delete tour type (admin only)
   * @param {number} typeId - The ID of the tour type to delete
   * @returns {Promise} Promise with response data
   */
  deleteTourType: async (typeId) => {
    try {
      // Kiểm tra xem người dùng có phải là admin không
      if (!authService.isAdmin()) {
  throw new Error('Không có quyền truy cập: cần quyền quản trị viên');
      }

      const response = await api.delete(`/api/v1/type-of-tours/${typeId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting tour type ${typeId}:`, error);
      throw error;
    }
  },

  /**
   * Search tours with filters
   * @param {Object} filters - Search filters (name, minPrice, maxPrice, etc.)
   * @returns {Promise} Promise with response data
   */
  searchTours: async (filters) => {
    try {
      const response = await api.get('/api/v1/tours/search', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error searching tours:', error);
      throw error;
    }
  },

  /**
   * Get all service types
   * @returns {Promise} Promise with response data
   */
  getServiceTypes: async () => {
    try {
      try {
        const response = await api.get('/api/v1/type-of-services');
        console.log('Service types retrieved:', response.data);
        return response.data;
      } catch (apiError) {
        console.warn('Error fetching service types, using fallback data:', apiError);

        // Return sample data if API call fails
        return [
          { id: 1, name: "Vận chuyển" },
          { id: 2, name: "Khách sạn" },
          { id: 3, name: "Ăn uống" },
          { id: 4, name: "Hướng dẫn viên" },
          { id: 5, name: "Bảo hiểm" }
        ];
      }
    } catch (error) {
      console.error('Error fetching service types:', error);
      return [];
    }
  },

  /**
   * Get featured tour IDs
   * @returns {Promise} Promise with response data
   */
  getFeaturedTourIds: async () => {
    try {
      console.log('Fetching featured tour IDs...');
      const response = await api.get('/api/v1/tours/featured-ids');
      console.log('Successfully fetched featured tour IDs:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching featured tour IDs:', error);

      // If the backend is unavailable, return a fallback list of IDs
      console.log('Using fallback featured tour IDs due to connection error');
      return [2, 7, 6, 5, 8]; // The correct ranking from our debug endpoint
    }
  },
  
  /**
   * Fetch real tour entities by a list of IDs (display-filtered)
   */
  getToursByIds: async (ids = []) => {
    if (!ids || !ids.length) return [];
    try {
      const response = await api.get('/api/v1/tours/by-ids', { params: { ids: ids.join(',') } });
      return response.data;
    } catch (e) {
      console.warn('[tourService] getToursByIds fallback to allTours filter due to error', e);
      const all = await tourService.getAllTours();
      return all.filter(t => ids.includes(t.id));
    }
  },

  /**
   * Get top tours
   * @param {number} limit - The number of top tours to retrieve
   * @returns {Promise} Promise with response data
   */
  getTopTours: async (limit = 6) => {
    try {
      const allTours = await tourService.getAllTours();
      return allTours.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top tours:', error);
      throw error;
    }
  },

  /**
   * Get personalized tour recommendations for the current user
   * Note: Only call this when user is authenticated to avoid 401 redirects.
   * @param {number} limit
   * @returns {Promise<Array>} list of TourEntity
   */
  getRecommendations: async (limit = 6) => {
    try {
      if (!authService.isAuthenticated()) {
        // Fallback for guests: show featured or top tours
        try {
          const ids = await tourService.getFeaturedTourIds();
          const tours = await tourService.getToursByIds(ids.slice(0, limit));
          return tours.slice(0, limit);
        } catch (_) {
          const top = await tourService.getTopTours(limit);
          return top;
        }
      }
      console.debug('[tourService] GET /api/v1/tours/recommendations', { limit });
      const response = await api.get('/api/v1/tours/recommendations', {
        params: { limit }
      });
      const data = response.data;
      console.debug('[tourService] recommendations length:', Array.isArray(data) ? data.length : 'not-array', data);
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) {
        // Soft fallback if backend has no recommendations yet
        try {
          const ids = await tourService.getFeaturedTourIds();
          const tours = await tourService.getToursByIds(ids.slice(0, limit));
          return tours.slice(0, limit);
        } catch (_) {
          const top = await tourService.getTopTours(limit);
          return top;
        }
      }
      return list;
    } catch (error) {
      if (error?.response?.status === 401) {
        // Do not force logout; provide graceful fallback
        try {
          const ids = await tourService.getFeaturedTourIds();
          const tours = await tourService.getToursByIds(ids.slice(0, limit));
          return tours.slice(0, limit);
        } catch (_) {
          const top = await tourService.getTopTours(limit);
          return top;
        }
      }
      console.error('Error fetching recommendations:', error);
      // Generic fallback path
      try {
        const ids = await tourService.getFeaturedTourIds();
        const tours = await tourService.getToursByIds(ids.slice(0, limit));
        return tours.slice(0, limit);
      } catch (_) {
        const top = await tourService.getTopTours(limit);
        return top;
      }
    }
  }
};

export default tourService;