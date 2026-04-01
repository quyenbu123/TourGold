import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { favoriteService } from "../services/favoriteService";
import { useAuth } from "../context/AuthContext";

const FavoritePage = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (price) =>
    `${new Intl.NumberFormat('vi-VN').format(price || 0)} VNĐ`;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadFavorites();
  }, [user, navigate]);

  const loadFavorites = async () => {
    try {
      const data = await favoriteService.getUserFavorites(user.id);
      setFavorites(data);
    } catch (error) {
      console.error("Failed to load favorites");
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (tourId) => {
    try {
      await favoriteService.removeFromFavorites(user.id, tourId);
      setFavorites(favorites.filter((fav) => fav.tourId !== tourId));
      console.log("Removed from favorites");
    } catch (error) {
      console.error("Failed to remove from favorites");
      console.error("Error removing favorite:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      {" "}
      <h2 className="mb-4">Tour Yêu Thích Của Tôi</h2>
      {favorites.length === 0 ? (
        <div className="text-center py-5">
          <h4>Chưa có tour yêu thích nào</h4>
          <p>Bắt đầu thêm tour vào danh sách yêu thích để xem chúng ở đây!</p>
        </div>
      ) : (
        <div className="row">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <img
                  src={favorite.tourImageUrl || "/placeholder.jpg"}
                  className="card-img-top"
                  alt={favorite.tourName}
                  style={{ height: "200px", objectFit: "cover" }}
                />
                <div className="card-body">
                  <h5 className="card-title">{favorite.tourName}</h5>
                  <p className="card-text text-muted">
                    {favorite.tourDescription?.substring(0, 100)}...
                  </p>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-primary fw-bold">
                      {formatPrice(favorite.tourPrice)}
                    </span>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleRemoveFavorite(favorite.tourId)}
                    >
                      {" "}
                      <i className="fas fa-heart-broken"></i> Xóa
                    </button>
                  </div>
                </div>
                <div className="card-footer bg-transparent">
                  <button
                    className="btn btn-primary w-100"
                    onClick={() => navigate(`/tours/${favorite.tourId}`)}
                  >
                    {" "}
                    Xem Chi Tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritePage;
