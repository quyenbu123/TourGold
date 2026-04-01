import React, { useState, useEffect } from 'react';
import promotionService from '../../services/promotionService';
import './AdminPromotionsPage.css'; // Assuming a CSS file for styling
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatVND } from '../../utils/format';

const AdminPromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState(null);
  const [newPromotion, setNewPromotion] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    discountAmount: '',
    eligibilityCriteria: '',
    status: 'ACTIVE',
  });
  const [assignUserId, setAssignUserId] = useState('');
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const data = await promotionService.getAllPromotions();
      setPromotions(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching all promotions:', err);
      setError(err.message || 'Không thể tải danh sách khuyến mãi.');
      setLoading(false);
    }
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewPromotion({ ...newPromotion, [name]: value });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setCurrentPromotion({ ...currentPromotion, [name]: value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await promotionService.createPromotion(newPromotion);
      setShowAddModal(false);
      setNewPromotion({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        discountAmount: '',
        eligibilityCriteria: '',
        status: 'ACTIVE',
      });
      fetchPromotions();
    } catch (err) {
      console.error('Error adding promotion:', err);
      setError('Không thể thêm khuyến mãi.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await promotionService.updatePromotion(currentPromotion.promotionId, currentPromotion);
      setShowEditModal(false);
      setCurrentPromotion(null);
      fetchPromotions();
    } catch (err) {
      console.error('Error updating promotion:', err);
      setError('Không thể cập nhật khuyến mãi.');
    }
  };

  const handleDeleteClick = async (id) => {
    try {
      await promotionService.deletePromotion(id);
      fetchPromotions();
    } catch (err) {
      console.error('Error deleting promotion:', err);
      setError('Không thể xóa khuyến mãi.');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
        await promotionService.assignPromotionToUser(assignUserId, currentPromotion.promotionId);
        setShowAssignModal(false);
        setAssignUserId('');
        setCurrentPromotion(null);
        alert('Gán khuyến mãi thành công!');
    } catch (err) {
        console.error('Error assigning promotion:', err);        setError('Không thể gán khuyến mãi.');
        alert('Không thể gán khuyến mãi.');
    }
  };

  const openEditModal = (promotion) => {
    setCurrentPromotion(promotion);
    setShowEditModal(true);
  };

  const openAssignModal = (promotion) => {
    setCurrentPromotion(promotion);
    setShowAssignModal(true);
  };

  const openUsersModal = async (promotion) => {
    setCurrentPromotion(promotion);
    setUsersLoading(true);
    setUsersError(null);
    setAssignedUsers([]);
    setShowUsersModal(true);
    try {
      const users = await promotionService.getUsersByPromotionId(promotion.promotionId);
      console.log('Fetched assigned users:', users);
      if (Array.isArray(users)) {
        setAssignedUsers(users);
      } else {
        console.error('Received non-array data for assigned users:', users);
        setUsersError('Định dạng dữ liệu người dùng được gán không như mong đợi.');
        setAssignedUsers([]);
      }
      setUsersLoading(false);
    } catch (err) {
      console.error('Error fetching assigned users:', err);
      setUsersError('Không thể tải danh sách người dùng được gán.');
      setUsersLoading(false);
      setAssignedUsers([]);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="alert alert-danger">Lỗi: {typeof error === 'string' ? error : error?.message}</div>;
  }

  return (
    <div className="admin-promotions-page">      <h2>Quản Lý Khuyến Mãi</h2>
      <button className="btn btn-primary mb-3" onClick={() => setShowAddModal(true)}>Thêm Khuyến Mãi Mới</button>

      {/* Promotions Table */}
      <table className="table table-striped">
        <thead>
          <tr>            <th>ID</th>
            <th>Tên</th>
            <th>Mô Tả</th>
            <th>Ngày Bắt Đầu</th>
            <th>Ngày Kết Thúc</th>
            <th>Giá Trị Giảm</th>
            <th>Điều Kiện Áp Dụng</th>
            <th>Trạng Thái</th>
            <th>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {promotions.map((promotion) => (
            <tr key={promotion.promotionId}>
              <td>{promotion.promotionId}</td>
              <td>{promotion.name}</td>
              <td>{promotion.description}</td>
              <td>{promotion.startDate}</td>
              <td>{promotion.endDate}</td>
              <td>{formatVND(promotion.discountAmount)}</td>
              <td>{promotion.eligibilityCriteria}</td>
              <td>{promotion.status}</td>
              <td>                <button className="btn btn-sm btn-info mr-2" onClick={() => openEditModal(promotion)}>Sửa</button>
                <button className="btn btn-sm btn-success mr-2" onClick={() => openAssignModal(promotion)}>Gán Cho Người Dùng</button>
                <button className="btn btn-sm btn-secondary" onClick={() => openUsersModal(promotion)}>Xem Người Dùng</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(promotion.promotionId)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Promotion Modal */}
      {showAddModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">                <h5 className="modal-title">Thêm Khuyến Mãi Mới</h5>
                <button type="button" className="close" onClick={() => setShowAddModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleAddSubmit}>
                  <div className="form-group">
                    <label>Tên</label>
                    <input type="text" className="form-control" name="name" value={newPromotion.name} onChange={handleAddChange} required />
                  </div>
                  <div className="form-group">
                    <label>Mô Tả</label>
                    <textarea className="form-control" name="description" value={newPromotion.description} onChange={handleAddChange}></textarea>
                  </div>
                  <div className="form-group">
                    <label>Ngày Bắt Đầu</label>
                    <input type="datetime-local" className="form-control" name="startDate" value={newPromotion.startDate} onChange={handleAddChange} />
                  </div>
                  <div className="form-group">
                    <label>Ngày Kết Thúc</label>
                    <input type="datetime-local" className="form-control" name="endDate" value={newPromotion.endDate} onChange={handleAddChange} />
                  </div>
                  <div className="form-group">
                    <label>Giá Trị Giảm</label>
                    <input type="number" className="form-control" name="discountAmount" value={newPromotion.discountAmount} onChange={handleAddChange} step="0.01" required />
                  </div>
                  <div className="form-group">
                    <label>Điều Kiện Áp Dụng</label>
                    <input type="text" className="form-control" name="eligibilityCriteria" value={newPromotion.eligibilityCriteria} onChange={handleAddChange} />
                  </div>
                  <div className="form-group">
                    <label>Trạng Thái</label>
                    <select className="form-control" name="status" value={newPromotion.status} onChange={handleAddChange}>
                      <option value="ACTIVE">Hoạt Động</option>
                      <option value="INACTIVE">Không Hoạt Động</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Thêm Khuyến Mãi</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Promotion Modal */}
      {showEditModal && currentPromotion && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">                <h5 className="modal-title">Chỉnh Sửa Khuyến Mãi</h5>
                <button type="button" className="close" onClick={() => setShowEditModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleEditSubmit}>
                  <div className="form-group">
                    <label>Tên</label>
                    <input type="text" className="form-control" name="name" value={currentPromotion.name} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>Mô Tả</label>
                    <textarea className="form-control" name="description" value={currentPromotion.description} onChange={handleEditChange}></textarea>
                  </div>
                   <div className="form-group">
                    <label>Ngày Bắt Đầu</label>
                    {/* Convert LocalDateTime to string for input value */}
                    <input type="datetime-local" className="form-control" name="startDate" value={currentPromotion.startDate ? new Date(currentPromotion.startDate).toISOString().slice(0, 16) : ''} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Ngày Kết Thúc</label>
                     {/* Convert LocalDateTime to string for input value */}
                    <input type="datetime-local" className="form-control" name="endDate" value={currentPromotion.endDate ? new Date(currentPromotion.endDate).toISOString().slice(0, 16) : ''} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Giá Trị Giảm</label>
                    <input type="number" className="form-control" name="discountAmount" value={currentPromotion.discountAmount} onChange={handleEditChange} step="0.01" required />
                  </div>
                  <div className="form-group">
                    <label>Điều Kiện Áp Dụng</label>
                    <input type="text" className="form-control" name="eligibilityCriteria" value={currentPromotion.eligibilityCriteria} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Trạng Thái</label>
                    <select className="form-control" name="status" value={currentPromotion.status} onChange={handleEditChange}>
                      <option value="ACTIVE">Hoạt Động</option>
                      <option value="INACTIVE">Không Hoạt Động</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Cập Nhật Khuyến Mãi</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Promotion Modal */}
      {showAssignModal && currentPromotion && (
          <div className="modal" style={{ display: 'block' }}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header">                          <h5 className="modal-title">Gán Khuyến Mãi Cho Người Dùng</h5>
                          <button type="button" className="close" onClick={() => setShowAssignModal(false)}><span>&times;</span></button>
                      </div>
                      <div className="modal-body">
                          <form onSubmit={handleAssignSubmit}>
                              <div className="form-group">
                                  <label>ID Người Dùng</label>
                                  <input type="number" className="form-control" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} required />
                              </div>
                              <button type="submit" className="btn btn-primary">Gán Khuyến Mãi</button>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* View Assigned Users Modal */}
      {showUsersModal && currentPromotion && (
          <div className="modal" style={{ display: 'block' }}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header">                          <h5 className="modal-title">Người Dùng Được Gán {currentPromotion.name}</h5>
                          <button type="button" className="close" onClick={() => setShowUsersModal(false)}><span>&times;</span></button>
                      </div>
                      <div className="modal-body">
                          {usersLoading && <LoadingSpinner />}
                          {usersError && <div className="alert alert-danger">Lỗi: {usersError}</div>}
                          {!usersLoading && !usersError && ((assignedUsers || []).length === 0 ? (
                              <p>Chưa có người dùng nào được gán khuyến mãi này.</p>
                          ) : (
                              <ul>
                                  {(assignedUsers || []).map(user => (
                                      <li key={user.id}>ID Người Dùng: {user.id} - Tên Người Dùng: {user.username}</li>
                                  ))}
                              </ul>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPromotionsPage; 