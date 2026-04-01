import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import tourService from "../services/tourService";
import bookingService from "../services/bookingService";
import commentService from "../services/commentService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { favoriteService } from "../services/favoriteService";
import GoogleMapEmbed from "../components/GoogleMapEmbed";
// import { ToastContainer, toast } from "react-toastify";

/**
 * TourDetailPage Component
 * Displays detailed information about a tour and booking options
 */
const TourDetailPage = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // State
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState("");
  const [participants, setParticipants] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(5);
  const [commentLoading, setCommentLoading] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Load tour data
  useEffect(() => {
    const fetchTourData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch tour details from the real backend
        const tourData = await tourService.getTourById(tourId);
        console.log("Tour data received:", tourData);

        // The API returns either directly the data or as an optional wrapper
        const data = tourData.isPresent ? tourData.value : tourData;

        // Fetch tour images separately
        try {
          const tourImages = await tourService.getTourImages(tourId);
          if (tourImages && tourImages.length > 0) {
            // Add images to the tour data
            data.images = tourImages;
          } else {
            data.images = [];
          }
        } catch (imgErr) {
          console.error("Lỗi khi tải ảnh tour:", imgErr);
          data.images = [];
        }

        setTour(data);

        // Set default selected package if available
        if (data.tourPrices && data.tourPrices.length > 0) {
          setSelectedPackage(data.tourPrices[0].id);
        }

        // Load comments for this tour
        loadComments(tourId);
      } catch (err) {
        console.error("Error fetching tour details:", err);
        setError("Không thể tải thông tin tour. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    if (tourId) {
      fetchTourData();
      // Reset booking form state when tour changes
      setSelectedDate("");
      setParticipants(1);
      setSelectedPackage("");
    }
  }, [tourId]);

  // Load comments for a tour
  const loadComments = async (tourId) => {
    try {
      setCommentLoading(true);
      const commentsData = await commentService.getCommentsByTour(tourId);
      setComments(commentsData || []);
    } catch (err) {
      console.error("Lỗi khi tải bình luận:", err);
      // Không set error state ở đây để tránh ảnh hưởng đến hiển thị chính của tour
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle adding a new comment
  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/tours/${tourId}`,
          message: "Vui lòng đăng nhập để bình luận",
        },
      });
      return;
    }

    if (!newComment.trim()) {
      return; // Không gửi bình luận trống
    }

    try {
      setCommentLoading(true);

      let userId = 1; // ID người dùng mặc định phòng khi không tìm thấy

      // Try to get the user ID from various sources
      if (user && user.id) {
        userId = user.id;
      } else {
        // Try to get from localStorage
        try {
          const userString = localStorage.getItem("user");
          if (userString) {
            const userData = JSON.parse(userString);
            if (userData) {
              if (userData.id) userId = userData.id;
              else if (userData.userId) userId = userData.userId;
              else if (userData.user_id) userId = userData.user_id;
              else if (userData.userID) userId = userData.userID;
              // If no ID is found, we'll use the default userId = 1
            }
          }
        } catch (err) {
          console.error("Lỗi khi đọc dữ liệu người dùng từ localStorage:", err);
        }
      }

      console.log("Submitting comment with userId:", userId);

      await commentService.addComment({
        userId: userId,
        tourId: parseInt(tourId),
        content: newComment,
        rating: rating,
      });

      // Reload comments after adding
      await loadComments(tourId);

      // Reset comment form
      setNewComment("");
      setRating(5);
    } catch (err) {
      console.error("Error adding comment:", err);
      alert(
        "Không thể thêm bình luận: " + (err.message || "Lỗi không xác định")
      );
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (comment) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) {
      return;
    }

    try {
      setCommentLoading(true);

      // Extract necessary fields from the comment object
      const { tourId, userId, commentDate } = comment;

      console.log("Deleting comment:", { tourId, userId, commentDate });

      await commentService.deleteComment(
        tourId,
        userId,
        new Date(commentDate).getTime()
      );

      // Reload comments after deleting
      await loadComments(tourId);
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert(
        "Không thể xóa bình luận: " + (err.message || "Lỗi không xác định")
      );
    } finally {
      setCommentLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate total participants
  const calculateTotalParticipants = () => {
    let total = 0;
    Object.values(quantities).forEach((quantity) => {
      total += quantity;
    });
    return total;
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!tour || !tour.tourPrices) return 0;

    let total = 0;
    tour.tourPrices.forEach((pkg) => {
      const quantity = quantities[pkg.id] || 0;
      total += pkg.price * quantity;
    });

    return total;
  };

  // Handle booking form submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/tours/${tourId}`,
          message: "Vui lòng đăng nhập để đặt tour này",
        },
      });
      return;
    }

    try {
      setProcessing(true);
      setError(null); // Clear previous errors

      // Gather selected packages
      const selectedPackages = Object.entries(quantities)
        .filter(([id, quantity]) => quantity > 0)
        .map(([id, quantity]) => {
          const pkg = tour.tourPrices.find((p) => p.id === id);
          return {
            packageId: id,
            packageName: pkg?.name || "Gói tour",
            quantity,
            price: pkg?.price || 0,
          };
        });
      if (selectedPackages.length === 0) {
        alert("Vui lòng chọn ít nhất một gói tour");
        setProcessing(false);
        return;
      }

      const totalParticipants = calculateTotalParticipants();
      const maxSize = tour.maxQuantity || 10;

      if (totalParticipants > maxSize) {
        alert(
          `Số lượng người tham gia đã vượt quá giới hạn tối đa ${maxSize} người. Vui lòng giảm số lượng.`
        );
        setProcessing(false);
        return;
      }

      // Get user information - improved version with better logging
      let userId = null;
      console.log("Auth context user:", user);

      // Try from auth context first
      if (user && user.id) {
        userId = user.id;
        console.log("Using userId from auth context:", userId);
      } else {
        // Try multiple localStorage keys with detailed logging
        try {
          const userDataStr = localStorage.getItem("user");
          console.log(
            "User data from localStorage:",
            userDataStr ? "found" : "not found"
          );

          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            console.log("Parsed user data:", userData);

            if (userData) {
              // Try different potential ID field names
              if (userData.id) {
                userId = userData.id;
                console.log("Using userId from localStorage.user.id:", userId);
              } else if (userData.userId) {
                userId = userData.userId;
                console.log(
                  "Using userId from localStorage.user.userId:",
                  userId
                );
              } else if (userData.user_id) {
                userId = userData.user_id;
                console.log(
                  "Using userId from localStorage.user.user_id:",
                  userId
                );
              } else if (userData.userID) {
                userId = userData.userID;
                console.log(
                  "Using userId from localStorage.user.userID:",
                  userId
                );
              }
            }
          }

          // Try alternative localStorage keys if user ID still not found
          if (!userId) {
            const alternatives = [
              "userData",
              "currentUser",
              "authUser",
              "loggedInUser",
            ];
            for (const alt of alternatives) {
              const altDataStr = localStorage.getItem(alt);
              if (altDataStr) {
                try {
                  const altData = JSON.parse(altDataStr);
                  if (
                    altData &&
                    (altData.id ||
                      altData.userId ||
                      altData.user_id ||
                      altData.userID)
                  ) {
                    userId =
                      altData.id ||
                      altData.userId ||
                      altData.user_id ||
                      altData.userID;
                    console.log(
                      `Using userId from localStorage.${alt}:`,
                      userId
                    );
                    break;
                  }
                } catch (e) {
                  console.error(`Error parsing ${alt} data:`, e);
                }
              }
            }
          }
        } catch (e) {
          console.error(
            "Lỗi khi truy cập hoặc đọc dữ liệu người dùng từ localStorage:",
            e
          );
        }
      }

      if (!userId) {
        console.error("Không thể lấy ID người dùng từ bất kỳ nguồn nào");
        localStorage.removeItem("user"); // Xóa dữ liệu người dùng có thể bị hỏng
        setError(
          "Không thể xác định tài khoản của bạn. Vui lòng đăng xuất và đăng nhập lại."
        );
        setProcessing(false);
        return;
      }

      // Prepare booking data with tour information
      const bookingData = {
        tourId: parseInt(tourId),
        userId: parseInt(userId), // Ensure it's an integer as expected by the backend
        tourName: tour.name,
        date: selectedDate,
        totalAmount: calculateTotalPrice(),
        packages: selectedPackages,
      };

      console.log("Submitting booking with data:", bookingData);

      // Create booking in the backend
      const result = await bookingService.createBooking(bookingData);

      if (result) {
        // Reset form
        setSelectedDate("");
        setQuantities({});

        // Navigate directly to payment page
        navigate("/payment", {
          state: {
            bookingData: { ...bookingData, id: result.id },
          },
        });
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      // Display a more specific error message if available
      if (err.message) {
        setError(err.message);
      } else {
        setError("Không thể tạo đơn đặt tour. Vui lòng thử lại sau.");
      }
    } finally {
      setProcessing(false);
    }
  };
  // Check if tour is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (isAuthenticated && user && tourId) {
        try {
          const status = await favoriteService.isFavorite(user.id, tourId);
          setIsFavorite(status);
        } catch (error) {
          console.error("Error checking favorite status:", error);
        }
      }
    };

    checkFavoriteStatus();
  }, [isAuthenticated, user, tourId]);

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/tours/${tourId}`,
          message: "Vui lòng đăng nhập để thêm tour vào danh sách yêu thích",
        },
      });
      return;
    }

    try {
      setFavoriteLoading(true);
      if (isFavorite) {
        await tourService.removeFavorite(tourId);
        setIsFavorite(false);
      } else {
        await tourService.addFavorite(tourId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Không thể cập nhật trạng thái yêu thích. Vui lòng thử lại sau.");
    } finally {
      setFavoriteLoading(false);
    }
  };
  // Render loading state
  if (loading) {
    return <LoadingSpinner message="Đang tải thông tin tour..." />;
  }

  // Render error state
  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <i className="fas fa-exclamation-circle me-2"></i>
        {error}
      </div>
    );
  }

  // Render 404 state
  if (!tour) {
    return (
      <div className="alert alert-info m-4">
        <i className="fas fa-info-circle me-2"></i>
        Không tìm thấy thông tin tour này
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="tour-detail-page">
        {/* Tour Header/Hero */}
        <div
          className="tour-detail-hero mb-4"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${
              tour.images && tour.images.length > 0
                ? tour.images[0].url
                : "https://via.placeholder.com/1200x600?text=Khong+Co+Anh"
            })`,
          }}
        >
          <div className="container">
            <div className="tour-detail-content">
              <div className="row">
                <div className="col-lg-8">
                  <div className="text-white">
                    <h1 className="mb-2">{tour.name}</h1>
                    <p className="mb-3">
                      <i className="fas fa-map-marker-alt me-2"></i>
                      {tour.destinations
                        ? tour.destinations.join(", ")
                        : "Đa điểm"}
                    </p>

                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="me-2 text-warning">★★★★★</div>
                        <span>4.8</span>
                      </div>

                      <div>
                        <i className="fas fa-users me-2"></i>
                        <span>{tour.maxQuantity || "Chưa rõ"} người</span>
                      </div>
                    </div>

                    <div className="badges">
                      {tour.tourPrices && tour.tourPrices.length > 0 && (
                        <span className="badge bg-primary me-2 p-2">
                          Giá từ {new Intl.NumberFormat('vi-VN').format(Math.min(...tour.tourPrices.map((price) => price.price)))} VNĐ
                        </span>
                      )}
                      {tour.startDate && tour.endDate && (
                        <span className="badge bg-secondary me-2 p-2">
                          {Math.ceil(
                            (new Date(tour.endDate) -
                              new Date(tour.startDate)) /
                              (1000 * 60 * 60 * 24)
                          )}{" "}
                          ngày
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mb-5">
          <div className="row">
            {/* Tour Details */}
            <div className="col-lg-8 mb-4 mb-lg-0">
              {/* Navigation Tabs */}
              <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "overview" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("overview")}
                  >
                    Tổng Quan
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "itinerary" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("itinerary")}
                  >
                    Lịch Trình
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "services" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("services")}
                  >
                    Dịch Vụ
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      activeTab === "comments" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("comments")}
                  >
                    Đánh Giá
                  </button>
                </li>
              </ul>

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div>
                  <h3 className="mb-3">Giới Thiệu Tour</h3>
                  <p className="mb-4">
                    {tour.description ||
                      "Không có mô tả chi tiết cho tour này."}
                  </p>

                  {/* Tour Types */}
                  <h4 className="mb-2 mt-4">Loại Tour</h4>
                  <div className="mb-4">
                    {tour.typeOfTours && tour.typeOfTours.length > 0 ? (
                      tour.typeOfTours.map((type, index) => (
                        <span
                          key={type.id}
                          className="badge bg-light text-dark me-2 mb-2 p-2"
                        >
                          {type.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-muted">
                        Không có thông tin về loại tour
                      </p>
                    )}
                  </div>

                  {/* Gallery */}
                  <h4 className="mb-3 mt-4">Hình Ảnh Tour</h4>
                  <div className="gallery-grid mb-4">
                    {tour.images && tour.images.length > 0 ? (
                      tour.images.map((image, index) => (
                        <div key={image.id || index} className="gallery-item">
                          <img
                            src={
                              image.url ||
                              "https://via.placeholder.com/300x200?text=Khong+Co+Anh"
                            }
                            alt={`Tour image ${index + 1}`}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-12">
                        <p className="text-muted">
                          Không có hình ảnh cho tour này
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Itinerary Tab */}
              {activeTab === "itinerary" && (
                <div>
                  <h3 className="mb-4">Lịch Trình Tour</h3>

                  {tour.itineraries && tour.itineraries.length > 0 ? (
                    <div className="itinerary-timeline">
                      {tour.itineraries.map((item, index) => (
                        <div key={index} className="itinerary-item">
                          <div className="card border-0 shadow-sm">
                            <div className="card-body">
                              <h5 className="card-title">
                                Ngày {index + 1}:{" "}
                                {item.date_time
                                  ? formatDate(item.date_time)
                                  : ""}
                              </h5>
                              <p className="card-text">{item.itinerary}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      Lịch trình chi tiết của tour này chưa có sẵn. Vui lòng
                      liên hệ với chúng tôi để biết thêm thông tin.
                    </div>
                  )}
                </div>
              )}

              {/* Services Tab */}
              {activeTab === "services" && (
                <div>
                  <h3 className="mb-4">Dịch Vụ Bao Gồm</h3>

                  {tour.services && tour.services.length > 0 ? (
                    <div className="row">
                      {tour.services.map((service, index) => (
                        <div key={index} className="col-md-6 mb-3">
                          <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body">
                              <h5 className="card-title">
                                <i className="fas fa-concierge-bell text-primary me-2"></i>
                                {service.name}
                              </h5>
                              <p className="card-text">
                                {service.description || "Không có mô tả"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      Thông tin dịch vụ cho tour này chưa có sẵn. Vui lòng liên
                      hệ với chúng tôi để biết thêm chi tiết.
                    </div>
                  )}

                  {/* Not Included */}
                  <h4 className="mt-4 mb-3">Không Bao Gồm</h4>
                  <ul className="list-group mb-4">
                    <li className="list-group-item">
                      <i className="fas fa-times-circle text-danger me-2"></i>
                      Vé máy bay quốc tế và nội địa
                    </li>
                    <li className="list-group-item">
                      <i className="fas fa-times-circle text-danger me-2"></i>
                      Bảo hiểm du lịch
                    </li>
                    <li className="list-group-item">
                      <i className="fas fa-times-circle text-danger me-2"></i>
                      Chi phí cá nhân và tiền tip
                    </li>
                    <li className="list-group-item">
                      <i className="fas fa-times-circle text-danger me-2"></i>
                      Các hoạt động tùy chọn không được đề cập trong lịch trình
                    </li>
                  </ul>
                </div>
              )}

              {/* Comments/Reviews Tab */}
              {activeTab === "comments" && (
                <div>
                  <h3 className="mb-4">Đánh Giá Từ Khách Hàng</h3>

                  {/* Comments list */}
                  {commentLoading ? (
                    <div className="text-center py-3">
                      <div
                        className="spinner-border text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">
                          Đang tải đánh giá...
                        </span>
                      </div>
                      <p className="mt-2">Đang tải đánh giá...</p>
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="comments-list mb-4">
                      {comments.map((comment, index) => (
                        <div
                          key={index}
                          className="card mb-3 border-0 shadow-sm"
                        >
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h5 className="card-title mb-0">
                                <i className="fas fa-user-circle me-2"></i>
                                {comment.username || "Khách hàng ẩn danh"}
                              </h5>
                              <small className="text-muted">
                                {new Date(
                                  comment.commentDate
                                ).toLocaleDateString()}
                              </small>
                            </div>

                            <div className="mb-2">
                              {Array(5)
                                .fill(0)
                                .map((_, i) => (
                                  <i
                                    key={i}
                                    className={`fas fa-star ${
                                      i < comment.rating
                                        ? "text-warning"
                                        : "text-muted"
                                    }`}
                                  ></i>
                                ))}
                            </div>

                            <p className="card-text">{comment.content}</p>

                            {/* Show reply if exists */}
                            {comment.reply && (
                              <div className="admin-reply mt-3 p-3 bg-light rounded">
                                <h6 className="mb-2">
                                  <i className="fas fa-reply me-2"></i>
                                  Phản hồi từ quản trị viên
                                </h6>
                                <p className="mb-0">{comment.reply}</p>
                              </div>
                            )}

                            {/* Delete button for own comments or admin */}
                            {isAuthenticated &&
                              (user.id === comment.userId ||
                                user.roles.includes("ROLE_ADMIN")) && (
                                <button
                                  className="btn btn-sm btn-outline-danger mt-2"
                                  onClick={() => handleDeleteComment(comment)}
                                  disabled={commentLoading}
                                >
                                  <i className="fas fa-trash-alt me-1"></i>
                                  Xóa
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-info mb-4">
                      <i className="fas fa-info-circle me-2"></i>
                      Chưa có đánh giá nào cho tour này. Hãy là người đầu tiên
                      để lại đánh giá!
                    </div>
                  )}

                  {/* Add comment form */}
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title mb-3">Để Lại Đánh Giá</h5>

                      {!isAuthenticated ? (
                        <div className="alert alert-warning">
                          <i className="fas fa-user-lock me-2"></i>
                          Vui lòng{" "}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate("/login", {
                                state: {
                                  from: `/tours/${tourId}`,
                                  message: "Vui lòng đăng nhập để đánh giá",
                                },
                              });
                            }}
                            className="alert-link"
                          >
                            đăng nhập
                          </a>{" "}
                          để gửi đánh giá.
                        </div>
                      ) : (
                        <form onSubmit={handleAddComment}>
                          <div className="mb-3">
                            <label htmlFor="rating" className="form-label">
                              Đánh giá của bạn
                            </label>
                            <div className="rating-input mb-2">
                              {[5, 4, 3, 2, 1].map((value) => (
                                <span
                                  key={value}
                                  className="star-rating me-1"
                                  style={{
                                    cursor: "pointer",
                                    fontSize: "1.5rem",
                                  }}
                                  onClick={() => setRating(value)}
                                >
                                  <i
                                    className={`fas fa-star ${
                                      value <= rating
                                        ? "text-warning"
                                        : "text-muted"
                                    }`}
                                  ></i>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mb-3">
                            <label htmlFor="comment" className="form-label">
                              Nhận xét của bạn
                            </label>
                            <textarea
                              className="form-control"
                              id="comment"
                              rows="4"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Chia sẻ trải nghiệm của bạn về tour này..."
                              required
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={commentLoading || !newComment.trim()}
                          >
                            {commentLoading ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                                Đang gửi...
                              </>
                            ) : (
                              "Gửi Đánh Giá"
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Form */}
            <div className="col-lg-4">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "30px",
                }}
              >
                {/* Booking Form */}
                <div
                  className="booking-card"
                  style={{ position: "relative", zIndex: 1 }}
                >
                  <div className="booking-card-header">
                    <h3 className="h5 mb-0">Đặt Tour</h3>
                  </div>

                  <div className="booking-card-body">
                    {tour.tourPrices && tour.tourPrices.length > 0 ? (
                      <form onSubmit={handleBookingSubmit}>
                        <div className="mb-3">
                          <div className="booking-price mb-2">
                            {new Intl.NumberFormat('vi-VN').format(tour.tourPrices[0].price)} VNĐ
                            <span className="booking-price-unit">/người</span>
                          </div>
                          <div className="tour-card-rating mb-2">
                            <div className="stars text-warning me-2">★★★★★</div>
                            <div className="review-count">142 đánh giá</div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label htmlFor="bookingDate" className="form-label">
                            Chọn Ngày
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            id="bookingDate"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={
                              tour.startDate ? tour.startDate.split("T")[0] : ""
                            }
                            max={tour.endDate ? tour.endDate.split("T")[0] : ""}
                            required
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Số lượng vé</label>
                          <div className="d-flex justify-content-end mb-2">
                            <small className="text-muted">
                              Tổng: {calculateTotalParticipants()} /{" "}
                              {tour.maxQuantity || 10}
                            </small>
                          </div>
                          {tour.tourPrices.map((item) => (
                            <div
                              key={item.id}
                              className="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom"
                            >
                              <div>
                                <div className="fw-semibold">{item.name}</div>
                                <div className="text-primary fw-bold">
                                  {new Intl.NumberFormat('vi-VN').format(item.price)} VNĐ
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    padding: "0",
                                  }}
                                  onClick={() =>
                                    setQuantities((prev) => ({
                                      ...prev,
                                      [item.id]: Math.max(
                                        (prev[item.id] || 0) - 1,
                                        0
                                      ),
                                    }))
                                  }
                                >
                                  −
                                </button>
                                <input
                                  type="text"
                                  className="form-control text-center p-0"
                                  style={{ width: "28px", height: "28px" }}
                                  value={quantities[item.id] || 0}
                                  readOnly
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    padding: "0",
                                  }}
                                  onClick={() => {
                                    const currentTotal =
                                      calculateTotalParticipants();
                                    const maxSize = tour.maxQuantity || 10;
                                    if (currentTotal < maxSize) {
                                      setQuantities((prev) => ({
                                        ...prev,
                                        [item.id]: (prev[item.id] || 0) + 1,
                                      }));
                                    } else {
                                      alert(
                                        `Đã đạt số lượng tối đa ${maxSize} người`
                                      );
                                    }
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center fw-bold">
                            <span>Tổng cộng:</span>
                            <span className="text-primary fs-5">
                              {new Intl.NumberFormat('vi-VN').format(calculateTotalPrice())} VNĐ
                            </span>
                          </div>
                        </div>

                        <div className="d-grid">
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={processing || calculateTotalPrice() === 0}
                          >
                            {processing ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                                Đang xử lý...
                              </>
                            ) : (
                              "Đặt Ngay"
                            )}
                          </button>
                        </div>

                        {!isAuthenticated && (
                          <div className="alert alert-info mt-3 mb-0 p-2 small">
                            Bạn cần đăng nhập để hoàn tất đặt tour.
                          </div>
                        )}
                      </form>
                    ) : (
                      <div className="alert alert-warning mb-0">
                        Không có thông tin giá cho tour này.
                      </div>
                    )}
                  </div>
                </div>

                {/* Tour Info Card */}
                <div
                  className="card shadow-sm"
                  style={{ position: "relative", zIndex: 1 }}
                >
                  <div className="card-header bg-light">
                    <h3 className="h6 mb-0">Thông Tin Tour</h3>
                  </div>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      <span>Ngày bắt đầu</span>
                      <span className="text-muted">
                        {formatDate(tour.startDate)}
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      <span>Ngày kết thúc</span>
                      <span className="text-muted">
                        {formatDate(tour.endDate)}
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      <span>Số người</span>
                      <span className="text-muted">
                        Tối đa {tour.maxQuantity || "Chưa rõ"}
                      </span>
                    </li>
                    {tour.tourPrices && tour.tourPrices.length > 0 && (
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        <span>Giá từ</span>
                        <span className="text-primary fw-bold">
                          {new Intl.NumberFormat('vi-VN').format(Math.min(...tour.tourPrices.map((price) => price.price)))} VNĐ
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Map: show tour location by address/destinations */}
                <div className="card shadow-sm">
                  <div className="card-header bg-light d-flex align-items-center justify-content-between">
                    <h3 className="h6 mb-0">
                      <i className="fas fa-map-marker-alt me-2"></i>Vị trí
                    </h3>
                  </div>
                  <div className="card-body">
                    {(() => {
                      // Prefer explicit address/location-like fields
                      const addressCandidates = [];
                      if (tour.address) addressCandidates.push(tour.address);
                      if (tour.location) addressCandidates.push(tour.location);
                      if (Array.isArray(tour.destinations) && tour.destinations.length > 0) {
                        addressCandidates.push(tour.destinations.join(", "));
                      }
                      // Fallback to tour name (last resort)
                      addressCandidates.push(tour.name);

                      const address = addressCandidates.find(
                        (s) => typeof s === "string" && s.trim().length > 0
                      );

                      return (
                        <>
                          <p className="text-muted mb-2" style={{ whiteSpace: "pre-line" }}>
                            {address || "Không có địa chỉ cụ thể"}
                          </p>
                          {address ? (
                            <GoogleMapEmbed address={address} height={260} />
                          ) : (
                            <div className="alert alert-info mb-0">
                              <i className="fas fa-info-circle me-2"></i>
                              Chưa có thông tin địa chỉ để hiển thị bản đồ.
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {/* Add favorite button */}
                <button
                  className={`btn ${
                    isFavorite ? "btn-danger" : "btn-outline-danger"
                  } w-100 mb-3`}
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                >
                  {favoriteLoading ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : (
                    <>
                      <i
                        className={`fas fa-heart ${isFavorite ? "fas" : "far"}`}
                      ></i>{" "}
                      {isFavorite
                        ? "Xóa khỏi danh sách yêu thích"
                        : "Thêm vào danh sách yêu thích"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TourDetailPage;
