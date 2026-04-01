import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatVND } from "../../utils/format";

const STATUS_OPTIONS = [  { value: "", label: "Tất cả trạng thái" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "COMPLETED", label: "Đã hoàn thành" }, 
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "PAYMENT_PENDING", label: "Chờ thanh toán" },
];

const STATUS_COLORS = {
  PAID: "warning",
  CONFIRMED: "success",
  COMPLETED: "info",
  CANCELLED: "danger",
  PENDING: "secondary",
  PAYMENT_PENDING: "warning",
};

const AdminAllBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState([]);
 
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/admin/bookings");
      setBookings(res.data);
    } catch (err) {
      setError("Không thể tải danh sách booking.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId) => {
    if (!window.confirm("Xác nhận phê duyệt booking #" + bookingId + "?"))
      return;
    setActionLoading(bookingId);
    try {
      await api.post(`/api/v1/admin/bookings/${bookingId}/approve`);
      await fetchBookings(); // Refresh data
    } catch (err) {
      alert("Lỗi khi phê duyệt!");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (bookingId) => {
    const reason = window.prompt("Nhập lý do từ chối:");
    if (!reason) return;
    setActionLoading(bookingId);
    try {
      await api.post(`/api/v1/admin/bookings/${bookingId}/reject`, { reason });
      await fetchBookings(); // Refresh data
    } catch (err) {
      alert("Từ chối không thành công! Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  const statusLabel = (status) => {
    const s = typeof status === 'object' ? status?.name : status;
    switch (s) {
      case 'PAID': return 'ĐÃ THANH TOÁN';
      case 'CONFIRMED': return 'ĐÃ XÁC NHẬN';
      case 'COMPLETED': return 'HOÀN THÀNH';
      case 'CANCELLED': return 'ĐÃ HỦY';
      case 'PENDING': return 'CHỜ XÁC NHẬN';
      case 'PAYMENT_PENDING': return 'CHỜ THANH TOÁN';
      default: return s || 'Không có';
    }
  };

  const handleExport = () => {
    const exportData = bookings.map((b) => ({
      ID: b.id,
      "Khách hàng": b.user?.fullName || b.user?.email || "N/A",
      Tour: b.tour?.name || "N/A",
      "Số tiền": b.invoice?.totalAmount ? formatVND(b.invoice.totalAmount) : "Không có",
      "Ngày đặt": b.bookingTime
        ? new Date(b.bookingTime).toLocaleString("vi-VN")
        : "N/A",
      "Trạng thái": statusLabel(b.status),
    }));

    const csvContent =
      "data:text/csv;charset=utf-8," +
      Object.keys(exportData[0]).join(",") +
      "\n" +
      exportData.map((row) => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `bookings_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = bookings.filter((b) => {
    const status = b.status?.name || b.status;
    const matchesStatus = !statusFilter || status === statusFilter;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (b.user?.fullName || "").toLowerCase().includes(searchLower) ||
      (b.user?.email || "").toLowerCase().includes(searchLower) ||
      (b.tour?.name || "").toLowerCase().includes(searchLower);

    const bookingDate = new Date(b.bookingTime);
    const matchesDate =
      !dateFilter || bookingDate.toISOString().split("T")[0] === dateFilter;

    return matchesStatus && matchesSearch && matchesDate;
  });

  const getStatusBadgeClass = (status) => {
    const statusName = typeof status === "object" ? status.name : status;
    return `bg-${STATUS_COLORS[statusName] || "secondary"}`;
  };

  // Handle select single booking
  const handleSelectBooking = (bookingId) => {
    setSelectedBookings((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  // Handle select all bookings on current page
  const handleSelectAll = () => {
    const currentIds = filteredBookings.map((b) => b.id);
    if (selectedBookings.length === currentIds.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(currentIds);
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (!window.confirm("Xác nhận phê duyệt tất cả booking đã chọn?")) return;
    setActionLoading("bulk-approve");
    try {
      await Promise.all(
        selectedBookings.map((id) =>
          api.post(`/api/v1/admin/bookings/${id}/approve`)
        )
      );
      await fetchBookings();
      setSelectedBookings([]);
    } catch (err) {
      alert("Xác nhận hàng loạt không thành công! Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk reject
  const handleBulkReject = async () => {
    const reason = window.prompt(
      "Nhập lý do từ chối cho tất cả booking đã chọn:"
    );
    if (!reason) return;
    setActionLoading("bulk-reject");
    try {
      await Promise.all(
        selectedBookings.map((id) =>
          api.post(`/api/v1/admin/bookings/${id}/reject`, { reason })
        )
      );
      await fetchBookings();
      setSelectedBookings([]);
    } catch (err) {
      alert("Lỗi khi từ chối hàng loạt!");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete booking handler
  const handleDeleteBooking = async (bookingId) => {
    if (
      !window.confirm("Bạn có chắc chắn muốn xóa booking #" + bookingId + "?")
    )
      return;
    setActionLoading(bookingId);
    try {
      await api.delete(`/api/v1/admin/bookings/${bookingId}`);
      await fetchBookings();
    } catch (err) {
      alert("Xóa đơn đặt tour không thành công! Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  return (    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Quản lý đơn đặt tour</h2>
        <button className="btn btn-success" onClick={handleExport}>
          <i className="fas fa-download me-2"></i>Xuất báo cáo
        </button>
      </div>      {/* Bulk actions */}
      <div className="mb-3 d-flex align-items-center gap-2">
        <button
          className="btn btn-outline-success btn-sm"
          onClick={handleBulkApprove}
          disabled={
            selectedBookings.length === 0 || actionLoading === "bulk-approve"
          }
        >
          {actionLoading === "bulk-approve" ? (
            <span className="spinner-border spinner-border-sm me-1"></span>
          ) : (
            <i className="fas fa-check me-1"></i>
          )}
          Xác nhận tất cả
        </button>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={handleBulkReject}
          disabled={
            selectedBookings.length === 0 || actionLoading === "bulk-reject"
          }
        >
          {actionLoading === "bulk-reject" ? (
            <span className="spinner-border spinner-border-sm me-1"></span>
          ) : (
            <i className="fas fa-times me-1"></i>
          )}
          Từ chối tất cả
        </button>
        <span className="text-muted small ms-2">
          Đã chọn {selectedBookings.length} đơn đặt tour
        </span>
      </div>{/* Basic Filters */}
      <div className="row mb-3">
        <div className="col-md-4">
          <label className="form-label">Trạng thái:</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Tìm kiếm thông tin:</label>
          <input
            type="text"
            className="form-control"
            placeholder="Nhập tên khách hàng, email hoặc tên tour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Ngày đặt tour:</label>
          <input
            type="date"
            className="form-control"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>      {loading ? (
        <LoadingSpinner message="Đang tải danh sách đơn đặt tour..." />
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : filteredBookings.length === 0 ? (
        <div className="alert alert-info">Chưa có đơn đặt tour nào.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">            <thead className="table-light">
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      selectedBookings.length === filteredBookings.length &&
                      filteredBookings.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Mã đơn</th>
                <th>Thông tin khách</th>
                <th>Tên tour</th>
                <th>Tổng tiền</th>
                <th>Thời gian đặt</th>
                <th>Tình trạng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedBookings.includes(b.id)}
                      onChange={() => handleSelectBooking(b.id)}
                    />
                  </td>
                  <td>{b.id}</td>
                  <td>{b.userFullName || b.userEmail || "Không có"}</td>
                  <td>{b.tourName || "Không có"}</td>
                  <td>
                    {b.totalAmount ? formatVND(b.totalAmount) : "Không có"}
                  </td>
                  <td>
                    {b.bookingTime
                      ? new Date(b.bookingTime).toLocaleString("vi-VN")
                      : "Không có"}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <Link
                        to={`/admin/bookings/${b.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="fas fa-eye"></i>
                      </Link>
                      {b.status === "PAID" && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleApprove(b.id)}
                            disabled={actionLoading === b.id}
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleReject(b.id)}
                            disabled={actionLoading === b.id}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </>
                      )}
                      {/* Delete button for all bookings */}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteBooking(b.id)}
                        disabled={actionLoading === b.id}
                        title="Xóa booking"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
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

export default AdminAllBookingsPage;
