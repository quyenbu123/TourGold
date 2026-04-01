import React, { useCallback, useEffect, useMemo, useState } from 'react';
import hostService from '../../services/hostService';
import './AdminHostRegistrationsPage.css';

const AdminHostRegistrationsPage = () => {
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRegistrations = useCallback(async (st) => {
    const targetStatus = typeof st === 'undefined' ? status : st;
    try {
      setLoading(true);
      setError('');
      const res = await hostService.getRegistrations(targetStatus);
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
      setError('Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchRegistrations(status);
  }, [fetchRegistrations, status]);

  const onApprove = async (id) => {
    try {
      const note = window.prompt('Ghi chú phê duyệt (tuỳ chọn):', 'Approved by admin') || undefined;
  await hostService.approve(id, note ? note.trim() : undefined);
  await fetchRegistrations(status);
    } catch (e) {
      console.error(e);
      alert('Phê duyệt thất bại');
    }
  };

  const onReject = async (id) => {
    try {
      const note = window.prompt('Lý do từ chối:', 'Thông tin chưa đầy đủ');
      if (note === null) {
        return;
      }
  await hostService.reject(id, note.trim());
  await fetchRegistrations(status);
    } catch (e) {
      console.error(e);
      alert('Từ chối thất bại');
    }
  };

  const renderStatusBadge = (st) => {
    switch (st) {
      case 'APPROVED':
        return <span className="badge rounded-pill bg-success-subtle text-success">Đã duyệt</span>;
      case 'REJECTED':
        return <span className="badge rounded-pill bg-danger-subtle text-danger">Đã từ chối</span>;
      default:
        return <span className="badge rounded-pill bg-warning-subtle text-warning">Đang chờ</span>;
    }
  };

  const rows = useMemo(() => items.map((it) => ({
    id: it.id,
    userName: it.user?.username || it.user?.fullName || `#${it.user?.id}`,
    email: it.user?.email,
    contact: {
      businessName: it.businessName,
      name: it.contactName,
      phone: it.contactPhone,
      fullName: it.user?.fullName,
    },
    tax: {
      taxCode: it.taxCode,
      license: it.businessLicenseNumber,
      docUrl: it.supportingDocumentUrl,
    },
    address: it.businessAddress,
    message: it.message,
    adminNotes: it.adminNotes,
    status: it.status,
    requestDate: it.requestDate,
    processedDate: it.processedDate,
  })), [items]);

  return (
    <div className="host-registrations container-fluid py-4">
      <div className="card shadow-sm">
        <div className="card-header bg-white border-0 py-3 d-flex flex-wrap gap-3 align-items-center">
          <div>
            <h3 className="mb-0">Yêu cầu đăng ký Host</h3>
            <p className="text-muted mb-0">Kiểm tra thông tin pháp lý trước khi cấp quyền host.</p>
          </div>
          <div className="ms-auto">
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Đang chờ</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {loading && <div className="py-5 text-center">Đang tải...</div>}
          {error && <div className="alert alert-danger m-3">{error}</div>}

          {!loading && !error && rows.length === 0 && (
            <div className="text-center text-muted py-5">
              <i className="fas fa-user-clock fa-2x mb-3"></i>
              <p className="mb-0">Chưa có yêu cầu nào phù hợp.</p>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Người dùng</th>
                    <th>Thông tin liên hệ</th>
                    <th>MST &amp; giấy phép</th>
                    <th>Địa chỉ</th>
                    <th>Giới thiệu</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th className="text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="fw-semibold">#{row.id}</td>
                      <td>
                        <div>{row.userName}</div>
                        {row.email && (
                          <a href={`mailto:${row.email}`} className="text-muted small">{row.email}</a>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold">{row.contact.businessName || '—'}</div>
                        <div className="small text-muted">{row.contact.name || '—'}</div>
                        {row.contact.phone && (
                          <a href={`tel:${row.contact.phone}`} className="badge rounded-pill bg-primary-subtle text-primary mt-1">
                            {row.contact.phone}
                          </a>
                        )}
                        {row.contact.fullName && (
                          <div className="small text-muted">Tên hồ sơ: {row.contact.fullName}</div>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className="badge bg-light text-dark">MST: {row.tax.taxCode || '—'}</span>
                          <span className="badge bg-light text-dark">GP: {row.tax.license || '—'}</span>
                          {row.tax.docUrl && (
                            <a href={row.tax.docUrl} target="_blank" rel="noopener noreferrer" className="small">
                              <i className="fas fa-folder-open me-1"></i>Tài liệu
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <div className="text-muted small">{row.address || '—'}</div>
                      </td>
                      <td style={{ whiteSpace: 'pre-wrap', maxWidth: 260 }}>
                        <div className="text-muted small">{row.message || '—'}</div>
                        {row.adminNotes && (
                          <div className="alert alert-warning py-1 px-2 small mt-2 mb-0">
                            Ghi chú: {row.adminNotes}
                          </div>
                        )}
                      </td>
                      <td>{renderStatusBadge(row.status)}</td>
                      <td style={{ minWidth: 160 }}>
                        <div className="small text-muted">Gửi: {new Date(row.requestDate).toLocaleString()}</div>
                        {row.processedDate && (
                          <div className="small text-muted">Xử lý: {new Date(row.processedDate).toLocaleString()}</div>
                        )}
                      </td>
                      <td className="text-center">
                        {row.status === 'PENDING' ? (
                          <div className="d-flex justify-content-center gap-2">
                            <button className="btn btn-sm btn-outline-success" onClick={() => onApprove(row.id)}>
                              <i className="fas fa-check me-1"></i>Duyệt
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => onReject(row.id)}>
                              <i className="fas fa-times me-1"></i>Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="badge bg-light text-muted">Không còn thao tác</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHostRegistrationsPage;

