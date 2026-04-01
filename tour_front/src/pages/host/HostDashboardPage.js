import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tourService from '../../services/tourService';
import authService from '../../services/authService';

const formatCurrency = (amount) => {
	if (Number.isNaN(Number(amount))) {
		return '—';
	}

	try {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
			maximumFractionDigits: 0,
		}).format(amount);
	} catch (error) {
		console.warn('Không định dạng được giá tiền:', error);
		return `${amount}`;
	}
};

const HostDashboardPage = () => {
	const navigate = useNavigate();
	const [tours, setTours] = useState([]);
	const [loadingTours, setLoadingTours] = useState(true);
	const [tourError, setTourError] = useState(null);


		const currentUser = authService.getCurrentUser();
		const isAuthenticated = authService.isAuthenticated();
		const isAdmin = authService.isAdmin();
		const isHost = authService.hasRole('HOST');
		const canManageTours = isAdmin || isHost;

	const loadTours = useCallback(async () => {
		if (!canManageTours) {
			setTours([]);
			setLoadingTours(false);
			return;
		}

		try {
			setLoadingTours(true);
			setTourError(null);
			const data = await tourService.getMyTours();
			setTours(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error('Không thể tải danh sách tour của bạn:', error);
			const message =
				error?.response?.data?.message ||
				error?.message ||
				'Đã xảy ra lỗi khi tải tour của bạn. Vui lòng thử lại sau.';
			setTourError(message);
		} finally {
			setLoadingTours(false);
		}
	}, [canManageTours]);

	useEffect(() => {
		loadTours();
	}, [loadTours]);

	const handleGoToApplication = () => {
		navigate('/host/apply');
	};

	const handleAddTour = () => {
		navigate('/host/add-tour');
	};

	const handleEditTour = (tourId) => {
		navigate(`/host/tours/${tourId}/edit`);
	};

	const handleDeleteTour = async (tourId) => {
		if (!window.confirm('Bạn có chắc chắn muốn xóa tour này?')) {
			return;
		}

		try {
			await tourService.deleteTour(tourId);
			await loadTours();
		} catch (error) {
			console.error('Không thể xóa tour:', error);
			const message =
				error?.response?.data?.message ||
				error?.message ||
				'Đã xảy ra lỗi khi xóa tour. Vui lòng thử lại sau.';
			alert(message);
		}
	};

	if (!isAuthenticated) {
		return (
			<div className="host-dashboard">
				<div className="alert alert-warning">
					Bạn cần đăng nhập để truy cập trung tâm host.
				</div>
			</div>
		);
	}

	return (
		<div className="host-dashboard">
			<div className="page-header d-flex justify-content-between align-items-center">
				<div>
					<h2>Trung tâm Host</h2>
					<p className="text-muted mb-0">
						Xin chào{currentUser?.fullName ? `, ${currentUser.fullName}` : ''}! Quản lý tour của bạn tại đây.
					</p>
				</div>
				{canManageTours && (
					<button type="button" className="btn btn-primary" onClick={handleAddTour}>
						+ Tạo tour mới
					</button>
				)}
			</div>

			{!isHost && !isAdmin && (
				<div className="card mb-4">
					<div className="card-body">
						<h5>Bạn chưa phải là host</h5>
						<p className="text-muted">
							Gửi yêu cầu trở thành host để có thể tạo và quản lý tour riêng của bạn.
						</p>
						<button
							type="button"
							className="btn btn-outline-primary"
							onClick={handleGoToApplication}
						>
							Tới trang đăng ký host
						</button>
					</div>
				</div>
			)}

			{canManageTours && (
				<div className="card">
					<div className="card-header bg-white d-flex justify-content-between align-items-center">
						<h5 className="mb-0">Tour của bạn</h5>
						<button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadTours} disabled={loadingTours}>
							{loadingTours ? 'Đang tải...' : 'Làm mới'}
						</button>
					</div>
					<div className="card-body">
						{tourError && (
							<div className="alert alert-danger" role="alert">
								{tourError}
							</div>
						)}

						{!loadingTours && tours.length === 0 && !tourError && (
							<div className="text-center text-muted py-4">
								<p>Bạn chưa có tour nào. Hãy tạo tour đầu tiên của bạn!</p>
								<button type="button" className="btn btn-primary" onClick={handleAddTour}>
									+ Tạo tour mới
								</button>
							</div>
						)}

						{loadingTours && (
							<div className="text-center py-4 text-muted">Đang tải danh sách tour...</div>
						)}

						{!loadingTours && tours.length > 0 && (
							<div className="table-responsive">
								<table className="table">
									<thead>
										<tr>
											<th>Tên tour</th>
											<th>Loại tour</th>
											<th>Số lượng tối đa</th>
											<th>Giá thấp nhất</th>
											<th>Thời gian</th>
											<th>Trạng thái</th>
											<th className="text-end">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{tours.map((tour) => {
											const lowestPrice = Array.isArray(tour.tourPrices) && tour.tourPrices.length > 0
												? Math.min(...tour.tourPrices.map((price) => Number(price.price || 0)))
												: null;

											return (
												<tr key={tour.id}>
													<td>{tour.name}</td>
													<td>
														{Array.isArray(tour.typeOfTourEntities) && tour.typeOfTourEntities.length > 0
															? tour.typeOfTourEntities.map((type) => type.name).join(', ')
															: '—'}
													</td>
													<td>{tour.maxQuantity || '—'}</td>
													<td>{lowestPrice ? formatCurrency(lowestPrice) : '—'}</td>
													<td>
														{tour.startDate
															? new Date(tour.startDate).toLocaleDateString('vi-VN')
															: '—'}{' '}
														-{' '}
														{tour.endDate
															? new Date(tour.endDate).toLocaleDateString('vi-VN')
															: '—'}
													</td>
													<td>
														<span className={`badge bg-${tour.approvalStatus === 'APPROVED' ? 'success' : tour.approvalStatus === 'REJECTED' ? 'danger' : 'secondary'}`}>
															{tour.approvalStatus || 'PENDING'}
														</span>
													</td>
													<td className="text-end">
														<div className="btn-group btn-group-sm" role="group" aria-label="Actions">
															<button type="button" className="btn btn-outline-primary" onClick={() => handleEditTour(tour.id)}>
																Sửa
															</button>
															<button type="button" className="btn btn-outline-danger" onClick={() => handleDeleteTour(tour.id)}>
																Xóa
															</button>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default HostDashboardPage;
