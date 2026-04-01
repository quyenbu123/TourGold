import api from './api';

const hostService = {
  // User request to become host
  requestHost: (payload) => api.post('/api/v1/host/register', payload),

  // Admin: list registrations (optional status: PENDING/APPROVED/REJECTED)
  getRegistrations: (status) => {
    const url = status ? `/api/v1/admin/host-registrations?status=${status}` : '/api/v1/admin/host-registrations';
    return api.get(url);
  },

  // Admin: approve/reject
  approve: (id, note) => api.post(`/api/v1/admin/host-registrations/${id}/approve`, note ? { note } : {}),
  reject: (id, note) => api.post(`/api/v1/admin/host-registrations/${id}/reject`, note ? { note } : {}),
};

export default hostService;

