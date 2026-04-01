// Utility functions for consistent Vietnamese formatting

export const formatVND = (amount) => {
  const n = Number(amount) || 0;
  return `${new Intl.NumberFormat('vi-VN').format(n)} VNĐ`;
};

export const formatDateVN = (dateString, options) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', options || { year: 'numeric', month: 'short', day: 'numeric' });
};

