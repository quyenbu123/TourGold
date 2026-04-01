import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tourService from '../../services/tourService';

const defaultPriceRow = () => ({ name: '', price: '', description: '' });
const defaultItineraryRow = () => ({ title: '', description: '', date: '', time: '' });

const TABS = ['basic', 'pricing', 'services', 'itinerary', 'images'];

const HostAddTourPage = () => {
	const navigate = useNavigate();
	const [tourTypes, setTourTypes] = useState([]);
	const [activeTab, setActiveTab] = useState(TABS[0]);
	const [saving, setSaving] = useState(false);
	const [loadingTypes, setLoadingTypes] = useState(true);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null);

	const [tourData, setTourData] = useState({
		name: '',
		description: '',
		startDate: '',
		endDate: '',
		maxQuantity: '',
		typeOfTourIds: [],
		services: '',
		tourPrices: [defaultPriceRow()],
		itineraries: [defaultItineraryRow()],
	});

	const [mainImage, setMainImage] = useState(null);
		const [mainImagePreview, setMainImagePreview] = useState(null);
	const [additionalImages, setAdditionalImages] = useState([]);
	const [imagePreviews, setImagePreviews] = useState([]);
	const previewUrlsRef = useRef([]);
		const mainPreviewUrlRef = useRef(null);

	useEffect(() => {
		const loadTypes = async () => {
			try {
				setLoadingTypes(true);
				const types = await tourService.getTourTypes();
				setTourTypes(Array.isArray(types) ? types : []);
			} catch (err) {
				console.error('Không thể tải loại tour:', err);
				setError('Không thể tải loại tour. Vui lòng thử lại sau.');
			} finally {
				setLoadingTypes(false);
			}
		};

		loadTypes();

		return () => {
			previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
			previewUrlsRef.current = [];
					if (mainPreviewUrlRef.current) {
						URL.revokeObjectURL(mainPreviewUrlRef.current);
						mainPreviewUrlRef.current = null;
					}
		};
	}, []);

	const formErrors = useMemo(() => {
		const errors = {};

		if (!tourData.name.trim()) errors.name = 'Tên tour không được để trống';
		if (!tourData.description.trim()) errors.description = 'Mô tả không được để trống';
		if (!tourData.startDate) errors.startDate = 'Chọn ngày bắt đầu';
		if (!tourData.endDate) errors.endDate = 'Chọn ngày kết thúc';
		if (tourData.startDate && tourData.endDate && tourData.endDate < tourData.startDate) {
			errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
		}
		const maxQuantityNumber = Number(tourData.maxQuantity);
		if (!maxQuantityNumber || maxQuantityNumber <= 0) {
			errors.maxQuantity = 'Số lượng tối đa phải lớn hơn 0';
		}
		if (!tourData.typeOfTourIds.length) {
			errors.typeOfTourIds = 'Chọn ít nhất một loại tour';
		}
		const validPrices = tourData.tourPrices.filter((price) => price.name.trim() && Number(price.price) > 0);
		if (!validPrices.length) {
			errors.tourPrices = 'Thêm ít nhất một gói giá với giá hợp lệ';
		}

		if (!mainImage) {
			errors.mainImage = 'Chọn ảnh đại diện cho tour';
		}

		return errors;
	}, [tourData, mainImage]);

	const isFormValid = useMemo(() => Object.keys(formErrors).length === 0, [formErrors]);

	const handleInputChange = (event) => {
		const { name, value } = event.target;
		setTourData((prev) => ({ ...prev, [name]: value }));
	};

	const handleTypeToggle = (typeId) => {
		setTourData((prev) => {
			const exists = prev.typeOfTourIds.includes(typeId);
			return {
				...prev,
				typeOfTourIds: exists
					? prev.typeOfTourIds.filter((id) => id !== typeId)
					: [...prev.typeOfTourIds, typeId],
			};
		});
	};

	const handlePriceChange = (index, field, value) => {
		setTourData((prev) => {
			const nextPrices = prev.tourPrices.map((price, idx) =>
				idx === index ? { ...price, [field]: value } : price
			);
			return { ...prev, tourPrices: nextPrices };
		});
	};

	const handleAddPrice = () => {
		setTourData((prev) => ({ ...prev, tourPrices: [...prev.tourPrices, defaultPriceRow()] }));
	};

	const handleRemovePrice = (index) => {
		setTourData((prev) => ({
			...prev,
			tourPrices: prev.tourPrices.filter((_, idx) => idx !== index),
		}));
	};

	const handleItineraryChange = (index, field, value) => {
		setTourData((prev) => {
			const nextItineraries = prev.itineraries.map((item, idx) =>
				idx === index ? { ...item, [field]: value } : item
			);
			return { ...prev, itineraries: nextItineraries };
		});
	};

	const handleAddItinerary = () => {
		setTourData((prev) => ({
			...prev,
			itineraries: [...prev.itineraries, defaultItineraryRow()],
		}));
	};

	const handleRemoveItinerary = (index) => {
		setTourData((prev) => ({
			...prev,
			itineraries: prev.itineraries.filter((_, idx) => idx !== index),
		}));
	};

	const handleMainImageChange = (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setMainImage(file);

			if (mainPreviewUrlRef.current) {
				URL.revokeObjectURL(mainPreviewUrlRef.current);
				mainPreviewUrlRef.current = null;
			}

			const previewUrl = URL.createObjectURL(file);
			mainPreviewUrlRef.current = previewUrl;
			setMainImagePreview(previewUrl);
	};

	const handleAdditionalImagesChange = (event) => {
		const files = Array.from(event.target.files || []);
		if (!files.length) return;

		setAdditionalImages((prev) => [...prev, ...files]);

		const newPreviews = files.map((file) => {
			const url = URL.createObjectURL(file);
			previewUrlsRef.current.push(url);
			return { name: file.name, url };
		});

		setImagePreviews((prev) => [...prev, ...newPreviews]);
	};

	const handleRemoveAdditionalImage = (index) => {
		setAdditionalImages((prev) => prev.filter((_, idx) => idx !== index));
		const [removed] = imagePreviews.slice(index, index + 1);
		if (removed) {
			URL.revokeObjectURL(removed.url);
			previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== removed.url);
		}
		setImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
	};

		const buildPayload = () => {
			const { services, tourPrices, itineraries, maxQuantity, startDate, endDate, ...rest } = tourData;

			const formatDateTime = (dateValue, timeValue, fallbackTime) => {
				if (!dateValue) return null;
				const targetTime = timeValue || fallbackTime;
				return new Date(`${dateValue}T${targetTime || '08:00'}`).toISOString();
			};

			const formattedItineraries = itineraries
				.filter((item) => item.title.trim())
				.map((item) => {
					const dateTimeIso = item.date
						? formatDateTime(item.date, item.time, '09:00')
						: null;
					const itineraryText = [item.title.trim(), item.description.trim()] 
						.filter(Boolean)
						.join(' - ');
					return {
						itinerary: itineraryText || item.title.trim(),
						date_time: dateTimeIso,
					};
				});

			const itineraryStrings = formattedItineraries.map((item) => item.itinerary);

			return {
				...rest,
				startDate: formatDateTime(startDate, '08:00', '08:00'),
				endDate: formatDateTime(endDate, '18:00', '18:00'),
				maxQuantity: Number(maxQuantity),
				services: [],
				tourPrices: tourPrices
					.filter((price) => price.name.trim() && Number(price.price) > 0)
					.map((price) => ({
						name: price.name.trim(),
						price: Number(price.price),
						description: (price.description || '').trim(),
					})),
				itineraries: formattedItineraries,
				itineraryStrings,
				approvalStatus: 'PENDING',
			};
		};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError(null);
		setSuccessMessage(null);

		if (!isFormValid) {
			const firstErrorTab = TABS.find((tab) => {
				if (tab === 'basic') return formErrors.name || formErrors.description || formErrors.startDate || formErrors.endDate || formErrors.maxQuantity || formErrors.typeOfTourIds;
				if (tab === 'pricing') return formErrors.tourPrices;
				if (tab === 'images') return formErrors.mainImage;
				return false;
			});
			if (firstErrorTab) {
				setActiveTab(firstErrorTab);
			}
			return;
		}

		try {
			setSaving(true);
			const payload = buildPayload();
			const createdTour = await tourService.createTour(payload);

			if (createdTour?.id && mainImage) {
				await tourService.uploadMainImage(createdTour.id, mainImage);
			}

			if (createdTour?.id && additionalImages.length) {
				await tourService.uploadAdditionalImages(createdTour.id, additionalImages);
			}

			setSuccessMessage('Tạo tour thành công! Bạn sẽ được chuyển đến trang quản lý.');
			setTimeout(() => navigate('/host/dashboard'), 1500);
		} catch (err) {
			console.error('Không thể tạo tour:', err);
			const message =
				err?.response?.data?.message ||
				err?.message ||
				'Đã xảy ra lỗi khi tạo tour. Vui lòng thử lại sau.';
			setError(message);
		} finally {
			setSaving(false);
		}
	};

	const renderTabNav = () => (
		<ul className="nav nav-tabs mb-3">
			{TABS.map((tab) => (
				<li className="nav-item" key={tab}>
					<button
						type="button"
						className={`nav-link ${activeTab === tab ? 'active' : ''}`}
						onClick={() => setActiveTab(tab)}
					>
						{tab === 'basic' && 'Thông tin cơ bản'}
						{tab === 'pricing' && 'Gói giá'}
						{tab === 'services' && 'Dịch vụ'}
						{tab === 'itinerary' && 'Lịch trình'}
						{tab === 'images' && 'Hình ảnh'}
					</button>
				</li>
			))}
		</ul>
	);

	const renderBasicTab = () => (
		<div className="row g-3">
			<div className="col-12">
				<label className="form-label">Tên tour *</label>
				<input
					type="text"
					className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
					name="name"
					value={tourData.name}
					onChange={handleInputChange}
					placeholder="Nhập tên tour"
				/>
				{formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
			</div>

			<div className="col-12">
				<label className="form-label">Mô tả *</label>
				<textarea
					className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
					name="description"
					rows="5"
					value={tourData.description}
					onChange={handleInputChange}
					placeholder="Mô tả chi tiết tour"
				/>
				{formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
			</div>

			<div className="col-md-6">
				<label className="form-label">Ngày bắt đầu *</label>
				<input
					type="date"
					className={`form-control ${formErrors.startDate ? 'is-invalid' : ''}`}
					name="startDate"
					value={tourData.startDate}
					onChange={handleInputChange}
				/>
				{formErrors.startDate && <div className="invalid-feedback">{formErrors.startDate}</div>}
			</div>

			<div className="col-md-6">
				<label className="form-label">Ngày kết thúc *</label>
				<input
					type="date"
					className={`form-control ${formErrors.endDate ? 'is-invalid' : ''}`}
					name="endDate"
					value={tourData.endDate}
					onChange={handleInputChange}
				/>
				{formErrors.endDate && <div className="invalid-feedback">{formErrors.endDate}</div>}
			</div>

			<div className="col-md-6">
				<label className="form-label">Số lượng tối đa *</label>
				<input
					type="number"
					className={`form-control ${formErrors.maxQuantity ? 'is-invalid' : ''}`}
					name="maxQuantity"
					min="1"
					value={tourData.maxQuantity}
					onChange={handleInputChange}
				/>
				{formErrors.maxQuantity && <div className="invalid-feedback">{formErrors.maxQuantity}</div>}
			</div>

			<div className="col-12">
				<label className="form-label">Loại tour *</label>
				{loadingTypes ? (
					<div className="text-muted">Đang tải loại tour...</div>
				) : (
					<div className={`d-flex flex-wrap gap-2 ${formErrors.typeOfTourIds ? 'is-invalid-group' : ''}`}>
						{tourTypes.map((type) => {
							const checked = tourData.typeOfTourIds.includes(type.id);
							return (
								<button
									key={type.id}
									type="button"
									className={`btn btn-sm ${checked ? 'btn-primary' : 'btn-outline-secondary'}`}
									onClick={() => handleTypeToggle(type.id)}
								>
									{type.name}
								</button>
							);
						})}
					</div>
				)}
				{formErrors.typeOfTourIds && <div className="text-danger small mt-1">{formErrors.typeOfTourIds}</div>}
			</div>
		</div>
	);

	const renderPricingTab = () => (
		<div className="d-flex flex-column gap-3">
			{tourData.tourPrices.map((price, index) => (
				<div key={index} className="border rounded p-3">
					<div className="d-flex justify-content-between align-items-center mb-3">
						<h6 className="mb-0">Gói giá #{index + 1}</h6>
						{tourData.tourPrices.length > 1 && (
							<button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemovePrice(index)}>
								Xóa
							</button>
						)}
					</div>

					<div className="row g-3">
						<div className="col-md-4">
							<label className="form-label">Tên gói</label>
							<input
								type="text"
								className="form-control"
								value={price.name}
								onChange={(event) => handlePriceChange(index, 'name', event.target.value)}
								placeholder="VD: Gói tiêu chuẩn"
							/>
						</div>
						<div className="col-md-4">
							<label className="form-label">Giá (VNĐ)</label>
							<input
								type="number"
								min="0"
								className="form-control"
								value={price.price}
								onChange={(event) => handlePriceChange(index, 'price', event.target.value)}
								placeholder="Nhập giá"
							/>
						</div>
						<div className="col-md-4">
							<label className="form-label">Mô tả</label>
							<input
								type="text"
								className="form-control"
								value={price.description}
								onChange={(event) => handlePriceChange(index, 'description', event.target.value)}
								placeholder="Thông tin thêm"
							/>
						</div>
					</div>
				</div>
			))}

			<div>
				<button type="button" className="btn btn-outline-primary" onClick={handleAddPrice}>
					+ Thêm gói giá
				</button>
				{formErrors.tourPrices && <div className="text-danger small mt-2">{formErrors.tourPrices}</div>}
			</div>
		</div>
	);

	const renderServicesTab = () => (
		<div className="mb-3">
			<label className="form-label">Dịch vụ đi kèm</label>
			<textarea
				className="form-control"
				rows="6"
				name="services"
				value={tourData.services}
				onChange={handleInputChange}
				placeholder={['Nhập mỗi dịch vụ trên một dòng.', 'VD:', 'Xe đưa đón sân bay', 'Ăn sáng buffet', 'Hướng dẫn viên'].join('\n')}
			/>
			<div className="form-text">Mỗi dòng tương ứng với một dịch vụ.</div>
		</div>
	);

	const renderItineraryTab = () => (
		<div className="d-flex flex-column gap-3">
			{tourData.itineraries.map((item, index) => (
				<div key={index} className="border rounded p-3">
					<div className="d-flex justify-content-between align-items-center mb-3">
						<h6 className="mb-0">Chặng #{index + 1}</h6>
						{tourData.itineraries.length > 1 && (
							<button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveItinerary(index)}>
								Xóa
							</button>
						)}
					</div>

					<div className="row g-3">
						<div className="col-md-4">
							<label className="form-label">Ngày</label>
							<input
								type="date"
								className="form-control"
								value={item.date}
								onChange={(event) => handleItineraryChange(index, 'date', event.target.value)}
							/>
						</div>
						<div className="col-md-4">
							<label className="form-label">Giờ</label>
							<input
								type="time"
								className="form-control"
								value={item.time}
								onChange={(event) => handleItineraryChange(index, 'time', event.target.value)}
							/>
						</div>
						<div className="col-md-4">
							<label className="form-label">Tiêu đề</label>
							<input
								type="text"
								className="form-control"
								value={item.title}
								onChange={(event) => handleItineraryChange(index, 'title', event.target.value)}
								placeholder="Hoạt động"
							/>
						</div>
						<div className="col-12">
							<label className="form-label">Mô tả</label>
							<textarea
								className="form-control"
								rows="3"
								value={item.description}
								onChange={(event) => handleItineraryChange(index, 'description', event.target.value)}
								placeholder="Mô tả chi tiết cho chặng này"
							/>
						</div>
					</div>
				</div>
			))}

			<button type="button" className="btn btn-outline-primary" onClick={handleAddItinerary}>
				+ Thêm chặng
			</button>
		</div>
	);

	const renderImagesTab = () => (
		<div className="row g-3">
			<div className="col-md-6">
				<label className="form-label">Ảnh đại diện *</label>
				<input
					type="file"
					className={`form-control ${formErrors.mainImage ? 'is-invalid' : ''}`}
					accept="image/*"
					onChange={handleMainImageChange}
				/>
				<div className="form-text">Chọn ảnh chính đại diện cho tour.</div>
				{mainImage && (
					<div className="mt-3">
						<p className="mb-2">Ảnh đã chọn:</p>
						<div className="ratio ratio-16x9 border rounded overflow-hidden">
									<img src={mainImagePreview} alt="Ảnh đại diện" style={{ objectFit: 'cover' }} />
						</div>
					</div>
				)}
				{formErrors.mainImage && <div className="invalid-feedback d-block">{formErrors.mainImage}</div>}
			</div>

			<div className="col-md-6">
				<label className="form-label">Ảnh bổ sung</label>
				<input
					type="file"
					className="form-control"
					accept="image/*"
					multiple
					onChange={handleAdditionalImagesChange}
				/>
				<div className="form-text">Có thể chọn nhiều ảnh cùng lúc.</div>

				{imagePreviews.length > 0 && (
					<div className="row g-2 mt-3">
						{imagePreviews.map((preview, index) => (
							<div key={preview.url} className="col-6">
								<div className="position-relative border rounded overflow-hidden">
									<img src={preview.url} alt={preview.name} className="w-100" style={{ height: '120px', objectFit: 'cover' }} />
									<button
										type="button"
										className="btn btn-sm btn-danger position-absolute top-0 end-0"
										onClick={() => handleRemoveAdditionalImage(index)}
										aria-label="Xóa ảnh"
									>
										×
									</button>
								</div>
								<div className="small mt-1 text-truncate" title={preview.name}>
									{preview.name}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);

	return (
		<div className="host-add-tour-page">
			<div className="page-header mb-4">
				<h2>Tạo tour mới</h2>
				<p className="text-muted mb-0">Điền thông tin chi tiết để bắt đầu kinh doanh tour của bạn.</p>
			</div>

			<form onSubmit={handleSubmit} className="card">
				<div className="card-body">
					{error && (
						<div className="alert alert-danger" role="alert">
							{error}
						</div>
					)}

					{successMessage && (
						<div className="alert alert-success" role="alert">
							{successMessage}
						</div>
					)}

					{renderTabNav()}

					<div className="mt-3">
						{activeTab === 'basic' && renderBasicTab()}
						{activeTab === 'pricing' && renderPricingTab()}
						{activeTab === 'services' && renderServicesTab()}
						{activeTab === 'itinerary' && renderItineraryTab()}
						{activeTab === 'images' && renderImagesTab()}
					</div>
				</div>

				<div className="card-footer d-flex justify-content-between align-items-center">
					<button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/host/dashboard')} disabled={saving}>
						Hủy
					</button>
					<button type="submit" className="btn btn-primary" disabled={saving}>
						{saving ? 'Đang lưu...' : 'Tạo tour'}
					</button>
				</div>
			</form>
		</div>
	);
};

export default HostAddTourPage;
