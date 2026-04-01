import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * RegisterPage Component
 * Allows users to create a new account
 */
const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    agreeTerms: false,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form validation
    if (
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.fullName.trim()
    ) {
      setError("All fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!formData.agreeTerms) {
      setError("Bạn cần đồng ý với điều khoản và điều kiện sử dụng");
      return;
    }

    try {
      setError("");
      setLoading(true);

      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });

      // Registration successful, redirect to success page
      navigate("/register-success", {
        state: { email: formData.email },
      });
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message ||
          "Đăng ký không thành công. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                {" "}
                <div className="text-center mb-4">
                  <h1 className="h3 mb-3 fw-normal">Tạo Tài Khoản</h1>
                  <p className="text-muted">
                    Tham gia Tour Gold để đặt tour và khám phá những điểm đến
                    tuyệt vời
                  </p>
                </div>
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {" "}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="fullName" className="form-label">
                        Họ và Tên
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-user"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Nhập họ và tên của bạn"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="username" className="form-label">
                        Tên Đăng Nhập
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-at"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="Chọn tên đăng nhập"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Địa Chỉ Email
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-envelope"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Nhập địa chỉ email của bạn"
                        required
                      />
                    </div>
                    <div className="form-text">
                      Chúng tôi sẽ không bao giờ chia sẻ email của bạn với bất
                      kỳ ai khác.
                    </div>
                  </div>

                  <div className="row">
                    {" "}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="password" className="form-label">
                        Mật Khẩu
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-lock"></i>
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Tạo mật khẩu"
                          required
                        />
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"
                          }
                        >
                          <i
                            className={`fas fa-eye${
                              showPassword ? "-slash" : ""
                            }`}
                          ></i>
                        </button>
                      </div>
                      <div className="form-text">
                        Mật khẩu phải có ít nhất 8 ký tự.
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="confirmPassword" className="form-label">
                        Xác Nhận Mật Khẩu
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-lock"></i>
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Xác nhận mật khẩu của bạn"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="agreeTerms"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      required
                    />{" "}
                    <label className="form-check-label" htmlFor="agreeTerms">
                      Tôi đồng ý với{" "}
                      <Link to="/terms" className="text-decoration-none">
                        Điều Khoản Dịch Vụ
                      </Link>{" "}
                      và{" "}
                      <Link to="/privacy" className="text-decoration-none">
                        Chính Sách Bảo Mật
                      </Link>
                    </label>
                  </div>

                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading}
                    >
                      {" "}
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Đang Tạo Tài Khoản...
                        </>
                      ) : (
                        "Tạo Tài Khoản"
                      )}
                    </button>
                  </div>
                </form>
                <div className="mt-4 text-center">
                  {" "}
                  <p className="mb-0">
                    Đã có tài khoản?{" "}
                    <Link to="/login" className="text-decoration-none">
                      Đăng Nhập
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
