import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatVND } from '../../utils/format';

const AdminPendingPaymentsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch pending approval bookings
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/v1/admin/payments/pending-approval');
        setBookings(res.data);
      } catch (err) {
        setError('Không thể tải danh sách booking chờ duyệt.');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  // Approve payment
  const handleApprove = async (bookingId) => {
    if (!window.confirm('Xác nhận phê duyệt thanh toán cho booking #' + bookingId + '?')) return;
    setActionLoading(bookingId);
    try {
      await api.post(`/api/v1/admin/payments/approve/${bookingId}`);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
    } catch (err) {
      alert('Lỗi khi phê duyệt!');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject payment
  const handleReject = async (bookingId) => {
    const reason = window.prompt('Nhập lý do từ chối:');
    if (!reason) return;
    setActionLoading(bookingId);
    try {
      await api.post(`/api/v1/admin/payments/reject/${bookingId}`, { reason });
      setBookings(prev => prev.filter(b => b.id !== bookingId));
    } catch (err) {
      alert('Lỗi khi từ chối!');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner message="Đang tải danh sách booking chờ duyệt..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container py-4">
      <h2 className="mb-4">Booking Chờ Duyệt Thanh Toán</h2>
      {bookings.length === 0 ? (
        <div className="alert alert-info">Không có booking nào ở trạng thái PAID.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>Tour</th>
                <th>Số tiền</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.user?.fullName || b.user?.email || 'N/A'}</td>
                  <td>{b.tour?.name || 'N/A'}</td>
                  <td>{b.invoice?.totalAmount ? formatVND(b.invoice.totalAmount) : 'N/A'}</td>
                  <td>{b.bookingTime ? new Date(b.bookingTime).toLocaleString('vi-VN') : 'N/A'}</td>
                  <td><span className="badge bg-warning text-dark">ĐÃ THANH TOÁN</span></td>
                  <td>
                    <button className="btn btn-success btn-sm me-2" disabled={actionLoading === b.id} onClick={() => handleApprove(b.id)}>
                      {actionLoading === b.id ? 'Đang xử lý...' : 'Phê duyệt'}
                    </button>
                    <button className="btn btn-danger btn-sm" disabled={actionLoading === b.id} onClick={() => handleReject(b.id)}>
                      Từ chối
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPendingPaymentsPage; 