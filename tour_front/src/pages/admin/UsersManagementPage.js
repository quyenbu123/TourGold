import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import userService from "../../services/userService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import api from "../../services/api";

/**
 * UsersManagementPage Component
 * Provides interface for administrators to manage users
 */
const UsersManagementPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "ascending",
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const ROLE_OPTIONS = [
    { value: "", label: "Tất cả" },
    { value: "ROLE_USER", label: "User" },
    { value: "ROLE_ADMIN", label: "Admin" },
  ];

  const ROLE_COLORS = {
    ROLE_USER: "secondary",
    ROLE_ADMIN: "danger",
  };

  // Fetch users data
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Initiating user data fetch from admin page");

      // Try a direct API call if userService is not working
      let response;
      try {
        // First try with userService
        response = await userService.getAllUsers();
        console.log("Response from userService:", response);
      } catch (serviceError) {
        console.error("userService.getAllUsers failed:", serviceError);

        // Fallback to direct API call
        console.log("Trying direct API call as fallback");
        const directResponse = await api.get("/api/v1/users");
        response = directResponse.data;
        console.log("Direct API response:", response);
      }

      // Process the response data
      let userData = [];

      if (Array.isArray(response)) {
        console.log("Response is an array with length:", response.length);
        userData = response;
      } else if (response && typeof response === "object") {
        console.log("Response is an object, keys:", Object.keys(response));

        // Try to extract data from various possible response structures
        if (Array.isArray(response.data)) {
          userData = response.data;
        } else if (response.content && Array.isArray(response.content)) {
          userData = response.content;
        } else if (response.users && Array.isArray(response.users)) {
          userData = response.users;
        } else {
          // Check any property that might be an array of users
          const possibleArrayProps = Object.keys(response).filter(
            (key) =>
              Array.isArray(response[key]) &&
              response[key].length > 0 &&
              typeof response[key][0] === "object"
          );

          if (possibleArrayProps.length > 0) {
            console.log(
              `Found potential users array in property: ${possibleArrayProps[0]}`
            );
            userData = response[possibleArrayProps[0]];
          } else {
            // If response is an object but not in expected format, treat it as a single user
            userData = [response];
          }
        }
      }

      console.log("Processed user data:", userData);

      if (userData && userData.length > 0) {
        // Ensure all user objects have an id property
        const validatedUsers = userData.map((user) => {
          if (!user.id && user._id) {
            return { ...user, id: user._id };
          }
          return user;
        });

        setUsers(validatedUsers);
        console.log("Users state updated with", validatedUsers.length, "users");
      } else {
        console.warn("No users found or empty response", response);
        setError(
          "Không tìm thấy dữ liệu người dùng. Vui lòng kiểm tra API hoặc quyền truy cập."
        );
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        `Không thể tải danh sách user: ${
          err.message || "Không rõ nguyên nhân"
        }. Vui lòng kiểm tra kết nối mạng và quyền truy cập.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle sort
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Sort users
  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...users];
    if (sortConfig.key) {
      sortableUsers.sort((a, b) => {
        // Handle null or undefined values
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";

        if (aValue < bValue) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [users, sortConfig]);

  // Filter and search users
  const filteredUsers = React.useMemo(() => {
    return sortedUsers.filter((user) => {
      const matchesSearch =
        searchTerm === "" ||
        (user.username &&
          user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email &&
          user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.fullName &&
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole =
        roleFilter === "" ||
        (user.roles && user.roles.some((role) => role.name === roleFilter));

      return matchesSearch && matchesRole;
    });
  }, [sortedUsers, searchTerm, roleFilter]);

  // Pagination
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? "↑" : "↓";
    }
    return "";
  };

  // Handle user selection
  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle select all users
  const handleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map((user) => user.id));
    }
  };

  // Close delete confirmation modal
  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
    // Remove modal-open class when closing
    document.body.classList.remove("modal-open");
  };

  // Open delete confirmation modal
  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
    // Add a class to the body to prevent background scrolling
    document.body.classList.add("modal-open");
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await userService.deleteUser(userToDelete.id);
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      setSelectedUsers(selectedUsers.filter((id) => id !== userToDelete.id)); // Remove from selected if present
      closeModal();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Lỗi khi xóa user!");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa các user đã chọn?")) return;
    setBulkDeleteLoading(true);
    try {
      await Promise.all(selectedUsers.map((id) => userService.deleteUser(id)));
      setUsers(users.filter((u) => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
    } catch (err) {
      alert("Lỗi khi xóa nhiều user!");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    if (filteredUsers.length === 0) return;
    const exportData = filteredUsers.map((u) => ({
      ID: u.id || "",
      "Họ tên": u.fullName || "",
      Email: u.email || "",
      Username: u.username || "",
      "Vai trò": u.roles
        ? u.roles.map((r) => r.name.replace("ROLE_", "")).join(", ")
        : "",
      "Ngày tạo": u.createdAt
        ? new Date(u.createdAt).toLocaleString("vi-VN")
        : "",
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
      `users_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  // Get role badge class
  const getRoleBadgeClass = (role) => {
    switch (typeof role === "object" ? role.name : role) {
      case "ROLE_ADMIN":
        return "bg-danger";
      case "ROLE_MANAGER":
        return "bg-warning text-dark";
      case "ROLE_STAFF":
        return "bg-info";
      case "ROLE_USER":
      default:
        return "bg-secondary";
    }
  };

  // Handle retry
  const handleRetry = () => {
    fetchUsers();
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Quản lý người dùng</h2>
        <button
          className="btn btn-success"
          onClick={handleExport}
          disabled={filteredUsers.length === 0}
        >
          <i className="fas fa-download me-2"></i>Xuất CSV
        </button>
      </div>
      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label">Tìm kiếm:</label>
          <input
            type="text"
            className="form-control"
            placeholder="Tên, email, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Lọc theo vai trò:</label>
          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Đang tải danh sách người dùng..." />
      ) : error ? (
        <div className="alert alert-danger d-flex align-items-center">
          <div className="me-3">
            <i className="fas fa-exclamation-circle fa-2x"></i>
          </div>
          <div>
            <h5 className="mb-1">Lỗi khi tải dữ liệu</h5>
            <p className="mb-1">{error}</p>
            <button
              className="btn btn-sm btn-primary mt-2"
              onClick={handleRetry}
            >
              <i className="fas fa-redo me-1"></i> Thử lại
            </button>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="alert alert-info">Không có người dùng nào.</div>
      ) : (
        <>
          <div className="mb-2 d-flex align-items-center">
            <button
              className="btn btn-danger btn-sm me-2"
              onClick={handleBulkDelete}
              disabled={selectedUsers.length === 0 || bulkDeleteLoading}
            >
              {bulkDeleteLoading ? (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                <i className="fas fa-trash-alt me-1"></i>
              )}
              Xóa đã chọn
            </button>
            <span className="text-muted small">
              {selectedUsers.length} user được chọn
            </span>
          </div>
          <div className="card">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={
                            selectedUsers.length === currentUsers.length &&
                            currentUsers.length > 0
                          }
                          onChange={handleSelectAll}
                          className="form-check-input"
                        />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => requestSort("id")}
                      >
                        ID {getSortIndicator("id")}
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => requestSort("fullName")}
                      >
                        Họ tên {getSortIndicator("fullName")}
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => requestSort("email")}
                      >
                        Email {getSortIndicator("email")}
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => requestSort("username")}
                      >
                        Username {getSortIndicator("username")}
                      </th>
                      <th>Vai trò</th>
                      <th
                        className="cursor-pointer"
                        onClick={() => requestSort("createdAt")}
                      >
                        Ngày tạo {getSortIndicator("createdAt")}
                      </th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.map((u) => (
                      <tr key={u.id || Math.random()}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => handleSelectUser(u.id)}
                            className="form-check-input"
                          />
                        </td>
                        <td>{u.id || "N/A"}</td>
                        <td>{u.fullName || "N/A"}</td>
                        <td>{u.email || "N/A"}</td>
                        <td>{u.username || "N/A"}</td>
                        <td>
                          {u.roles && u.roles.length > 0
                            ? u.roles.map((r) => (
                                <span
                                  key={r.name}
                                  className={`badge ${getRoleBadgeClass(
                                    r
                                  )} me-1`}
                                >
                                  {r.name.replace("ROLE_", "")}
                                </span>
                              ))
                            : "N/A"}
                        </td>
                        <td>{u.createdAt ? formatDate(u.createdAt) : "N/A"}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => openDeleteModal(u)}
                            title="Xóa người dùng"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Users pagination" className="mt-4">
              <ul className="pagination justify-content-center">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li
                    key={i}
                    className={`page-item ${
                      i + 1 === currentPage ? "active" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => paginate(i + 1)}
                    >
                      {i + 1}
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
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </button>
                </li>
              </ul>
            </nav>
          )}

          {/* Delete Modal - Improved implementation */}
          {isDeleteModalOpen && (
            <div
              className="modal fade show"
              style={{
                display: "block",
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Xác nhận xóa</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeModal}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body">
                    {userToDelete && (
                      <>
                        <p>
                          Bạn có chắc chắn muốn xóa user{" "}
                          <strong>
                            {userToDelete?.username ||
                              userToDelete?.email ||
                              "này"}
                          </strong>
                          ?
                        </p>
                        <p className="text-danger mb-0">
                          Hành động này không thể hoàn tác.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDeleteUser}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          ></span>{" "}
                          Đang xóa...
                        </>
                      ) : (
                        "Xóa"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsersManagementPage;
