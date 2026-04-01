import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import hostService from '../../services/hostService';
import { useAuth } from '../../context/AuthContext';

const HostApplicationPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const alreadyHost = hasRole ? hasRole(['ROLE_HOST', 'ROLE_ADMIN']) : false;
  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    businessName: '',
    businessAddress: '',
    taxCode: '',
    businessLicenseNumber: '',
    supportingDocumentUrl: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      contactName: prev.contactName || user?.fullName || user?.username || ''
    }));
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setSuccessMessage('');
      setErrorMessage('');

      if (!formData.contactName.trim()) {
        setErrorMessage('Vui lòng nhập họ tên liên hệ.');
        setSubmitting(false);
        return;
      }
      if (!formData.contactPhone.trim()) {
        setErrorMessage('Vui lòng nhập số điện thoại liên hệ.');
        setSubmitting(false);
        return;
      }
      if (!formData.taxCode.trim()) {
        setErrorMessage('Vui lòng nhập mã số thuế của doanh nghiệp.');
        setSubmitting(false);
        return;
      }
      if (!formData.businessLicenseNumber.trim()) {
        setErrorMessage('Vui lòng nhập số giấy phép kinh doanh.');
        setSubmitting(false);
        return;
      }
      if (!formData.message.trim()) {
        setErrorMessage('Vui lòng mô tả ngắn gọn về dịch vụ hoặc kế hoạch của bạn.');
        setSubmitting(false);
        return;
      }

      await hostService.requestHost({
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone.trim(),
        businessName: formData.businessName.trim(),
        businessAddress: formData.businessAddress.trim(),
        taxCode: formData.taxCode.trim(),
        businessLicenseNumber: formData.businessLicenseNumber.trim(),
        supportingDocumentUrl: formData.supportingDocumentUrl.trim(),
        message: formData.message.trim()
      });
      setSuccessMessage('Yêu cầu của bạn đã được gửi. Chúng tôi sẽ liên hệ sau khi quản trị viên phê duyệt.');
    } catch (error) {
      console.error('Không thể gửi yêu cầu trở thành host:', error);
      const message =
        typeof error?.response?.data === 'string'
          ? error.response.data
          : error?.response?.data?.message ||
            error?.message ||
            'Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại sau.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4 p-md-5">
              <h1 className="h3 mb-3">Đăng ký trở thành host</h1>
              {alreadyHost ? (
                <div className="alert alert-success" role="alert">
                  Bạn đã có quyền host. Hãy quay lại trung tâm host để quản lý tour của bạn.
                  <div className="mt-3">
                    <button type="button" className="btn btn-success" onClick={() => navigate('/host/dashboard')}>
                      Đi tới trung tâm host
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-muted mb-4">
                    Bạn muốn tạo và quản lý tour du lịch của riêng mình? Gửi yêu cầu ngay hôm nay để đội ngũ quản trị xem xét và kích hoạt quyền host cho tài khoản của bạn.
                  </p>

                  <ul className="list-unstyled mb-4">
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Tạo tour mới, quản lý lịch trình và giá linh hoạt.
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Theo dõi đơn đặt tour, chăm sóc khách hàng trực tiếp.
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Cập nhật thông tin, hình ảnh tour dễ dàng.
                    </li>
                  </ul>

                  {successMessage && (
                    <div className="alert alert-success" role="alert">
                      {successMessage}
                    </div>
                  )}

                  {errorMessage && (
                    <div className="alert alert-danger" role="alert">
                      {errorMessage}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="contactName" className="form-label">Họ tên liên hệ *</label>
                    <input
                      type="text"
                      id="contactName"
                      name="contactName"
                      className="form-control"
                      placeholder="Nguyễn Văn A"
                      value={formData.contactName}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="contactPhone" className="form-label">Số điện thoại *</label>
                    <input
                      type="tel"
                      id="contactPhone"
                      name="contactPhone"
                      className="form-control"
                      placeholder="0901 234 567"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="businessName" className="form-label">Tên cơ sở/đơn vị</label>
                    <input
                      type="text"
                      id="businessName"
                      name="businessName"
                      className="form-control"
                      placeholder="Công ty TNHH Du lịch ABC"
                      value={formData.businessName}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="businessAddress" className="form-label">Địa chỉ kinh doanh</label>
                    <input
                      type="text"
                      id="businessAddress"
                      name="businessAddress"
                      className="form-control"
                      placeholder="Số 123, Đường ABC, Quận 1, TP.HCM"
                      value={formData.businessAddress}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="taxCode" className="form-label">Mã số thuế doanh nghiệp *</label>
                    <input
                      type="text"
                      id="taxCode"
                      name="taxCode"
                      className="form-control"
                      placeholder="0312345678"
                      value={formData.taxCode}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="businessLicenseNumber" className="form-label">Số giấy phép kinh doanh *</label>
                    <input
                      type="text"
                      id="businessLicenseNumber"
                      name="businessLicenseNumber"
                      className="form-control"
                      placeholder="Số giấy phép đăng ký doanh nghiệp"
                      value={formData.businessLicenseNumber}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="supportingDocumentUrl" className="form-label">Link tài liệu hỗ trợ</label>
                    <input
                      type="url"
                      id="supportingDocumentUrl"
                      name="supportingDocumentUrl"
                      className="form-control"
                      placeholder="Link Google Drive/OneDrive chứa giấy phép, bảo hiểm, PCCC..."
                      value={formData.supportingDocumentUrl}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                    <div className="form-text">Vui lòng đảm bảo liên kết chia sẻ công khai để quản trị viên có thể kiểm tra.</div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="message" className="form-label">Giới thiệu về dịch vụ *</label>
                    <textarea
                      id="message"
                      name="message"
                      className="form-control"
                      rows="5"
                      placeholder="Mô tả kinh nghiệm tổ chức tour, khu vực hoạt động, điểm mạnh..."
                      value={formData.message}
                      onChange={handleChange}
                      disabled={submitting}
                    ></textarea>
                    <div className="form-text">Thông tin này giúp quản trị viên đánh giá và liên hệ với bạn dễ dàng hơn.</div>
                    <div className="form-text">Nêu rõ loại hình tour, kinh nghiệm, đội ngũ, khu vực hoạt động và chứng chỉ liên quan.</div>
                  </div>

                  <div className="alert alert-warning" role="alert">
                    <i className="fas fa-shield-alt me-2"></i>
                    Bằng việc gửi biểu mẫu, bạn cam kết thông tin chính xác. Quản trị viên sẽ đối chiếu mã số thuế trên cổng thông tin của Tổng cục Thuế và hồ sơ đính kèm trước khi cấp quyền host.
                  </div>

                  <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu trở thành host'}
                  </button>
                </>
              )}
            </div>
          </div>

          {!alreadyHost && (
            <div className="alert alert-info mt-4 mb-0" role="alert">
              <i className="fas fa-info-circle me-2"></i>
              Yêu cầu sẽ được quản trị viên xem xét trong vòng 1-2 ngày làm việc. Bạn có thể truy cập lại trang này để cập nhật thông tin nếu cần.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostApplicationPage;
