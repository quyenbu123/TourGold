import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import tourService from "../../services/tourService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ServiceDTO from "../../dto/ServiceDTO";
import TourDTO from "../../dto/TourDTO";

/**
 * UpdateTourPage Component
 * Allows administrators to update an existing tour
 */
const UpdateTourPage = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();

  // Tour form state
  const [tourData, setTourData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "00:00",
    endTime: "23:59",
    maxQuantity: 0,
    approvalStatus: "PENDING",
    typeOfTourEntities: [],
    typeOfTourIds: [],
    tourPrices: [],
    tourServices: [],
    itineraries: [],
    itineraryStrings: [],
    images: [],
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tourTypes, setTourTypes] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: 0,
    available: true,
    typeOfTourId: "",
    typeOfServiceId: "",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [formErrors, setFormErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newPrice, setNewPrice] = useState(null);
  const [newItinerary, setNewItinerary] = useState({
    itinerary: "",
    date_time: "",
    time: "09:00",
  });
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [deletedPriceIds, setDeletedPriceIds] = useState([]);

  // Fetch tour data and necessary data for dropdowns
  useEffect(() => {
    const fetchTourData = async () => {
      try {
        setLoading(true);

        // Luôn fetch tour types và service types trước, ngay cả khi có lỗi
        // chúng ta vẫn có dữ liệu cơ bản để hiển thị form
        let tourTypesData = [];
        let serviceTypesData = [];
        let tourData = null;

        try {
          tourTypesData = await tourService.getTourTypes();
          setTourTypes(tourTypesData);
        } catch (typeError) {
          console.error("Error fetching tour types:", typeError);
          setError(
            (prev) =>
              prev ||
              "Không thể tải loại tour. Một số tính năng có thể bị giới hạn."
          );
        }

        try {
          serviceTypesData = await tourService.getServiceTypes();
          setServiceTypes(serviceTypesData);
        } catch (serviceError) {
          console.error("Error fetching service types:", serviceError);
          setError(
            (prev) =>
              prev ||
              "Không thể tải loại dịch vụ. Một số tính năng có thể bị giới hạn."
          );
        }

        // Fetch tour data - but don't redirect if it fails
        try {
          tourData = await tourService.getAdminTourById(tourId);
          console.log("Tour data from API:", tourData);
        } catch (tourError) {
          console.error("Error fetching tour data:", tourError);

          if (
            tourError.response?.status === 401 ||
            tourError.message?.includes("Unauthorized")
          ) {
            // Đặc biệt xử lý lỗi xác thực - không logout hoặc redirect
            console.warn(
              "Authentication issue - will attempt to continue with limited data"
            );
            setError(
              "Lỗi xác thực. Bạn có thể bị hạn chế quyền truy cập tính năng này. Vui lòng làm mới trang hoặc đăng nhập lại nếu vấn đề vẫn tiếp tục."
            );

            // Thử fetch public tour data
            try {
              console.log("Trying to fetch public tour data instead");
              tourData = await tourService.getTourById(tourId);
            } catch (publicTourError) {
              console.error(
                "Also failed to get public tour data:",
                publicTourError
              );
              setError(
                "Không thể tải dữ liệu tour. Vui lòng thử lại sau."
              );
              setLoading(false);
              return;
            }
          } else {
            setError("Không thể tải dữ liệu tour. Vui lòng thử lại sau.");
            setLoading(false);
            return;
          }
        }

        if (!tourData) {
          setError("Không tìm thấy dữ liệu tour với ID này.");
          setLoading(false);
          return;
        }

        // Extract data from response
        const data = tourData;

        // Format dates for input fields and extract time components
        let startTime = "00:00";
        let endTime = "23:59";

        if (data.startDate) {
          const startDate = new Date(data.startDate);
          const hours = startDate.getHours().toString().padStart(2, "0");
          const minutes = startDate.getMinutes().toString().padStart(2, "0");
          startTime = `${hours}:${minutes}`;
          data.startDate = startDate.toISOString().split("T")[0];
        }

        if (data.endDate) {
          const endDate = new Date(data.endDate);
          const hours = endDate.getHours().toString().padStart(2, "0");
          const minutes = endDate.getMinutes().toString().padStart(2, "0");
          endTime = `${hours}:${minutes}`;
          data.endDate = endDate.toISOString().split("T")[0];
        }

        // Extract typeOfTourIds from typeOfTourEntities
        if (data.typeOfTourEntities && data.typeOfTourEntities.length > 0) {
          data.typeOfTourIds = data.typeOfTourEntities.map((type) => type.id);
        } else if (!Array.isArray(data.typeOfTourIds)) {
          data.typeOfTourIds = [];
        }

        // Ensure services are properly mapped
        // Backend might use either 'services' or 'tourServices'
        if (!data.tourServices || data.tourServices.length === 0) {
          if (data.services && data.services.length > 0) {
            data.tourServices = data.services;
          } else {
            data.tourServices = [];
          }
        }

        // Ensure itineraries are properly set
        if (!data.itineraries) {
          data.itineraries = [];
        }

        // Extract itineraryStrings from itineraries if needed
        if (
          data.itineraries &&
          data.itineraries.length > 0 &&
          (!data.itineraryStrings || data.itineraryStrings.length === 0)
        ) {
          data.itineraryStrings = data.itineraries.map(
            (item) => item.itinerary
          );
        }

        console.log("Processed tour data:", data);

        // Set tour data with all processed values including time fields
        setTourData({
          ...data,
          startTime,
          endTime,
        });

        // Fetch tour images
        try {
          const tourImages = await tourService.getTourImages(tourId);
          if (tourImages && tourImages.length > 0) {
            setPreviewImages(
              tourImages.map((img) => ({
                id: img.id,
                preview: img.url,
                isExisting: true,
              }))
            );
          }
        } catch (imgError) {
          console.error("Error fetching tour images:", imgError);
          // Non-critical error - just log it
        }
      } catch (err) {
        console.error("Error in fetchTourData:", err);
        setError("Không thể tải dữ liệu tour. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchTourData();
  }, [tourId]);

  // Ensure all data structures are properly initialized
  useEffect(() => {
    if (!loading && tourData) {
      const updatedData = { ...tourData };
      let needsUpdate = false;

      // Ensure all required arrays exist
      if (!updatedData.tourServices) {
        updatedData.tourServices = updatedData.services || [];
        needsUpdate = true;
      }

      if (!updatedData.itineraries) {
        updatedData.itineraries = [];
        needsUpdate = true;
      }

      if (!updatedData.itineraryStrings) {
        updatedData.itineraryStrings =
          updatedData.itineraries.map((i) => i.itinerary) || [];
        needsUpdate = true;
      }

      // Ensure typeOfTourIds is an array
      if (!Array.isArray(updatedData.typeOfTourIds)) {
        updatedData.typeOfTourIds = updatedData.typeOfTourEntities
          ? updatedData.typeOfTourEntities.map((type) => type.id)
          : [];
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log("Updating tour data with initialized arrays:", updatedData);
        setTourData(updatedData);
      }
    }
  }, [loading, tourData]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTourData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Handle image file selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Lưu files để sử dụng khi submit form
    setNewImages(files);

    // Create preview URLs for selected files
    const newPreviews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isExisting: false,
    }));

    // Thêm vào các preview hiện tại
    setPreviewImages((prev) => [
      ...prev.filter((p) => p.isExisting), // Giữ lại các ảnh hiện có
      ...newPreviews, // Thêm preview cho ảnh mới
    ]);
  };

  // Handle main image upload
  const handleUploadMainImage = async () => {
    if (!imageFiles[0]) return;

    try {
      setError(null);
      setSaveLoading(true);

      const mainImage = imageFiles[0];
      await tourService.uploadMainImage(tourId, mainImage);

      // Reset file input and uploaded file list
      setImageFiles([]);
      document.getElementById("tour-images").value = "";

      // Remove temporary preview images
      setPreviewImages((prev) => prev.filter((img) => img.isExisting));

      // Refresh tour images from backend
      const updatedImages = await tourService.getTourImages(tourId);
      setPreviewImages(
        updatedImages.map((img) => ({
          id: img.id,
          preview: img.url,
          isExisting: true,
        }))
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error uploading main image:", err);
      setError(
        "Không thể tải ảnh chính lên: " + (err.response?.data || err.message)
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle additional images upload
  const handleUploadAdditionalImages = async () => {
    if (imageFiles.length === 0) return;

    try {
      setError(null);
      setSaveLoading(true);

      await tourService.uploadAdditionalImages(tourId, imageFiles);

      // Reset file input and uploaded file list
      setImageFiles([]);
      document.getElementById("tour-images").value = "";

      // Remove temporary preview images
      setPreviewImages((prev) => prev.filter((img) => img.isExisting));

      // Refresh tour images from backend
      const updatedImages = await tourService.getTourImages(tourId);
      setPreviewImages(
        updatedImages.map((img) => ({
          id: img.id,
          preview: img.url,
          isExisting: true,
        }))
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error uploading additional images:", err);
      setError(
        "Không thể tải ảnh bổ sung lên: " +
          (err.response?.data || err.message)
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (imageId) => {
    try {
      setError(null);
      setSaveLoading(true);

      await tourService.deleteImage(imageId);

      // Remove from UI immediately
      setPreviewImages((prev) => prev.filter((img) => img.id !== imageId));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error deleting image:", err);
      setError(
        "Không thể xóa ảnh: " + (err.response?.data || err.message)
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle adding new itinerary item
  const handleAddItinerary = () => {
    if (!newItinerary.itinerary || !newItinerary.date_time) return;

    console.log("Adding new itinerary:", newItinerary);

    try {
      // Convert date string to LocalDateTime format
      const dateTime = new Date(newItinerary.date_time);
      // Add time component
      const [hours, minutes] = newItinerary.time.split(":");
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0);

      // Create new itinerary item with correct structure
      const newItineraryItem = {
        ...newItinerary,
        id: Date.now(), // Temporary ID for UI purposes
        date_time: dateTime.toISOString(), // Format expected by backend
      };

      console.log("Formatted new itinerary item:", newItineraryItem);

      setTourData((prev) => ({
        ...prev,
        itineraries: [...(prev.itineraries || []), newItineraryItem],
        // Also add to itineraryStrings for backend compatibility
        itineraryStrings: [
          ...(prev.itineraryStrings || []),
          newItinerary.itinerary,
        ],
      }));

      // Reset form
      setNewItinerary({
        itinerary: "",
        date_time: "",
        time: "09:00",
      });
    } catch (error) {
      console.error("Error adding itinerary:", error);
      setError("Không thể thêm lịch trình. Vui lòng kiểm tra định dạng ngày.");
    }
  };

  // Handle removing an itinerary item
  const handleRemoveItinerary = (index) => {
    setTourData((prev) => ({
      ...prev,
      itineraries: prev.itineraries.filter((_, i) => i !== index),
      itineraryStrings: prev.itineraryStrings.filter((_, i) => i !== index),
    }));
  };

  // Handle tour type selection
  const handleTourTypeChange = (typeId) => {
    const selectedType = tourTypes.find((type) => type.id === parseInt(typeId));

    if (!selectedType) return;

    // Check if type is already selected
    const isSelected = tourData.typeOfTourEntities.some(
      (type) => type.id === selectedType.id
    );

    if (isSelected) {
      // Remove the type if already selected
      setTourData((prev) => ({
        ...prev,
        typeOfTourEntities: prev.typeOfTourEntities.filter(
          (type) => type.id !== selectedType.id
        ),
        typeOfTourIds: Array.isArray(prev.typeOfTourIds)
          ? prev.typeOfTourIds.filter((id) => id !== selectedType.id)
          : [],
      }));
    } else {
      // Add the type if not already selected
      setTourData((prev) => ({
        ...prev,
        typeOfTourEntities: [...prev.typeOfTourEntities, selectedType],
        typeOfTourIds: Array.isArray(prev.typeOfTourIds)
          ? [...prev.typeOfTourIds, selectedType.id]
          : [selectedType.id],
      }));
    }
  };

  // Handle adding a new service
  const handleAddService = () => {
    if (
      !newService.name ||
      (!newService.typeOfTourId && !newService.typeOfServiceId)
    )
      return;

    // Tạo service theo đúng định dạng DTO để đảm bảo nhất quán
    const serviceDTO = ServiceDTO.fromService(newService);

    setTourData((prev) => ({
      ...prev,
      tourServices: [
        ...(prev.tourServices || []),
        {
          ...serviceDTO,
          id: Date.now(), // Temporary ID for UI purposes only
        },
      ],
    }));

    // Reset form
    setNewService({
      name: "",
      description: "",
      price: 0,
      available: true,
      typeOfTourId: "",
      typeOfServiceId: "",
    });
  };

  // Handle removing a service
  const handleRemoveService = (index) => {
    setTourData((prev) => ({
      ...prev,
      tourServices: prev.tourServices.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!tourData.name?.trim()) errors.name = "Tên tour không được để trống";
    if (!tourData.description?.trim())
      errors.description = "Mô tả không được để trống";
    if (!tourData.startDate)
      errors.startDate = "Ngày bắt đầu không được để trống";
    if (!tourData.endDate) errors.endDate = "Ngày kết thúc không được để trống";
    if (
      tourData.startDate &&
      tourData.endDate &&
      new Date(tourData.startDate) > new Date(tourData.endDate)
    ) {
      errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (!tourData.maxQuantity)
      errors.maxQuantity = "Số lượng thành viên tối đa không được để trống";
    if (!tourData.typeOfTourIds || tourData.typeOfTourIds.length === 0)
      errors.typeOfTourIds = "Phải chọn ít nhất một loại tour";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Prepare data for API
  const prepareTourDataForAPI = () => {
    // Tạo dữ liệu cơ bản
    const data = {
      id: parseInt(tourId),
      name: tourData.name,
      description: tourData.description,
      maxQuantity: parseInt(tourData.maxQuantity || 0),
      approvalStatus: tourData.approvalStatus || "PENDING",
      typeOfTourIds: [],
      tourPrices: [],
      services: [],
      itineraries: [],
      itineraryStrings: [],
    };

    // Format dates with time for API
    if (tourData.startDate) {
      const startDate = new Date(tourData.startDate);
      const [startHours, startMinutes] = (tourData.startTime || "00:00").split(
        ":"
      );
      startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0);
      data.startDate = startDate.toISOString();
    }

    if (tourData.endDate) {
      const endDate = new Date(tourData.endDate);
      const [endHours, endMinutes] = (tourData.endTime || "23:59").split(":");
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0);
      data.endDate = endDate.toISOString();
    }

    // Prepare services
    if (tourData.tourServices && tourData.tourServices.length > 0) {
      data.services = tourData.tourServices.map((service) =>
        ServiceDTO.fromService(service)
      );
    }

    // Prepare prices
    if (tourData.tourPrices && tourData.tourPrices.length > 0) {
      data.tourPrices = tourData.tourPrices.map((price) => ({
        name: price.name,
        price: parseFloat(price.price) || 0,
        description: price.description || "",
      }));
    }

    // Prepare itineraries
    if (tourData.itineraries && tourData.itineraries.length > 0) {
      data.itineraries = tourData.itineraries.map((item) => {
        const itineraryId =
          item.id && !isNaN(parseInt(item.id)) ? parseInt(item.id) : null;
        return {
          ...(itineraryId !== null ? { id: itineraryId } : {}),
          itinerary: item.itinerary,
          date_time: item.date_time,
        };
      });

      // The backend also expects just the strings for itineraryStrings
      data.itineraryStrings = tourData.itineraries.map(
        (item) => item.itinerary
      );
    }

    // Convert typeOfTourIds to array of numbers
    if (
      Array.isArray(tourData.typeOfTourIds) &&
      tourData.typeOfTourIds.length > 0
    ) {
      data.typeOfTourIds = tourData.typeOfTourIds.map((id) => parseInt(id));
    } else if (
      tourData.typeOfTourEntities &&
      Array.isArray(tourData.typeOfTourEntities)
    ) {
      data.typeOfTourIds = tourData.typeOfTourEntities.map((type) =>
        parseInt(type.id)
      );
    }

    // Tạo TourDTO với data đã chuẩn bị
    const tourDTO = new TourDTO(data);

    console.log("API data prepared:", tourDTO);

    return tourDTO;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector(".is-invalid");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    try {
      setSaveLoading(true);
      setError(null);
      setSaveSuccess(false);

      // Prepare data for API
      const apiData = prepareTourDataForAPI();

      console.log("Submitting tour data:", apiData);

      // 1. Đầu tiên, cập nhật thông tin tour
      const updatedTour = await tourService.updateTour(tourId, apiData);
      console.log("Tour updated successfully:", updatedTour);

      // 2. Sau đó xử lý tải lên hình ảnh mới nếu có
      if (newImages.length > 0) {
        try {
          console.log("Uploading new images");

          // Nếu không có hình ảnh hiện có, hình ảnh đầu tiên sẽ là hình ảnh chính
          if (existingImages.length === 0 && newImages.length > 0) {
            // Tải lên hình ảnh chính
            await tourService.uploadMainImage(tourId, newImages[0]);
            console.log("Main image uploaded");

            // Nếu có nhiều hơn 1 hình ảnh, tải lên các hình ảnh bổ sung
            if (newImages.length > 1) {
              await tourService.uploadAdditionalImages(
                tourId,
                newImages.slice(1)
              );
              console.log("Additional images uploaded");
            }
          } else {
            // Nếu đã có hình ảnh, tất cả hình ảnh mới đều là hình ảnh bổ sung
            await tourService.uploadAdditionalImages(tourId, newImages);
            console.log("Additional images uploaded");
          }

          // Cập nhật lại danh sách hình ảnh
          const refreshedImages = await tourService.getTourImages(tourId);
          setExistingImages(refreshedImages);

          // Xóa các hình ảnh mới đã tải lên và cập nhật preview
          setNewImages([]);
          setPreviewImages(
            refreshedImages.map((img) => ({
              id: img.id,
              preview: img.url,
              isExisting: true,
            }))
          );
        } catch (imageError) {
          console.error("Error uploading images:", imageError);
          setError(
            "Tour đã được cập nhật nhưng xảy ra lỗi khi tải ảnh mới lên."
          );
        }
      }

      // Show success message
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error updating tour:", err);
      const errorMessage =
        err.response?.data ||
        err.message ||
        "Cập nhật tour không thành công. Vui lòng thử lại.";
      setError(errorMessage);
      window.scrollTo(0, 0);
    } finally {
      setSaveLoading(false);
    }
  };

  // Xử lý xóa gói giá
  const handleRemovePrice = (index, priceId) => {
    // Nếu gói giá có ID (đã tồn tại trong database), thêm vào danh sách IDs bị xóa
    if (priceId && !isNaN(parseInt(priceId))) {
      setDeletedPriceIds((prev) => [...prev, parseInt(priceId)]);
    }

    // Xóa khỏi danh sách hiển thị
    setTourData((prev) => ({
      ...prev,
      tourPrices: prev.tourPrices.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="update-tour-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Cập Nhật Tour</h1>{" "}
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/admin/tours")}
        >
          <i className="fas fa-arrow-left me-2"></i> Quay Lại Danh Sách Tour
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success mb-4" role="alert">
          <i className="fas fa-check-circle me-2"></i>
          Tour đã được cập nhật thành công!
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Đang tải dữ liệu tour..." />
      ) : (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "basic" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("basic")}
                >
                  <i className="fas fa-info-circle me-2"></i> Thông Tin Cơ Bản
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "services" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("services")}
                >
                  <i className="fas fa-concierge-bell me-2"></i> Dịch Vụ
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "pricing" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("pricing")}
                >
                  <i className="fas fa-tag me-2"></i> Giá
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "images" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("images")}
                >
                  <i className="fas fa-images me-2"></i> Hình Ảnh
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    activeTab === "itinerary" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("itinerary")}
                >
                  <i className="fas fa-map-marked-alt me-2"></i> Lịch Trình
                </button>
              </li>
            </ul>

            <form onSubmit={handleSubmit}>
              {/* Basic Info Tab */}
              {activeTab === "basic" && (
                <div className="tab-pane fade show active">
                  <div className="row mb-3">
                    <div className="col-md-8">
                      <label htmlFor="name" className="form-label">
                        Tên Tour <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${
                          formErrors.name ? "is-invalid" : ""
                        }`}
                        id="name"
                        name="name"
                        value={tourData.name || ""}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.name && (
                        <div className="invalid-feedback">
                          {formErrors.name}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="approvalStatus" className="form-label">
                        Trạng Thái
                      </label>
                      <select
                        className="form-select"
                        id="approvalStatus"
                        name="approvalStatus"
                        value={tourData.approvalStatus || "PENDING"}
                        onChange={handleInputChange}
                      >
                        {" "}
                        <option value="PENDING">Đang Chờ</option>
                        <option value="APPROVED">Đã Duyệt</option>
                        <option value="REJECTED">Đã Từ Chối</option>
                      </select>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="startDate" className="form-label">
                        Ngày Bắt Đầu <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${
                          formErrors.startDate ? "is-invalid" : ""
                        }`}
                        id="startDate"
                        name="startDate"
                        value={tourData.startDate || ""}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.startDate && (
                        <div className="invalid-feedback">
                          {formErrors.startDate}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="endDate" className="form-label">
                        Ngày Kết Thúc <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${
                          formErrors.endDate ? "is-invalid" : ""
                        }`}
                        id="endDate"
                        name="endDate"
                        value={tourData.endDate || ""}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.endDate && (
                        <div className="invalid-feedback">
                          {formErrors.endDate}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="startTime" className="form-label">
                        Giờ Bắt Đầu
                      </label>
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
                      <label htmlFor="endTime" className="form-label">
                        Giờ Kết Thúc
                      </label>
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

                  <div className="mb-3">
                    <label htmlFor="maxQuantity" className="form-label">
                      Số Lượng Thành Viên Tối Đa{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${
                        formErrors.maxQuantity ? "is-invalid" : ""
                      }`}
                      id="maxQuantity"
                      name="maxQuantity"
                      value={tourData.maxQuantity || ""}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                    {formErrors.maxQuantity && (
                      <div className="invalid-feedback">
                        {formErrors.maxQuantity}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">
                      Mô Tả <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className={`form-control ${
                        formErrors.description ? "is-invalid" : ""
                      }`}
                      id="description"
                      name="description"
                      value={tourData.description || ""}
                      onChange={handleInputChange}
                      rows="5"
                      required
                    ></textarea>
                    {formErrors.description && (
                      <div className="invalid-feedback">
                        {formErrors.description}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label d-block">
                      Loại Tour <span className="text-danger">*</span>
                    </label>
                    <div
                      className={`mb-3 ${
                        formErrors.typeOfTourIds ? "is-invalid" : ""
                      }`}
                    >
                      {tourTypes.map((type) => (
                        <div
                          className="form-check form-check-inline"
                          key={type.id}
                        >
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`tourType${type.id}`}
                            checked={
                              tourData.typeOfTourIds?.includes(type.id) ||
                              tourData.typeOfTourEntities?.some(
                                (t) => t.id === type.id
                              )
                            }
                            onChange={() => handleTourTypeChange(type.id)}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`tourType${type.id}`}
                          >
                            {type.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {formErrors.typeOfTourIds && (
                      <div className="invalid-feedback d-block">
                        {formErrors.typeOfTourIds}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Services Tab */}
              {activeTab === "services" && (
                <div className="tab-pane fade show active">
                  <div className="card mb-4">                    <div className="card-header bg-light">
                      <h5 className="mb-0">Dịch Vụ Tour</h5>
                    </div>
                    <div className="card-body">
                      <p className="text-muted mb-3">
                        Add services that are included or available for an
                        additional fee during the tour.
                      </p>

                      {/* Service List */}
                      <div className="table-responsive mb-3">
                        {console.log(
                          "Rendering services tab with services:",
                          tourData.tourServices
                        )}
                        <table className="table table-bordered table-hover">
                          <thead className="table-light">
                            <tr>                              <th>Tên Dịch Vụ</th>
                              <th>Loại</th>
                              <th>Mô Tả</th>
                              <th>Giá</th>
                              <th>Khả Dụng</th>
                              <th>Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tourData.tourServices &&
                            tourData.tourServices.length > 0 ? (
                              tourData.tourServices.map((service, index) => {
                                // Handle both possible service data structures from backend
                                console.log("Rendering service:", service);
                                const serviceName = service.name || "";
                                const serviceType =
                                  service.typeOfService?.name ||
                                  serviceTypes.find(
                                    (t) => t.id === service.typeOfServiceId
                                  )?.name ||
                                  serviceTypes.find(
                                    (t) => t.id === service.typeOfTourId
                                  )?.name ||
                                  "Other";
                                const serviceDesc = service.description || "";
                                const servicePrice = service.price || 0;
                                const serviceAvailable =
                                  service.available !== undefined
                                    ? service.available
                                    : true;

                                return (
                                  <tr key={index}>
                                    <td>{serviceName}</td>
                                    <td>{serviceType}</td>
                                    <td>{serviceDesc}</td>
                                    <td>
                                      {servicePrice > 0
                                        ? `$${servicePrice.toLocaleString()}`
                                        : "Free"}
                                    </td>
                                    <td className="text-center">
                                      {serviceAvailable ? (
                                        <span className="badge bg-success">
                                          Yes
                                        </span>
                                      ) : (
                                        <span className="badge bg-secondary">
                                          No
                                        </span>
                                      )}
                                    </td>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() =>
                                          handleRemoveService(index)
                                        }
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan="6"
                                  className="text-center text-muted"
                                >
                                  Chưa có dịch vụ nào được thêm
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Service Form */}
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6 className="card-title">Thêm Dịch Vụ Mới</h6>
                          <div className="row g-3">
                            <div className="col-md-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Tên Dịch Vụ"
                                value={newService.name || ""}
                                onChange={(e) =>
                                  setNewService((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-3">
                              <select
                                className="form-select"
                                value={
                                  newService.typeOfServiceId ||
                                  newService.typeOfTourId ||
                                  ""
                                }
                                onChange={(e) =>
                                  setNewService((prev) => ({
                                    ...prev,
                                    typeOfServiceId: parseInt(e.target.value),
                                    typeOfTourId: parseInt(e.target.value), // Keep both for backward compatibility
                                  }))
                                }
                              >
                                <option value="">Chọn Loại Dịch Vụ</option>
                                {serviceTypes.map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-2">                              <input
                                type="number"
                                className="form-control"
                                placeholder="Giá"
                                value={newService.price || ""}
                                onChange={(e) =>
                                  setNewService((prev) => ({
                                    ...prev,
                                    price: parseInt(e.target.value),
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-2">
                              <div className="form-check mt-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id="isAvailable"
                                  checked={newService.available ?? true}
                                  onChange={(e) =>
                                    setNewService((prev) => ({
                                      ...prev,
                                      available: e.target.checked,
                                    }))
                                  }
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor="isAvailable"
                                >
                                  Khả Dụng
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <textarea
                              className="form-control"                                placeholder="Mô Tả"
                              value={newService.description || ""}
                              onChange={(e) =>
                                setNewService((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              rows="2"
                            ></textarea>
                          </div>
                          <div className="d-flex justify-content-end mt-3">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={handleAddService}
                              disabled={
                                !newService.name ||
                                (!newService.typeOfTourId &&
                                  !newService.typeOfServiceId)
                              }
                            >
                              <i className="fas fa-plus me-2"></i> Thêm Dịch Vụ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === "pricing" && (
                <div className="tab-pane fade show active">
                  <div className="card mb-4">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">Giá Tour</h5>
                    </div>
                    <div className="card-body">
                      <p className="text-muted mb-3">
                        Add pricing options for this tour. You can define
                        different packages with various prices.
                      </p>

                      {/* Price List */}
                      <div className="table-responsive mb-3">
                        <table className="table table-bordered table-hover">
                          <thead className="table-light">
                            <tr>                              <th>Tên Gói</th>
                              <th>Giá</th>
                              <th>Mô Tả</th>
                              <th>Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tourData.tourPrices &&
                            tourData.tourPrices.length > 0 ? (
                              tourData.tourPrices.map((price, index) => (
                                <tr key={index}>
                                  <td>{price.name}</td>
                                  <td>${price.price.toLocaleString()}</td>
                                  <td>
                                    {price.description || "No description"}
                                  </td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() =>
                                        handleRemovePrice(index, price.id)
                                      }
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="text-center text-muted"
                                >
                                  Chưa có gói giá nào được định nghĩa
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Price Form */}
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6 className="card-title">Thêm Gói Giá Mới</h6>
                          <div className="row g-3">
                            <div className="col-md-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Tên Gói (vd: Tiêu Chuẩn, Cao Cấp)"
                                value={newPrice?.name || ""}
                                onChange={(e) =>
                                  setNewPrice((prev) => ({
                                    ...(prev || {}),
                                    name: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-4">
                              <input
                                type="number"                                className="form-control"
                                placeholder="Giá"
                                value={newPrice?.price || ""}
                                onChange={(e) =>
                                  setNewPrice((prev) => ({
                                    ...(prev || {}),
                                    price: parseInt(e.target.value),
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-4">
                              <div className="d-grid">
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => {
                                    if (!newPrice?.name || !newPrice?.price)
                                      return;

                                    setTourData((prev) => ({
                                      ...prev,
                                      tourPrices: [
                                        ...(prev.tourPrices || []),
                                        {
                                          ...newPrice,
                                          id: Date.now(), // Temporary ID for UI purposes
                                        },
                                      ],
                                    }));

                                    // Reset form
                                    setNewPrice(null);
                                  }}
                                  disabled={!newPrice?.name || !newPrice?.price}
                                >
                                  <i className="fas fa-plus me-2"></i> Thêm Giá
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <textarea
                              className="form-control"
                              placeholder="Description (optional)"
                              value={newPrice?.description || ""}
                              onChange={(e) =>
                                setNewPrice((prev) => ({
                                  ...(prev || {}),
                                  description: e.target.value,
                                }))
                              }
                              rows="2"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Images Tab */}
              {activeTab === "images" && (
                <div className="tab-pane fade show active">
                  <div className="card mb-4">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">Hình Ảnh Tour</h5>
                    </div>
                    <div className="card-body">
                      <p className="text-muted mb-3">
                        Upload images for this tour. The first image will be
                        used as the main image.
                      </p>

                      {/* Current Images */}
                      {previewImages.length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-muted mb-3">Hình Ảnh Hiện Tại</h6>
                          <div className="row g-3">
                            {previewImages.map((image, index) => (
                              <div className="col-md-3 col-sm-6" key={index}>
                                <div className="card h-100">
                                  <div className="position-relative">
                                    <img
                                      src={image.preview}
                                      alt={`Tour preview ${index + 1}`}
                                      className="card-img-top"
                                      style={{
                                        aspectRatio: "4/3",
                                        objectFit: "cover",
                                      }}
                                    />
                                    {index === 0 && (
                                      <div className="position-absolute bottom-0 start-0 m-2">
                                        <span className="badge bg-primary">                                        Chính
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="card-body d-flex justify-content-center p-2">
                                    {image.isExisting && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() =>
                                          handleDeleteImage(image.id)
                                        }
                                      >
                                        <i className="fas fa-trash me-1"></i>{" "}
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image Upload Form */}
                      <div className="card bg-light">
                        <div className="card-body">                          <h6 className="card-title">Tải Lên Hình Ảnh</h6>

                          <div className="mb-3">
                            <label htmlFor="tour-images" className="form-label">
                              Chọn Hình Ảnh
                            </label>
                            <input
                              type="file"
                              className="form-control"
                              id="tour-images"
                              accept="image/*"
                              multiple
                              onChange={handleImageSelect}
                            />
                            <div className="form-text">                              Tải lên file JPG, PNG, hoặc GIF. Kích thước tối đa 5MB
                              mỗi ảnh.
                            </div>
                          </div>

                          {/* Image Previews */}
                          {imageFiles.length > 0 && (
                            <div className="mb-3">
                              <h6 className="text-muted mb-2">
                                New Image Previews
                              </h6>
                              <div className="row g-2">
                                {imageFiles.map((file, index) => (
                                  <div
                                    className="col-md-2 col-sm-3"
                                    key={index}
                                  >
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={`Preview ${index + 1}`}
                                      className="img-thumbnail"
                                      style={{
                                        aspectRatio: "1/1",
                                        objectFit: "cover",
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleUploadMainImage}
                              disabled={imageFiles.length === 0 || saveLoading}
                            >
                              {saveLoading ? (
                                <>
                                  <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
                                  ></span>
                                  Đang Tải Lên...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-cloud-upload-alt me-2"></i>{" "}
                                  Tải Lên Làm Ảnh Chính
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={handleUploadAdditionalImages}
                              disabled={imageFiles.length === 0 || saveLoading}
                            >
                              <i className="fas fa-images me-2"></i>                              Tải Lên Làm
                              Ảnh Bổ Sung
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Itinerary Tab */}
              {activeTab === "itinerary" && (
                <div className="tab-pane fade show active">
                  <div className="card mb-4">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">Lịch Trình Tour</h5>
                    </div>
                    <div className="card-body">
                      <p className="text-muted mb-3">
                        Thêm hoạt động và lịch trình cho chuyến tham quan này. Mỗi mục
đại diện cho một mốc thời gian trong hành trình.
                      </p>

                      {/* Current Itinerary */}
                      {console.log(
                        "Rendering itinerary tab with data:",
                        tourData.itineraries
                      )}
                      {tourData.itineraries &&
                      tourData.itineraries.length > 0 ? (
                        <div className="table-responsive mb-4">
                          <table className="table table-bordered table-hover">
                            <thead className="table-light">                              <tr>
                                <th style={{ width: "10%" }}>Thời Gian</th>
                                <th style={{ width: "15%" }}>Ngày</th>
                                <th style={{ width: "15%" }}>Giờ</th>
                                <th style={{ width: "50%" }}>Hoạt Động</th>
                                <th style={{ width: "10%" }}>Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tourData.itineraries.map((item, index) => {
                                console.log("Rendering itinerary item:", item);
                                const dateTime = item.date_time
                                  ? new Date(item.date_time)
                                  : null;
                                return (
                                  <tr key={index}>
                                    <td>Thời điểm {index + 1}</td>
                                    <td>
                                      {dateTime
                                        ? dateTime.toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })
                                        : "Date not specified"}
                                    </td>
                                    <td>
                                      {dateTime
                                        ? dateTime.toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })
                                        : "Time not specified"}
                                    </td>
                                    <td>{item.itinerary}</td>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() =>
                                          handleRemoveItinerary(index)
                                        }
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="alert alert-info mb-4">
                          <i className="fas fa-info-circle me-2"></i>
                          Chưa có mục nào trong lịch trình được thêm.
                        </div>
                      )}

                      {/* Add Itinerary Form */}
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6 className="card-title">Thêm Mục Lịch Trình</h6>
                          <div className="row g-3 mb-3">
                            <div className="col-md-3">
                              <label
                                htmlFor="itinerary-date"
                                className="form-label"
                              >
                                Date
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                id="itinerary-date"
                                value={newItinerary.date_time}
                                onChange={(e) =>
                                  setNewItinerary((prev) => ({
                                    ...prev,
                                    date_time: e.target.value,
                                  }))
                                }
                                min={tourData.startDate}
                                max={tourData.endDate}
                              />
                            </div>
                            <div className="col-md-2">
                              <label
                                htmlFor="itinerary-time"
                                className="form-label"
                              >
                                Time
                              </label>
                              <input
                                type="time"
                                className="form-control"
                                id="itinerary-time"
                                value={newItinerary.time}
                                onChange={(e) =>
                                  setNewItinerary((prev) => ({
                                    ...prev,
                                    time: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-7">
                              <label
                                htmlFor="itinerary-activity"
                                className="form-label"
                              >                                Mô Tả Hoạt Động
                              </label>
                              <textarea
                                className="form-control"
                                id="itinerary-activity"
                                rows="3"
                                placeholder="Mô tả các hoạt động tại thời điểm này..."
                                value={newItinerary.itinerary}
                                onChange={(e) =>
                                  setNewItinerary((prev) => ({
                                    ...prev,
                                    itinerary: e.target.value,
                                  }))
                                }
                              ></textarea>
                            </div>
                          </div>
                          <div className="d-flex justify-content-end">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleAddItinerary}
                              disabled={
                                !newItinerary.itinerary ||
                                !newItinerary.date_time
                              }
                            >                              <i className="fas fa-plus me-2"></i> Thêm Vào
                              Lịch Trình
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="alert alert-warning mt-4">
                        <i className="fas fa-exclamation-triangle me-2"></i>                        <strong>Lưu ý:</strong> Ngày trong lịch trình phải nằm trong
                        khoảng thời gian từ ngày bắt đầu đến ngày kết thúc tour.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="d-flex justify-content-end mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Đang Cập Nhật...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i> Lưu Thay Đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateTourPage;
