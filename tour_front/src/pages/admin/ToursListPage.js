import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import tourService from "../../services/tourService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatVND, formatDateVN } from "../../utils/format";

/**
 * AdminToursListPage Component
 * Displays a list of all tours for admin management
 */
const ToursListPage = () => {
  // State
  const [tours, setTours] = useState([]);
  const [filteredTours, setFilteredTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch tours data
  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoading(true);
        const data = await tourService.getAllToursForAdmin();
        setTours(data);
        setFilteredTours(data);
      } catch (err) {
        console.error("Error fetching tours:", err);
        setError("Không thể tải danh sách tour. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  // Extract tour types from all tours
  const tourTypes =
    tours.length > 0
      ? [
          ...new Set(
            tours.flatMap((tour) =>
              tour.typeOfTourEntities
                ? tour.typeOfTourEntities.map((type) => type.name)
                : []
            )
          ),
        ]
      : [];

  // Apply filters when search, filter or sort changes
  useEffect(() => {
    if (tours.length === 0) return;

    let results = [...tours];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(
        (tour) =>
          tour.name.toLowerCase().includes(searchLower) ||
          (tour.description &&
            tour.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply tour type filter
    if (filterType) {
      results = results.filter(
        (tour) =>
          tour.typeOfTourEntities &&
          tour.typeOfTourEntities.some(
            (type) => type.name.toLowerCase() === filterType.toLowerCase()
          )
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "name-asc":
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        results.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        results.sort((a, b) => {
          const aPrice =
            a.tourPrices && a.tourPrices.length > 0
              ? Math.min(...a.tourPrices.map((price) => price.price))
              : Infinity;
          const bPrice =
            b.tourPrices && b.tourPrices.length > 0
              ? Math.min(...b.tourPrices.map((price) => price.price))
              : Infinity;
          return aPrice - bPrice;
        });
        break;
      case "price-desc":
        results.sort((a, b) => {
          const aPrice =
            a.tourPrices && a.tourPrices.length > 0
              ? Math.min(...a.tourPrices.map((price) => price.price))
              : 0;
          const bPrice =
            b.tourPrices && b.tourPrices.length > 0
              ? Math.min(...b.tourPrices.map((price) => price.price))
              : 0;
          return bPrice - aPrice;
        });
        break;
      case "date-asc":
        results.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      case "date-desc":
        results.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        break;
      case "newest":
      default:
        results.sort((a, b) => b.id - a.id);
        break;
    }

    setFilteredTours(results);
    setCurrentPage(1); // Reset to first page when filters change
  }, [tours, searchTerm, filterType, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTours.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTours = filteredTours.slice(indexOfFirstItem, indexOfLastItem);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có";
    return formatDateVN(dateString, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Handle tour deletion
  const handleDeleteTour = async (tourId, tourName) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa tour "${tourName}"? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }

    try {
      setDeleteInProgress(true);
      await tourService.deleteTour(tourId);

      // Update tours list
      setTours((prevTours) => prevTours.filter((tour) => tour.id !== tourId));
      setFilteredTours((prevTours) =>
        prevTours.filter((tour) => tour.id !== tourId)
      );

      // Show success toast/notification (implementation depends on your UI library)
      alert(`Tour "${tourName}" đã được xóa thành công.`);
    } catch (err) {
      console.error(`Error deleting tour ${tourId}:`, err);
      setError(`Không thể xóa tour "${tourName}". Vui lòng thử lại sau.`);
    } finally {
      setDeleteInProgress(false);
    }
  };

  // Handle toggle display status
  const handleToggleDisplay = async (tourId) => {
    try {
      const updatedTour = await tourService.toggleTourDisplay(tourId);
      const updateList = (list) =>
        list.map((tour) =>
          tour.id === tourId
            ? { ...tour, isDisplayed: updatedTour.isDisplayed }
            : tour
        );
      setTours(updateList);
      setFilteredTours(updateList);
    } catch (err) {
      console.error(`Error toggling display for tour ${tourId}:`, err);
      setError(`Không thể thay đổi trạng thái hiển thị. Vui lòng thử lại.`);
    }
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="admin-tours-list-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Quản Lý Tour</h1>
        <Link to="/admin/tours/add" className="btn btn-primary">
          <i className="fas fa-plus-circle me-2"></i> Thêm Tour Mới
        </Link>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm kiếm tour..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm("")}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Tất cả loại tour</option>
                {tourTypes.map((type, index) => (
                  <option key={index} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Sắp xếp: Mới nhất</option>
                <option value="name-asc">Sắp xếp: Tên (A-Z)</option>
                <option value="name-desc">Sắp xếp: Tên (Z-A)</option>
                <option value="price-asc">Sắp xếp: Giá (Thấp đến Cao)</option>
                <option value="price-desc">Sắp xếp: Giá (Cao đến Thấp)</option>
                <option value="date-asc">Sắp xếp: Ngày bắt đầu (Sớm nhất)</option>
                <option value="date-desc">Sắp xếp: Ngày bắt đầu (Muộn nhất)</option>
              </select>
            </div>

            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("");
                  setSortBy("newest");
                }}
              >
                <i className="fas fa-undo me-2"></i> Đặt lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tours List */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-5">
              <LoadingSpinner message="Đang tải danh sách tour..." />
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="alert alert-danger" role="alert">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                <i className="fas fa-sync me-2"></i> Thử lại
              </button>
            </div>
          ) : filteredTours.length === 0 ? (
            <div className="text-center p-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h3 className="h5 mb-3">Không tìm thấy tour</h3>
              <p className="text-muted mb-4">
                {tours.length === 0
                  ? "Bạn chưa thêm tour nào."
                  : "Không có tour phù hợp với bộ lọc hiện tại."}
              </p>
              {tours.length === 0 ? (
                <Link to="/admin/tours/add" className="btn btn-primary">
                  <i className="fas fa-plus-circle me-2"></i> Thêm tour đầu tiên
                </Link>
              ) : (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterType("");
                    setSortBy("newest");
                  }}
                >
                  <i className="fas fa-undo me-2"></i> Đặt lại bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "60px" }}>ID</th>
                      <th>Tên Tour</th>
                      <th>Loại</th>
                      <th>Khoảng thời gian</th>
                      <th>Giá</th>
                      <th>Số lượng tối đa</th>
                      <th>Trạng thái</th>
                      <th style={{ width: "180px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTours.map((tour) => (
                      <tr key={tour.id}>
                        <td>{tour.id}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 me-3">
                              {tour.images && tour.images.length > 0 ? (
                                <img
                                  src={tour.images[0].url}
                                  alt={tour.name}
                                  className="rounded"
                                  width="50"
                                  height="50"
                                  style={{ objectFit: "cover" }}
                                />
                              ) : (
                                <div
                                  className="bg-light d-flex align-items-center justify-content-center rounded"
                                  style={{ width: "50px", height: "50px" }}
                                >
                                  <i className="fas fa-image text-muted"></i>
                                </div>
                              )}
                            </div>
                            <div>
                              <h6 className="mb-0">{tour.name}</h6>
                              <small className="text-muted">
                                {tour.description
                                  ? tour.description.length > 60
                                    ? `${tour.description.substring(0, 60)}...`
                                    : tour.description
                                  : "Không có mô tả"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {tour.typeOfTourEntities &&
                          tour.typeOfTourEntities.length > 0 ? (
                            tour.typeOfTourEntities.map((type) => (
                              <span
                                key={type.id}
                                className="badge bg-info me-1"
                              >
                                {type.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">Chưa xác định</span>
                          )}
                        </td>
                        <td>
                          {tour.startDate && tour.endDate ? (
                            <div>
                              <div>{formatDate(tour.startDate)}</div>
                              <div className="text-muted">đến</div>
                              <div>{formatDate(tour.endDate)}</div>
                            </div>
                          ) : (
                            <span className="text-muted">Chưa xác định</span>
                          )}
                        </td>
                        <td>
                          {tour.tourPrices && tour.tourPrices.length > 0 ? (
                            <div>
                              <div className="fw-bold">
                                {formatVND(Math.min(...tour.tourPrices.map((price) => price.price)))}
                              </div>
                              {tour.tourPrices.length > 1 && (
                                <small className="text-muted">
                                  {tour.tourPrices.length} gói
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">Chưa có giá</span>
                          )}
                        </td>
                        <td>
                          {tour.maxQuantity || (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${tour.isDisplayed ? "bg-success" : "bg-secondary"}`}>
                            {tour.isDisplayed ? "Hiển thị" : "Đang ẩn"}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                             <button
                              className={`btn btn-sm ${tour.isDisplayed ? "btn-outline-warning" : "btn-outline-success"}`}
                              title={tour.isDisplayed ? "Ẩn tour" : "Hiển thị tour"}
                              onClick={() => handleToggleDisplay(tour.id)}
                            >
                              <i className={`fas ${tour.isDisplayed ? "fa-eye-slash" : "fa-eye"}`}></i>
                            </button>
                            <Link
                              to={`/tours/${tour.id}`}
                              className="btn btn-sm btn-outline-secondary"
                              title="Xem tour"
                              target="_blank"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            <Link
                              to={`/admin/tours/edit/${tour.id}`}
                              className="btn btn-sm btn-outline-primary"
                              title="Sửa tour"
                            >
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Xóa tour"
                              onClick={() =>
                                handleDeleteTour(tour.id, tour.name)
                              }
                              disabled={deleteInProgress}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div>
                    <small className="text-muted">
                      Hiển thị {indexOfFirstItem + 1} đến {" "}
                      {Math.min(indexOfLastItem, filteredTours.length)} trong {" "}
                      {filteredTours.length} tour
                    </small>
                  </div>
                  <nav aria-label="Page navigation">
                    <ul className="pagination mb-0">
                      <li
                        className={`page-item ${
                          currentPage === 1 ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left small"></i>
                        </button>
                      </li>
                      {[...Array(totalPages).keys()].map((number) => (
                        <li
                          key={number + 1}
                          className={`page-item ${
                            currentPage === number + 1 ? "active" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(number + 1)}
                          >
                            {number + 1}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`page-item ${
                          currentPage === totalPages ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <i className="fas fa-chevron-right small"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToursListPage;
