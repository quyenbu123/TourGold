import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import tourService from '../../services/tourService';

const TABS = ['basic', 'pricing', 'services', 'itinerary', 'images'];

const emptyPrice = () => ({ id: null, name: '', price: '', description: '' });
const emptyItinerary = () => ({ id: null, title: '', description: '', date: '', time: '' });

const HostEditTourPage = () => {
	const { tourId } = useParams();
	const navigate = useNavigate();

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null);
	const [tourTypes, setTourTypes] = useState([]);
	const [activeTab, setActiveTab] = useState(TABS[0]);
	const [existingImages, setExistingImages] = useState([]);
	const [existingMainImageUrl, setExistingMainImageUrl] = useState(null);

	const [tourData, setTourData] = useState({
		name: '',
		description: '',
		startDate: '',
		endDate: '',
		maxQuantity: '',
		typeOfTourIds: [],
		services: '',
		tourPrices: [emptyPrice()],
		itineraries: [emptyItinerary()],
	});

	const [mainImageFile, setMainImageFile] = useState(null);
	const [mainImagePreview, setMainImagePreview] = useState(null);
	const [additionalImages, setAdditionalImages] = useState([]);
	const [additionalPreviews, setAdditionalPreviews] = useState([]);

	const mainPreviewUrlRef = useRef(null);
	const additionalPreviewUrlsRef = useRef([]);

	const cleanupObjectUrls = () => {
		if (mainPreviewUrlRef.current) {
			URL.revokeObjectURL(mainPreviewUrlRef.current);
			mainPreviewUrlRef.current = null;
		}
		additionalPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
		additionalPreviewUrlsRef.current = [];
	};

	const findMainImage = (images) => {
		if (!Array.isArray(images) || !images.length) return null;
		const main = images.find((image) => image.isMain || image.main);
		return main ? main.url : null;
	};

	const mapTourToFormState = (tour) => {
		const priceRows = Array.isArray(tour.tourPrices) && tour.tourPrices.length
			? tour.tourPrices.map((price) => ({
				id: price.id || null,
				name: price.name || '',
				price: price.price || '',
				description: price.description || '',
			}))
			: [emptyPrice()];

		const itineraryRows = Array.isArray(tour.itineraries) && tour.itineraries.length
			? tour.itineraries
					.slice()
					.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
					.map((item) => {
						const dateTime = item.date_time || item.dateTime;
						const dateObj = dateTime ? new Date(dateTime) : null;
						return {
							id: item.id || null,
							title: item.title || item.itinerary || '',
							description: item.description || '',
							date: dateObj ? dateObj.toISOString().slice(0, 10) : '',
							time: dateObj ? dateObj.toISOString().slice(11, 16) : '',
						};
					})
			: [emptyItinerary()];

		const servicesText = Array.isArray(tour.services)
			? tour.services
				.map((service) => service.name || service.description || '')
				.filter(Boolean)
				.join('\n')
			: '';

		return {
			name: tour.name || '',
			description: tour.description || '',
			startDate: tour.startDate ? tour.startDate.slice(0, 10) : '',
			endDate: tour.endDate ? tour.endDate.slice(0, 10) : '',
			maxQuantity: tour.maxQuantity || '',
			typeOfTourIds: Array.isArray(tour.typeOfTourEntities)
				? tour.typeOfTourEntities.map((type) => type.id)
				: [],
			services: servicesText,
			tourPrices: priceRows,
			itineraries: itineraryRows,
		};
	};

	useEffect(() => {
		const loadPageData = async () => {
			try {
				setLoading(true);
				const [types, tour, images] = await Promise.all([
					tourService.getTourTypes(),
					tourService.getTourById(tourId),
					tourService.getTourImages(tourId),
				]);

				setTourTypes(Array.isArray(types) ? types : []);

				if (tour && Object.keys(tour).length > 0) {
					setTourData(mapTourToFormState(tour));
				}

				const normalizedImages = Array.isArray(images) ? images : [];
				setExistingImages(normalizedImages);

				const mainImageUrl = tour?.mainImageUrl || tour?.imageUrl || findMainImage(normalizedImages);
				setExistingMainImageUrl(mainImageUrl || null);
			} catch (err) {
				console.error('Không thể tải dữ liệu tour:', err);
				setError('Không thể tải dữ liệu tour. Vui lòng thử lại sau.');
			} finally {
				setLoading(false);
			}
		};

		loadPageData();

		return () => {
			cleanupObjectUrls();
		};
	}, [tourId]);

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
			const next = prev.tourPrices.map((price, idx) => (idx === index ? { ...price, [field]: value } : price));
			return { ...prev, tourPrices: next };
		});
	};

	const handleAddPrice = () => {
		setTourData((prev) => ({ ...prev, tourPrices: [...prev.tourPrices, emptyPrice()] }));
	};

	const handleRemovePrice = (index) => {
		setTourData((prev) => {
			const next = prev.tourPrices.filter((_, idx) => idx !== index);
			return { ...prev, tourPrices: next.length ? next : [emptyPrice()] };
		});
	};

	const handleItineraryChange = (index, field, value) => {
		setTourData((prev) => {
			const next = prev.itineraries.map((item, idx) => (idx === index ? { ...item, [field]: value } : item));
			return { ...prev, itineraries: next };
		});
	};

	const handleAddItinerary = () => {
		setTourData((prev) => ({ ...prev, itineraries: [...prev.itineraries, emptyItinerary()] }));
	};

	const handleRemoveItinerary = (index) => {
		setTourData((prev) => {
			const next = prev.itineraries.filter((_, idx) => idx !== index);
			return { ...prev, itineraries: next.length ? next : [emptyItinerary()] };
		});
	};

	const handleMainImageChange = (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (mainPreviewUrlRef.current) {
			URL.revokeObjectURL(mainPreviewUrlRef.current);
			mainPreviewUrlRef.current = null;
		}

		const previewUrl = URL.createObjectURL(file);
		mainPreviewUrlRef.current = previewUrl;
		setMainImagePreview(previewUrl);
		setMainImageFile(file);
		setExistingMainImageUrl(null);
	};

	const handleAdditionalImagesChange = (event) => {
		const files = Array.from(event.target.files || []);
		if (!files.length) return;

		setAdditionalImages((prev) => [...prev, ...files]);

		const previews = files.map((file) => {
			const url = URL.createObjectURL(file);
			additionalPreviewUrlsRef.current.push(url);
			return { name: file.name, url };
		});

		setAdditionalPreviews((prev) => [...prev, ...previews]);
	};

	const handleRemoveAdditionalPreview = (index) => {
		setAdditionalPreviews((prev) => {
			const target = prev[index];
			if (target) {
				URL.revokeObjectURL(target.url);
				additionalPreviewUrlsRef.current = additionalPreviewUrlsRef.current.filter((url) => url !== target.url);
			}
			return prev.filter((_, idx) => idx !== index);
		});

		setAdditionalImages((prev) => prev.filter((_, idx) => idx !== index));
	};

	const handleDeleteExistingImage = async (imageId) => {
		if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này?')) {
			return;
		}

		try {
			await tourService.deleteImage(imageId);
			setExistingImages((prev) => prev.filter((image) => image.id !== imageId));
		} catch (err) {
			console.error('Không thể xóa ảnh:', err);
			const message =
				err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi khi xóa ảnh. Vui lòng thử lại sau.';
			alert(message);
		}
	};

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

		return errors;
	}, [tourData]);

	const isFormValid = useMemo(() => Object.keys(formErrors).length === 0, [formErrors]);

	const buildPayload = () => {
		const { services, tourPrices, itineraries, maxQuantity, startDate, endDate, ...rest } = tourData;

		const formatDateTime = (dateValue, timeValue, fallbackTime) => {
			if (!dateValue) return null;
			const targetTime = timeValue || fallbackTime || '08:00';
			return new Date(`${dateValue}T${targetTime}`).toISOString();
		};

		const formattedItineraries = itineraries
			.filter((item) => item.title.trim())
			.map((item) => {
				const dateTimeIso = item.date ? formatDateTime(item.date, item.time, '09:00') : null;
				const itineraryText = [item.title.trim(), (item.description || '').trim()]
					.filter(Boolean)
					.join(' - ');
				return {
					id: item.id,
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
					id: price.id,
					name: price.name.trim(),
					price: Number(price.price),
					description: (price.description || '').trim(),
				})),
			itineraries: formattedItineraries,
			itineraryStrings,
		};
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError(null);
		setSuccessMessage(null);

		if (!isFormValid) {
			const firstErrorTab = TABS.find((tab) => {
				if (tab === 'basic') {
					return (
						formErrors.name ||
						formErrors.description ||
						formErrors.startDate ||
						formErrors.endDate ||
						formErrors.maxQuantity ||
						formErrors.typeOfTourIds
					);
				}
				if (tab === 'pricing') return formErrors.tourPrices;
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
			await tourService.updateTour(tourId, payload);

			if (mainImageFile) {
				await tourService.uploadMainImage(tourId, mainImageFile);
			}

			if (additionalImages.length) {
				await tourService.uploadAdditionalImages(tourId, additionalImages);
			}

			setSuccessMessage('Cập nhật tour thành công!');
			setTimeout(() => navigate('/host/dashboard'), 1500);
		} catch (err) {
			console.error('Không thể cập nhật tour:', err);
			const message =
				err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi khi cập nhật tour. Vui lòng thử lại sau.';
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
							/>
						</div>
						<div className="col-md-4">
							<label className="form-label">Mô tả</label>
							<input
								type="text"
								className="form-control"
								value={price.description}
								onChange={(event) => handlePriceChange(index, 'description', event.target.value)}
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
							/>
						</div>
						<div className="col-12">
							<label className="form-label">Mô tả</label>
							<textarea
								className="form-control"
								rows="3"
								value={item.description}
								onChange={(event) => handleItineraryChange(index, 'description', event.target.value)}
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
				<h6>Ảnh đại diện hiện tại</h6>
				{existingMainImageUrl ? (
					<div className="ratio ratio-16x9 border rounded overflow-hidden">
						<img src={existingMainImageUrl} alt="Ảnh đại diện hiện tại" style={{ objectFit: 'cover' }} />
					</div>
				) : (
					<p className="text-muted mb-0">Chưa có ảnh đại diện.</p>
				)}

				<label className="form-label mt-3">Thay ảnh đại diện</label>
				<input type="file" className="form-control" accept="image/*" onChange={handleMainImageChange} />

				{mainImagePreview && (
					<div className="mt-3">
						<p className="mb-2">Ảnh mới:</p>
						<div className="ratio ratio-16x9 border rounded overflow-hidden">
							<img src={mainImagePreview} alt="Ảnh đại diện mới" style={{ objectFit: 'cover' }} />
						</div>
					</div>
				)}
			</div>

			<div className="col-md-6">
				<h6>Ảnh bổ sung</h6>
				{existingImages.length === 0 && <p className="text-muted mb-0">Chưa có ảnh bổ sung.</p>}
				{existingImages.length > 0 && (
					<div className="row g-2">
						{existingImages.map((image) => (
							<div key={image.id || image.url} className="col-6">
								<div className="position-relative border rounded overflow-hidden">
									<img src={image.url} alt={image.description || image.id} className="w-100" style={{ height: '120px', objectFit: 'cover' }} />
									<button
										type="button"
										className="btn btn-sm btn-danger position-absolute top-0 end-0"
										onClick={() => handleDeleteExistingImage(image.id)}
										aria-label="Xóa ảnh"
									>
										×
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				<label className="form-label mt-3">Thêm ảnh bổ sung</label>
				<input type="file" className="form-control" accept="image/*" multiple onChange={handleAdditionalImagesChange} />

				{additionalPreviews.length > 0 && (
					<div className="row g-2 mt-3">
						{additionalPreviews.map((preview, index) => (
							<div key={preview.url} className="col-6">
								<div className="position-relative border rounded overflow-hidden">
									<img src={preview.url} alt={preview.name} className="w-100" style={{ height: '120px', objectFit: 'cover' }} />
									<button
										type="button"
										className="btn btn-sm btn-danger position-absolute top-0 end-0"
										onClick={() => handleRemoveAdditionalPreview(index)}
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

	if (loading) {
		return (
			<div className="host-edit-tour-page">
				<div className="text-center py-5">Đang tải dữ liệu tour...</div>
			</div>
		);
	}

	return (
		<div className="host-edit-tour-page">
			<div className="page-header mb-4">
				<h2>Chỉnh sửa tour</h2>
				<p className="text-muted mb-0">Cập nhật thông tin tour và quản lý nội dung hiển thị.</p>
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
						{saving ? 'Đang lưu...' : 'Lưu thay đổi'}
					</button>
				</div>
			</form>
		</div>
	);
};

export default HostEditTourPage;
