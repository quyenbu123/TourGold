import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tourService from '../services/tourService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import authService from '../services/authService';

/**
 * HomePage Component
 * Minimalist landing page showcasing featured tours and destinations
 */
const HomePage = () => {
  // Debug + image URL helpers (kept local to avoid cross-file changes)
  const DEBUG_IMAGES = true;
  const FALLBACK_IMG = 'https://via.placeholder.com/600x400?text=Khong+Co+Anh';
  const DEFAULT_CARD_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
  const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://localhost:8080';
  const isAbsoluteUrl = (u) => typeof u === 'string' && /^(https?:|data:|blob:)/i.test(u);
  const normalizeUrl = (u) => {
    if (!u || typeof u !== 'string') return '';
    if (isAbsoluteUrl(u)) return u;
    const trimmed = u.trim();
    if (trimmed.startsWith('/')) return API_BASE.replace(/\/$/, '') + trimmed;
    return API_BASE.replace(/\/$/, '') + '/' + trimmed.replace(/^\//, '');
  };

  const [featuredTours, setFeaturedTours] = useState([]);
  const [topDestinations, setTopDestinations] = useState([
    { id: 1, name: 'Paris', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', count: 12 },
    { id: 2, name: 'Santorini', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', count: 8 },
    { id: 3, name: 'Tokyo', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', count: 15 },
    { id: 4, name: 'Bali', image: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', count: 10 },
  ]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recError, setRecError] = useState(null);
  const [recommendedTours, setRecommendedTours] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);

  const heroSlides = [    {
      image: "https://images.unsplash.com/photo-1682687982167-d7fb3ed8541d?auto=format&fit=crop&q=80&w=2071&ixlib=rb-4.0.3",
      title: "Khám Phá Hành Trình Hoàn Hảo",
      subtitle: "Khám phá những điểm đến tuyệt đẹp và những trải nghiệm khó quên với các tour được thiết kế tỉ mỉ."
    },
    {
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Du Lịch Không Giới Hạn",
      subtitle: "Đắm mình trong những trải nghiệm chân thực sẽ thay đổi cách bạn nhìn nhận thế giới."
    },
    {
      image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Cuộc Phiêu Lưu Đang Chờ Đợi",
      subtitle: "Từ bãi biển nhiệt đới đến đỉnh núi cao, hãy tìm cuộc phiêu lưu tiếp theo của bạn."
    }
  ];

  useEffect(() => {
    // Auto advance hero slides every 6 seconds
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    
    return () => clearInterval(slideInterval);
  }, [heroSlides.length]);

  useEffect(() => {
  const fetchTours = async () => {
      try {
        setLoading(true);
        
        // First try to get featured tour IDs
        let toursToDisplay = [];
        
        try {
          const featuredTourIds = await tourService.getFeaturedTourIds();
          if (DEBUG_IMAGES) console.log('[Home] featured IDs:', featuredTourIds);

          if (featuredTourIds && featuredTourIds.length > 0) {
            console.log('Using featured tour IDs:', featuredTourIds);
            // Prefer fetching real tours by IDs from backend
            let realFeatured = [];
            try {
              realFeatured = await tourService.getToursByIds(featuredTourIds);
              if (DEBUG_IMAGES) console.debug('[Home] realFeatured tours length:', realFeatured.length);
            } catch (e) {
              console.warn('[Home] getToursByIds failed, will fallback', e);
            }
            if (realFeatured && realFeatured.length) {
              toursToDisplay = realFeatured;
            } else {
              // Fallback: get all tours (summary) and filter by IDs
              const allTours = await tourService.getAllTours();
              if (DEBUG_IMAGES) console.debug('[Home] allTours fetched:', Array.isArray(allTours) ? allTours.length : 0);
              toursToDisplay = (allTours || []).filter(tour => featuredTourIds.includes(tour.id));
            }
          }
        } catch (featuredError) {
          console.error('Error with featured tours, falling back to all tours:', featuredError);
        }
        
        // If no featured tours were found, fall back to regular tours
        if (!toursToDisplay.length) {
          console.log('No featured tours found, using top tours instead');
          toursToDisplay = await tourService.getTopTours(6);
        }
        if (DEBUG_IMAGES) console.log('[Home] toursToDisplay count:', toursToDisplay.length);
        
        // Process tours to enhance display data
        const processedTours = toursToDisplay.map(tour => {
          const candidate = tour.mainImageUrl || tour.imageUrl || (tour.images && tour.images.length > 0 ? tour.images[0].url : null);
          if (DEBUG_IMAGES) console.log('[Home] tour', tour.id, 'raw main image:', candidate, '| absolute:', isAbsoluteUrl(candidate));
          return ({
            ...tour,
            startingPrice: tour.tourPrices && tour.tourPrices.length > 0 
              ? Math.min(...tour.tourPrices.map(price => price.price))
              : null,
            mainImage: candidate ? normalizeUrl(candidate) : DEFAULT_CARD_IMAGE
          });
        });
        
        setFeaturedTours(processedTours);
        if (DEBUG_IMAGES) console.log('[Home] processedTours preview:', processedTours.slice(0, 5).map(t => ({ id: t.id, mainImage: t.mainImage })));

        // Enrich missing images by fetching tour images for a limited subset
        const toEnrich = processedTours.filter(t => !t.mainImage || t.mainImage === DEFAULT_CARD_IMAGE).slice(0, 12);
        if (toEnrich.length) {
          if (DEBUG_IMAGES) console.log('[Home] enriching images for', toEnrich.map(t => t.id));
          try {
            await Promise.all(toEnrich.map(async (t) => {
              try {
                const imgs = await tourService.getTourImages(t.id);
                const first = Array.isArray(imgs) && imgs.length ? imgs[0].url : null;
                if (first) {
                  const abs = normalizeUrl(first);
                  if (DEBUG_IMAGES) console.log('[Home] enriched image for', t.id, '->', abs);
                  setFeaturedTours(prev => prev.map(p => p.id === t.id ? { ...p, mainImage: abs } : p));
                } else if (DEBUG_IMAGES) {
                  console.log('[Home] no images found for', t.id);
                }
              } catch (e) {
                console.warn('[Home] error fetching images for', t.id, e);
              }
            }));
          } catch (e) {
            console.warn('[Home] enrich step failed:', e);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tours:', err);
        setError('Không thể tải danh sách tour. Vui lòng thử lại sau.');
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  // Load recommendations for authenticated users
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!authService.isAuthenticated()) {
        setRecommendedTours([]);
        return;
      }
      try {
        setRecLoading(true);
        console.debug('[Home] fetching recommendations...');
        const recs = await tourService.getRecommendations(8);
        console.debug('[Home] recommendations raw:', recs);
        const processed = (recs || []).map(tour => {
          const candidate = tour.mainImageUrl || tour.imageUrl || (tour.images && tour.images.length > 0 ? tour.images[0].url : null);
          return ({
            ...tour,
            startingPrice: tour.tourPrices && tour.tourPrices.length > 0
              ? Math.min(...tour.tourPrices.map(price => price.price))
              : null,
            mainImage: candidate ? normalizeUrl(candidate) : DEFAULT_CARD_IMAGE
          });
        });
        setRecommendedTours(processed);
        setRecLoading(false);
      } catch (e) {
        console.warn('Error loading recommendations:', e);
        setRecError('Không thể tải gợi ý lúc này.');
        setRecLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Linh hoạt';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `Ngày ${day} tháng ${month} năm ${year}`;
  };

  return (
    <div className="home-page">
      {/* Hero Section with Slider */}
      <section className="hero-section position-relative" style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${heroSlides[activeSlide].image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 1s ease-in-out'
      }}>
        <div className="container">
          <div className="row">
            <div className="col-lg-7 hero-content">
              <h1>{heroSlides[activeSlide].title}</h1>
              <p className="lead">{heroSlides[activeSlide].subtitle}</p>
              <div className="d-flex flex-wrap gap-3 mt-4">
                <Link to="/tours" className="btn btn-primary">
                  Khám Phá Ngay
                </Link>
                {!authService.isAuthenticated() && (
                  <Link to="/register" className="btn btn-outline-light">
                    Đăng Ký
                  </Link>
                )}
              </div>
              
              {/* Slider indicators */}
              <div className="hero-slider-indicators d-flex mt-5">
                {heroSlides.map((_, index) => (
                  <button 
                    key={index}
                    className={`slider-indicator ${index === activeSlide ? 'active' : ''}`}
                    onClick={() => setActiveSlide(index)}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: index === activeSlide ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)',
                      border: 'none',
                      margin: '0 4px',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="search-box" style={{ marginTop: '-60px' }}>
                <form className="row g-3">
                  <div className="col-md-4">
                    <label>Điểm đến</label>
                    <input type="text" className="form-control" placeholder="Nhập điểm đến..." />
                  </div>
                  <div className="col-md-3">
                    <label>Ngày đi</label>
                    <input type="date" className="form-control" />
                  </div>
                  <div className="col-md-3">
                    <label>Số người</label>
                    <select className="form-select">
                      <option value="1">1 người</option>
                      <option value="2">2 người</option>
                      <option value="3">3 người</option>
                      <option value="4">4+ người</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="d-block" style={{ visibility: 'hidden' }}>Search</label>
                    <label className="d-block" style={{ visibility: 'hidden' }}>Tìm kiếm</label>
                    <Link to="/tours" className="btn btn-primary w-100">
                      Tìm Kiếm
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tours Section */}
      <section className="py-5">
        <div className="container py-3">
          <div className="row mb-4">
            <div className="col-md-8">
              <h2 className="mb-2">Tour Nổi Bật</h2>
              <p className="text-muted">Khám phá những trải nghiệm tuyệt vời được chọn lọc kỹ lưỡng</p>
            </div>
            <div className="col-md-4 text-md-end align-self-end">
              <Link to="/tours" className="btn btn-outline-primary">
                Xem Tất Cả
              </Link>
            </div>
          </div>

            {loading ? (
            <LoadingSpinner message="Đang tải tour nổi bật..." />
            ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <div className="row g-4">
              {featuredTours.map(tour => (
                <div key={tour.id} className="col-md-6 col-lg-4">
                  <div className="tour-card">
                    <div className="tour-card-img-container">
                      <img 
                        src={tour.mainImage} 
                        alt={tour.name}
                        className="tour-card-img"
                        onLoad={(e) => { if (DEBUG_IMAGES) console.log('[Home] image loaded', tour.id, e.target.src); }}
                        onError={(e) => { console.warn('[Home] image failed', tour.id, e.target.src); e.currentTarget.src = FALLBACK_IMG; }}
                      />
                      {tour.tourPrices && tour.tourPrices.length > 1 && (
                        <div className="tour-card-badge">
                          Giảm 20%
                </div>
                      )}
                      {tour.startingPrice && (
                        <div className="tour-card-price-tag">
                          {new Intl.NumberFormat('vi-VN').format(tour.startingPrice)} VNĐ
                        </div>
                      )}
                    </div>
                    <div className="tour-card-body">
                      <div className="tour-card-rating">
                        <div className="stars">★★★★★</div>
                        <div className="score">9.3</div>
                        <div className="review-count">145</div>
                      </div>
                      <h3 className="tour-card-title">{tour.name}</h3>
                      <p className="tour-card-location">
                        <i className="fas fa-map-marker-alt"></i> {tour.location || 'Đa điểm'}
                      </p>
                      
                      <div className="tour-card-footer">
                        <div className="tour-card-duration">
                          <i className="far fa-calendar-alt me-1"></i> {formatDate(tour.startDate)}
                        </div>
                        <div className="tour-card-availability">
                          <i className="fas fa-users me-1"></i> {tour.maxQuantity ? tour.maxQuantity : 'Còn chỗ'}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <Link to={`/tours/${tour.id}`} className="btn btn-primary w-100">
                          Xem Chi Tiết
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recommended Tours Section (only if logged in and has data) */}
      {authService.isAuthenticated() && (
        <section className="py-5" style={{ backgroundColor: "#fafafa" }}>
          <div className="container py-3">
            <div className="row mb-4">
              <div className="col-md-8">
                <h2 className="mb-2">Gợi Ý Dành Cho Bạn</h2>
                <p className="text-muted">Dựa trên các tour bạn đã xem gần đây</p>
              </div>
            </div>

            {recLoading ? (
              <LoadingSpinner message="Đang tải gợi ý..." />
            ) : recError ? (
              <div className="alert alert-warning">{recError}</div>
            ) : recommendedTours.length === 0 ? (
              <div className="text-muted">Hiện chưa có gợi ý phù hợp. Hãy khám phá thêm các tour để nhận gợi ý chính xác hơn.</div>
            ) : (
              <div className="row g-4">
                {recommendedTours.map(tour => (
                  <div key={tour.id} className="col-md-6 col-lg-3">
                    <div className="tour-card">
                      <div className="tour-card-img-container">
                        <img
                          src={tour.mainImage}
                          alt={tour.name}
                          className="tour-card-img"
                          onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                        />
                        {tour.startingPrice && (
                          <div className="tour-card-price-tag">
                            {new Intl.NumberFormat('vi-VN').format(tour.startingPrice)} VNĐ
                          </div>
                        )}
                      </div>
                      <div className="tour-card-body">
                        <h3 className="tour-card-title">{tour.name}</h3>
                        <p className="tour-card-location">
                          <i className="fas fa-map-marker-alt"></i> {tour.location || 'Đa điểm'}
                        </p>
                        <div className="mt-3">
                          <Link to={`/tours/${tour.id}`} className="btn btn-outline-primary w-100">
                            Xem Chi Tiết
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Top Destinations Section */}
      <section className="py-5" style={{ backgroundColor: "var(--gray-100)" }}>
        <div className="container py-3">
          <div className="text-center mb-4">
            <h2 className="mb-2">Điểm Đến Hàng Đầu</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: '700px' }}>Khám phá những địa điểm được du khách yêu thích</p>
          </div>

          <div className="row g-4">
            {topDestinations.map((destination, index) => (
              <div key={destination.id} className="col-md-6 col-lg-3">
                <div className="destination-card h-100">
                  <img 
                    src={destination.image} 
                    alt={destination.name} 
                    className="img-fluid h-100 w-100"
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="destination-content">
                    <h3>{destination.name}</h3>
                    <p className="mb-0">{destination.count} Tour</p>
                  </div>
                  <div className="badge">Top {index + 1}</div>
                  <div className="badge">Hạng {index + 1}</div>
                  <Link to={`/tours?destination=${destination.name}`} className="stretched-link"></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-5 bg-white">
        <div className="container py-4">
          <div className="row mb-4">
            <div className="col-12 text-center">
              <h2 className="mb-2">Tại Sao Chọn Chúng Tôi</h2>
              <p className="text-muted mx-auto" style={{ maxWidth: '700px' }}>Trải nghiệm sự khác biệt với dịch vụ du lịch của chúng tôi</p>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="feature-box">
                <div className="feature-icon">
                  <i className="fas fa-map-marked-alt"></i>
                </div>
                <h4>Tour Thiết Kế Chuyên Nghiệp</h4>
                <p className="text-muted mb-0">Các tour được thiết kế bởi chuyên gia du lịch với kinh nghiệm phong phú.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-box">
                <div className="feature-icon">
                  <i className="fas fa-user-shield"></i>
                </div>
                <h4>An Toàn & Bảo Mật</h4>
                <p className="text-muted mb-0">Sự an toàn của bạn là ưu tiên hàng đầu với các tiêu chuẩn an toàn cao nhất.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-box">
                <div className="feature-icon">
                  <i className="fas fa-hand-holding-usd"></i>
                </div>
                <h4>Giá Trị Tốt Nhất</h4>
                <p className="text-muted mb-0">Tận dụng tối đa ngân sách du lịch của bạn với giá cả cạnh tranh.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5" style={{ 
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("https://images.unsplash.com/photo-1500835556837-99ac94a94552?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="container py-4 text-center text-white">
          <h2 className="mb-3">Sẵn Sàng Cho Cuộc Phiêu Lưu?</h2>
          <p className="mb-4">Tham gia cùng hàng ngàn du khách hài lòng đã trải nghiệm thế giới.</p>
          <Link to="/tours" className="btn btn-primary px-4 py-2">
            Khám Phá Tour
                </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;