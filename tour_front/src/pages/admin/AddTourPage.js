import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tourService from '../../services/tourService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/**
 * AddTourPage Component
 * Allows administrators to create a new tour
 */
const AddTourPage = () => {
  const navigate = useNavigate();
  
  // Tour form state
  const [tourData, setTourData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    maxQuantity: '',
    typeOfTourEntities: [],
    tourServices: [],
    tourPrices: [{ name: 'Standard Package', price: '', description: '' }],
    images: [],
    startTime: '',
    endTime: '',
    itineraries: [],
    itineraryStrings: []
  });
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tourTypes, setTourTypes] = useState([]);
  const [newTourType, setNewTourType] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [formErrors, setFormErrors] = useState({});
  
  // Add new state for new itinerary items
  const [newItinerary, setNewItinerary] = useState({
    itinerary: '',
    date_time: '',
    time: '09:00'
  });
  
  // Fetch tour types
  useEffect(() => {
    const fetchTourTypes = async () => {
      try {        // This would normally be an API call to get tour types
        // For demo purposes, we'll use a static list
        setTourTypes([
          { id: 1, name: 'Biển' },
          { id: 2, name: 'Núi' },
          { id: 3, name: 'Thành phố' },
          { id: 4, name: 'Phiêu lưu' },
          { id: 5, name: 'Văn hóa' },
          { id: 6, name: 'Lịch sử' },
          { id: 7, name: 'Du lịch sinh thái' },
          { id: 8, name: 'Ẩm thực' },
          { id: 9, name: 'Mua sắm' },
          { id: 10, name: 'Nghỉ dưỡng' }
        ]);
      } catch (err) {
        console.error('Error fetching tour types:', err);
      }
    };
    
    fetchTourTypes();
  }, []);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTourData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle tour type selection
  const handleTourTypeChange = (typeId) => {
    const selectedType = tourTypes.find(type => type.id === parseInt(typeId));
    
    if (!selectedType) return;
    
    // Check if type is already selected
    const isSelected = tourData.typeOfTourEntities.some(type => type.id === selectedType.id);
    
    if (isSelected) {
      // Remove the type if already selected
      setTourData(prev => ({
        ...prev,
        typeOfTourEntities: prev.typeOfTourEntities.filter(type => type.id !== selectedType.id)
      }));
    } else {
      // Add the type if not already selected
      setTourData(prev => ({
        ...prev,
        typeOfTourEntities: [...prev.typeOfTourEntities, selectedType]
      }));
    }
  };
  
  // Add a new tour type
  const handleAddTourType = () => {
    if (!newTourType.trim()) return;
    
    // Check if type already exists
    const typeExists = tourTypes.some(type => 
      type.name.toLowerCase() === newTourType.trim().toLowerCase()
    );
    
    if (!typeExists) {
      // Generate a temporary ID (in a real app, this would come from the API)
      const newId = Math.max(0, ...tourTypes.map(type => type.id)) + 1;
      const newType = { id: newId, name: newTourType.trim() };
      
      // Add to available types
      setTourTypes(prev => [...prev, newType]);
      
      // Add to selected types
      setTourData(prev => ({
        ...prev,
        typeOfTourEntities: [...prev.typeOfTourEntities, newType]
      }));
      
      setNewTourType('');
    } else {
      // Select the existing type if not already selected
      const existingType = tourTypes.find(type => 
        type.name.toLowerCase() === newTourType.trim().toLowerCase()
      );
      
      if (!tourData.typeOfTourEntities.some(type => type.id === existingType.id)) {
        setTourData(prev => ({
          ...prev,
          typeOfTourEntities: [...prev.typeOfTourEntities, existingType]
        }));
      }
      
      setNewTourType('');
    }
  };
  
  // Handle tour price changes
  const handlePriceChange = (index, field, value) => {
    const updatedPrices = [...tourData.tourPrices];
    updatedPrices[index] = {
      ...updatedPrices[index],
      [field]: field === 'price' ? (value === '' ? '' : parseFloat(value)) : value
    };
    
    setTourData(prev => ({
      ...prev,
      tourPrices: updatedPrices
    }));
  };
  
  // Add a new price package
  const handleAddPricePackage = () => {
    setTourData(prev => ({
      ...prev,
      tourPrices: [
        ...prev.tourPrices, 
        { name: `Gói ${prev.tourPrices.length + 1}`, price: '', description: '' }
      ]
    }));
  };
  
  // Remove a price package
  const handleRemovePricePackage = (index) => {
    if (tourData.tourPrices.length <= 1) return;
    
    const updatedPrices = [...tourData.tourPrices];
    updatedPrices.splice(index, 1);
    
    setTourData(prev => ({
      ...prev,
      tourPrices: updatedPrices
    }));
  };
  
  // Handle service changes
  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...tourData.tourServices];
    
    if (!updatedServices[index]) {
      updatedServices[index] = { name: '', description: '', price: '' };
    }
    
    updatedServices[index] = {
      ...updatedServices[index],
      [field]: field === 'price' ? (value === '' ? '' : parseFloat(value)) : value
    };
    
    setTourData(prev => ({
      ...prev,
      tourServices: updatedServices
    }));
  };
  
  // Add a new service
  const handleAddService = () => {
    setTourData(prev => ({
      ...prev,
      tourServices: [
        ...prev.tourServices,
        { name: '', description: '', price: '' }
      ]
    }));
  };
  
  // Remove a service
  const handleRemoveService = (index) => {
    const updatedServices = [...tourData.tourServices];
    updatedServices.splice(index, 1);
    
    setTourData(prev => ({
      ...prev,
      tourServices: updatedServices
    }));
  };
  
  // Handle image uploads
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Preview images
    const newPreviewImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setImageFiles(prev => [...prev, ...files]);
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
  };
  
  // Remove an image
  const handleRemoveImage = (index) => {
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(previewImages[index].preview);
    
    setImageFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    
    setPreviewImages(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };    // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!tourData.name.trim()) errors.name = 'Vui lòng nhập tên tour';
    if (!tourData.description.trim()) errors.description = 'Vui lòng nhập mô tả tour';
    if (!tourData.startDate) errors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!tourData.endDate) errors.endDate = 'Vui lòng chọn ngày kết thúc';
    if (tourData.startDate && tourData.endDate && new Date(tourData.startDate) > new Date(tourData.endDate)) {
      errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
    if (!tourData.maxQuantity) errors.maxQuantity = 'Vui lòng nhập số lượng khách tối đa';
    if (tourData.typeOfTourEntities.length === 0) errors.typeOfTourEntities = 'Vui lòng chọn ít nhất một loại tour';
    
    // Validation for price packages
    const priceErrors = [];
    tourData.tourPrices.forEach((price, index) => {
      const packageErrors = {};
      if (!price.name.trim()) packageErrors.name = 'Vui lòng nhập tên gói';
      if (!price.price) packageErrors.price = 'Vui lòng nhập giá';
      if (Object.keys(packageErrors).length > 0) {
        priceErrors[index] = packageErrors;
      }
    });
    if (priceErrors.length > 0) errors.tourPrices = priceErrors;
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.is-invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Format data for API
      const formattedData = {
        name: tourData.name,
        description: tourData.description,
        maxQuantity: parseInt(tourData.maxQuantity),
        // Use typeOfTourIds instead of typeOfTourEntities
        typeOfTourIds: tourData.typeOfTourEntities.map(type => type.id),
        // Properly format tourPrices
        tourPrices: tourData.tourPrices.map(price => ({
          name: price.name,
          price: parseFloat(price.price),
          description: price.description || ''
        })),
        // Include services if they exist
        services: tourData.tourServices ? tourData.tourServices.map(service => ({
          name: service.name,
          description: service.description || '',
          price: parseFloat(service.price) || 0
        })) : [],
        // Prepare itineraries and itineraryStrings
        itineraries: tourData.itineraries || []
      };
      
      // Format dates with time for LocalDateTime in backend
      if (tourData.startDate) {
        const startDate = new Date(tourData.startDate);
        const [startHours, startMinutes] = (tourData.startTime || "00:00").split(":");
        startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0);
        formattedData.startDate = startDate.toISOString();
      }
      
      if (tourData.endDate) {
        const endDate = new Date(tourData.endDate);
        const [endHours, endMinutes] = (tourData.endTime || "23:59").split(":");
        endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0);
        formattedData.endDate = endDate.toISOString();
      }
      
      // Ensure itineraryStrings is set correctly for API
      if (formattedData.itineraries && formattedData.itineraries.length > 0) {
        // The backend expects just the strings for itineraryStrings
        formattedData.itineraryStrings = formattedData.itineraries.map(item => item.itinerary);
      }
      
      console.log('Submitting tour data:', formattedData);
      
      // 1. Đầu tiên, tạo tour
      const createdTour = await tourService.createTour(formattedData);
      console.log('Tour created:', createdTour);
      
      // 2. Sau đó tải lên hình ảnh nếu có
      if (imageFiles.length > 0) {
        try {
          // Tải lên hình ảnh chính (ảnh đầu tiên)
          await tourService.uploadMainImage(createdTour.id, imageFiles[0]);
          console.log('Main image uploaded');
          
          // Tải lên các hình ảnh bổ sung nếu có nhiều hơn 1 ảnh
          if (imageFiles.length > 1) {
            await tourService.uploadAdditionalImages(
              createdTour.id, 
              imageFiles.slice(1)
            );
            console.log('Additional images uploaded');
          }
        } catch (imageError) {
          console.error('Error uploading images:', imageError);          setError('Tour đã được tạo, nhưng có lỗi khi tải lên hình ảnh. Bạn có thể thêm hình ảnh sau.');
        }
      }
      // Show success message and redirect
      alert('Tạo tour thành công!');
      navigate(`/admin/tours`);
    } catch (err) {
      console.error('Error creating tour:', err);
      setError(err.response?.data?.message || 'Không thể tạo tour. Vui lòng thử lại.');
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding new itinerary item
  const handleAddItinerary = () => {
    if (!newItinerary.itinerary || !newItinerary.date_time) return;
    
    try {
      // Create new itinerary item with correct structure
      const dateTime = new Date(newItinerary.date_time);
      const [hours, minutes] = newItinerary.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const newItineraryItem = {
        id: Date.now(), // Temporary ID for UI purposes
        itinerary: newItinerary.itinerary,
        date_time: dateTime.toISOString() // Format expected by backend
      };
      
      setTourData(prev => ({
        ...prev,
        itineraries: [...(prev.itineraries || []), newItineraryItem],
        // Also add to itineraryStrings for backend compatibility
        itineraryStrings: [...(prev.itineraryStrings || []), newItinerary.itinerary]
      }));
      
      // Reset form
      setNewItinerary({
        itinerary: '',
        date_time: '',
        time: '09:00'
      });
    } catch (error) {
      console.error("Error adding itinerary:", error);
      setError("Không thể thêm lịch trình. Vui lòng kiểm tra định dạng ngày giờ.");
    }
  };
  
  // Handle removing an itinerary item
  const handleRemoveItinerary = (index) => {
    setTourData(prev => ({
      ...prev,
      itineraries: prev.itineraries.filter((_, i) => i !== index),
      itineraryStrings: prev.itineraryStrings.filter((_, i) => i !== index)
    }));
  };
  
  // Navigate between tabs
  const nextTab = () => {
    switch (activeTab) {
      case 'basic':
        setActiveTab('pricing');
        break;
      case 'pricing':
        setActiveTab('services');
        break;
      case 'services':
        setActiveTab('itinerary');
        break;
      case 'itinerary':
        setActiveTab('images');
        break;
      default:
        break;
    }
  };
  
  const prevTab = () => {
    switch (activeTab) {
      case 'pricing':
        setActiveTab('basic');
        break;
      case 'services':
        setActiveTab('pricing');
        break;
      case 'itinerary':
        setActiveTab('services');
        break;
      case 'images':
        setActiveTab('itinerary');
        break;
      default:
        break;
    }
  };
  
  return (
    <div className="add-tour-page">      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Thêm Tour Mới</h1>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/admin/tours')}
        >
          <i className="fas fa-arrow-left me-2"></i> Quay lại Danh sách Tour
        </button>
      </div>
      
      {/* Error message display */}
      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}
      
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          {/* Tabs */}          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                <i className="fas fa-info-circle me-2"></i> Thông tin cơ bản
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'pricing' ? 'active' : ''}`}
                onClick={() => setActiveTab('pricing')}
              >
                <i className="fas fa-tag me-2"></i> Giá
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
                onClick={() => setActiveTab('services')}
              >
                <i className="fas fa-concierge-bell me-2"></i> Dịch vụ
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'itinerary' ? 'active' : ''}`}
                onClick={() => setActiveTab('itinerary')}
              >
                <i className="fas fa-map-marked-alt me-2"></i> Lịch trình
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'images' ? 'active' : ''}`}
                onClick={() => setActiveTab('images')}
              >
                <i className="fas fa-images me-2"></i> Hình ảnh
              </button>
            </li>
          </ul>
          
          <form onSubmit={handleSubmit}>
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="tab-pane fade show active">
                <div className="row mb-3">
                  <div className="col-md-6">                    <label htmlFor="name" className="form-label">Tên Tour <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                      id="name"
                      name="name"
                      value={tourData.name}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.name && (
                      <div className="invalid-feedback">{formErrors.name}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="maxQuantity" className="form-label">Số lượng khách tối đa <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className={`form-control ${formErrors.maxQuantity ? 'is-invalid' : ''}`}
                      id="maxQuantity"
                      name="maxQuantity"
                      value={tourData.maxQuantity}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                    {formErrors.maxQuantity && (
                      <div className="invalid-feedback">{formErrors.maxQuantity}</div>
                    )}
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-6">                    <label htmlFor="startDate" className="form-label">Ngày bắt đầu <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className={`form-control ${formErrors.startDate ? 'is-invalid' : ''}`}
                      id="startDate"
                      name="startDate"
                      value={tourData.startDate}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.startDate && (
                      <div className="invalid-feedback">{formErrors.startDate}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="endDate" className="form-label">Ngày kết thúc <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className={`form-control ${formErrors.endDate ? 'is-invalid' : ''}`}
                      id="endDate"
                      name="endDate"
                      value={tourData.endDate}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.endDate && (
                      <div className="invalid-feedback">{formErrors.endDate}</div>
                    )}
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-6">                    <label htmlFor="startTime" className="form-label">Giờ bắt đầu</label>
                    <input
                      type="time"
                      className="form-control"
                      id="startTime"
                      name="startTime"
                      value={tourData.startTime || "00:00"}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="endTime" className="form-label">Giờ kết thúc</label>
                    <input
                      type="time"
                      className="form-control"
                      id="endTime"
                      name="endTime"
                      value={tourData.endTime || "23:59"}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="mb-3">                  <label htmlFor="description" className="form-label">Mô tả chi tiết <span className="text-danger">*</span></label>
                  <textarea
                    className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                    id="description"
                    name="description"
                    value={tourData.description}
                    onChange={handleInputChange}
                    rows="5"
                    required
                  ></textarea>
                  {formErrors.description && (
                    <div className="invalid-feedback">{formErrors.description}</div>
                  )}
                </div>
                
                <div className="mb-3">                  <label className="form-label d-block">Loại Tour <span className="text-danger">*</span></label>
                  <div className={`mb-3 ${formErrors.typeOfTourEntities ? 'is-invalid' : ''}`}>
                    {tourTypes.map(type => (
                      <div className="form-check form-check-inline" key={type.id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`tourType${type.id}`}
                          checked={tourData.typeOfTourEntities.some(t => t.id === type.id)}
                          onChange={() => handleTourTypeChange(type.id)}
                        />
                        <label className="form-check-label" htmlFor={`tourType${type.id}`}>
                          {type.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {formErrors.typeOfTourEntities && (
                    <div className="invalid-feedback d-block">{formErrors.typeOfTourEntities}</div>
                  )}
                  
                  <div className="input-group mt-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Thêm loại tour mới"
                      value={newTourType}
                      onChange={(e) => setNewTourType(e.target.value)}
                    />
                    <button
                      className="btn btn-outline-primary"
                      type="button"
                      onClick={handleAddTourType}
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="tab-pane fade show active">
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">                    <h3 className="h5 mb-0">Gói Tour</h3>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleAddPricePackage}
                    >
                      <i className="fas fa-plus me-2"></i> Thêm gói
                    </button>
                  </div>
                  
                  {tourData.tourPrices.map((price, index) => (
                    <div className="card mb-3" key={index}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h4 className="h6 mb-0">Gói {index + 1}</h4>
                          {tourData.tourPrices.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemovePricePackage(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                        
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label">Tên gói <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className={`form-control ${formErrors.tourPrices?.[index]?.name ? 'is-invalid' : ''}`}
                              value={price.name}
                              onChange={(e) => handlePriceChange(index, 'name', e.target.value)}
                              required
                            />
                            {formErrors.tourPrices?.[index]?.name && (
                              <div className="invalid-feedback">{formErrors.tourPrices[index].name}</div>
                            )}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Giá <span className="text-danger">*</span></label>
                            <div className="input-group">
                              <span className="input-group-text">VNĐ</span>
                              <input
                                type="number"
                                className={`form-control ${formErrors.tourPrices?.[index]?.price ? 'is-invalid' : ''}`}
                                value={price.price}
                                onChange={(e) => handlePriceChange(index, 'price', e.target.value)}
                                min="0"
                                step="1000"
                                required
                              />
                              {formErrors.tourPrices?.[index]?.price && (
                                <div className="invalid-feedback">{formErrors.tourPrices[index].price}</div>
                              )}
                            </div>
                          </div>
                          <div className="col-12">
                            <label className="form-label">Mô tả gói</label>
                            <textarea
                              className="form-control"
                              value={price.description}
                              onChange={(e) => handlePriceChange(index, 'description', e.target.value)}
                              rows="2"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="tab-pane fade show active">
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">                    <h3 className="h5 mb-0">Dịch vụ thêm</h3>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleAddService}
                    >
                      <i className="fas fa-plus me-2"></i> Thêm dịch vụ
                    </button>
                  </div>
                  
                  {tourData.tourServices.length === 0 ? (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      Chưa có dịch vụ nào được thêm vào tour này
                    </div>
                  ) : (
                    tourData.tourServices.map((service, index) => (
                      <div className="card mb-3" key={index}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="h6 mb-0">Dịch vụ {index + 1}</h4>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveService(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                          
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">Tên dịch vụ</label>
                              <input
                                type="text"
                                className="form-control"
                                value={service.name}
                                onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Giá</label>
                              <div className="input-group">
                                <span className="input-group-text">VNĐ</span>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={service.price}
                                  onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                                  min="0"
                                  step="1000"
                                />
                              </div>
                            </div>
                            <div className="col-12">
                              <label className="form-label">Mô tả</label>
                              <textarea
                                className="form-control"
                                value={service.description}
                                onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                                rows="2"
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Itinerary Tab */}
            {activeTab === 'itinerary' && (
              <div className="tab-pane fade show active">
                <div className="card mb-4">
                  <div className="card-header bg-light">                    <h5 className="mb-0">Lịch trình Tour</h5>
                  </div>
                  <div className="card-body">
                    <p className="text-muted mb-3">
                      Thêm các hoạt động và lịch trình cho tour. Mỗi mục tương ứng với một điểm trong lịch trình.
                    </p>
                    
                    {/* Current Itinerary */}
                    {tourData.itineraries && tourData.itineraries.length > 0 ? (
                      <div className="table-responsive mb-4">                        <table className="table table-bordered table-hover">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '10%' }}>STT</th>
                              <th style={{ width: '15%' }}>Ngày</th>
                              <th style={{ width: '15%' }}>Giờ</th>
                              <th style={{ width: '50%' }}>Hoạt động</th>
                              <th style={{ width: '10%' }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tourData.itineraries.map((item, index) => {
                              const dateTime = item.date_time ? new Date(item.date_time) : null;
                              return (
                              <tr key={index}>
                                <td>Ngày {index + 1}</td>
                                <td>
                                  {dateTime ? new Date(dateTime).toLocaleDateString('vi-VN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  }) : 'Chưa chọn ngày'}
                                </td>
                                <td>
                                  {dateTime ? dateTime.toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'Chưa chọn giờ'}
                                </td>
                                <td>{item.itinerary}</td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleRemoveItinerary(index)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="alert alert-info mb-4">
                        <i className="fas fa-info-circle me-2"></i>
                        Chưa có lịch trình nào được thêm vào.
                      </div>
                    )}
                    
                    {/* Add Itinerary Form */}
                    <div className="card bg-light">
                      <div className="card-body">                        <h6 className="card-title">Thêm điểm lịch trình</h6>
                        <div className="row g-3 mb-3">
                          <div className="col-md-3">
                            <label htmlFor="itinerary-date" className="form-label">Ngày</label>
                            <input
                              type="date"
                              className="form-control"
                              id="itinerary-date"
                              value={newItinerary.date_time}
                              onChange={(e) => setNewItinerary(prev => ({
                                ...prev,
                                date_time: e.target.value
                              }))}
                              min={tourData.startDate}
                              max={tourData.endDate}
                            />
                          </div>
                          <div className="col-md-2">
                            <label htmlFor="itinerary-time" className="form-label">Giờ</label>
                            <input
                              type="time"
                              className="form-control"
                              id="itinerary-time"
                              value={newItinerary.time}
                              onChange={(e) => setNewItinerary(prev => ({
                                ...prev,
                                time: e.target.value
                              }))}
                            />
                          </div>
                          <div className="col-md-7">
                            <label htmlFor="itinerary-activity" className="form-label">Mô tả hoạt động</label>
                            <textarea
                              className="form-control"
                              id="itinerary-activity"
                              rows="3"
                              placeholder="Mô tả chi tiết các hoạt động tại điểm này..."
                              value={newItinerary.itinerary}
                              onChange={(e) => setNewItinerary(prev => ({
                                ...prev,
                                itinerary: e.target.value
                              }))}
                            ></textarea>
                          </div>
                        </div>
                        <div className="d-flex justify-content-end">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleAddItinerary}
                            disabled={!newItinerary.itinerary || !newItinerary.date_time}
                          >
                            <i className="fas fa-plus me-2"></i> Thêm vào lịch trình
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="alert alert-warning mt-4">
                      <i className="fas fa-exclamation-triangle me-2"></i>                      <strong>Lưu ý:</strong> Ngày trong lịch trình phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc tour.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="tab-pane fade show active">
                <div className="mb-4">
                  <div className="mb-3">                    <label className="form-label">Hình ảnh Tour</label>
                    <div className="input-group">
                      <input
                        type="file"
                        className="form-control"
                        id="tourImages"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                      />
                      <label className="input-group-text" htmlFor="tourImages">Tải lên</label>
                    </div>
                    <small className="text-muted">
                      Hình ảnh đầu tiên sẽ được sử dụng làm ảnh chính. Bạn có thể tải lên nhiều hình ảnh.
                    </small>
                  </div>
                  
                  {previewImages.length > 0 && (
                    <div className="row g-3 mt-2">
                      {previewImages.map((image, index) => (
                        <div className="col-md-3 col-sm-6" key={index}>
                          <div className="position-relative">
                            <img
                              src={image.preview}
                              alt={`Preview ${index + 1}`}
                              className="img-thumbnail"
                              style={{ aspectRatio: '16/9', objectFit: 'cover', width: '100%' }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                              onClick={() => handleRemoveImage(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                            {index === 0 && (                              <div className="position-absolute bottom-0 start-0 m-2">
                                <span className="badge bg-primary">Ảnh chính</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="d-flex justify-content-between mt-4">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={prevTab}
                >
                  <i className="fas fa-chevron-left me-2"></i>
                  Quay lại
                </button>
              )}
              
              {activeTab !== 'images' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={nextTab}
                >
                  Tiếp tục
                  <i className="fas fa-chevron-right ms-2"></i>
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Đang tạo tour...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Hoàn tất tạo tour
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTourPage;