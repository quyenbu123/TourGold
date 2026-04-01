import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import tourService from '../services/tourService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BACKEND_URL } from '../config/env';

// Debug helpers for image loading diagnostics
const DEBUG_IMAGES = true;
const FALLBACK_IMG = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
const DEFAULT_CARD_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
const API_BASE = BACKEND_URL;
const isAbsoluteUrl = (u) => typeof u === 'string' && /^(https?:|data:|blob:)/i.test(u);
const normalizeUrl = (u) => {
  if (!u || typeof u !== 'string') return '';
  if (isAbsoluteUrl(u)) return u;
  const trimmed = u.trim();
  if (trimmed.startsWith('/')) return API_BASE.replace(/\/$/, '') + trimmed;
  return API_BASE.replace(/\/$/, '') + '/' + trimmed.replace(/^\//, '');
};

/**
 * TourListPage Component
 * Displays a minimalist filterable list of available tours
 */
const TourListPage = () => {
  // Get search parameters from URL
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredTours, setFilteredTours] = useState([]);
  const [tourTypes, setTourTypes] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayCount, setDisplayCount] = useState(6);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    tourType: searchParams.get('tourType') || '',
    destination: searchParams.get('destination') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'newest'
  });

  const priceRanges = [
    { label: 'Tất cả giá', min: '', max: '' },
    { label: 'Dưới 100.000 VNĐ', min: '', max: '100000' },
    { label: '100.000 - 250.000 VNĐ', min: '100000', max: '250000' },
    { label: '250.000 - 500.000 VNĐ', min: '250000', max: '500000' },
    { label: 'Trên 500.000 VNĐ', min: '500000', max: '' }
  ];
  
  // Fetch tour data
  const fetchTours = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const toursData = await tourService.getAllTours();
      if (DEBUG_IMAGES) {
        console.log('[TourList] fetched tours:', Array.isArray(toursData) ? toursData.length : 0);
      }
      
      // Process tour data to enhance with additional information
      const processedTours = toursData.map(tour => {
        const candidate = tour.mainImageUrl || tour.imageUrl || (tour.images && tour.images.length > 0 ? tour.images[0].url : null);
        const rawUrl = candidate;
        if (DEBUG_IMAGES) {
          console.log('[TourList] tour', tour.id, 'raw main image:', rawUrl, '| absolute:', isAbsoluteUrl(rawUrl));
        }
        return ({
          ...tour,
          startingPrice: tour.tourPrices && tour.tourPrices.length > 0 
            ? Math.min(...tour.tourPrices.map(price => price.price))
            : null,
          mainImage: rawUrl 
            ? normalizeUrl(rawUrl)
            : DEFAULT_CARD_IMAGE
        });
      });
      
      setTours(processedTours);
      if (DEBUG_IMAGES) {
        const preview = processedTours.slice(0, 5).map(t => ({ id: t.id, mainImage: t.mainImage }));
        console.log('[TourList] processedTours preview (first 5):', preview);
      }

      // Enrich missing images by fetching tour images for a limited subset
      const toEnrich = processedTours.filter(t => !t.mainImage || t.mainImage === DEFAULT_CARD_IMAGE).slice(0, 12);
      if (toEnrich.length) {
        if (DEBUG_IMAGES) console.log('[TourList] enriching main images for', toEnrich.map(t => t.id));
        try {
          await Promise.all(toEnrich.map(async (t) => {
            try {
              const imgs = await tourService.getTourImages(t.id);
              const first = Array.isArray(imgs) && imgs.length ? imgs[0].url : null;
              if (first) {
                const abs = normalizeUrl(first);
                if (DEBUG_IMAGES) console.log('[TourList] enriched image for', t.id, '->', abs);
                setTours(prev => prev.map(p => p.id === t.id ? { ...p, mainImage: abs } : p));
              } else if (DEBUG_IMAGES) {
                console.log('[TourList] no images found for', t.id);
              }
            } catch (e) {
              console.warn('[TourList] error fetching images for', t.id, e);
            }
          }));
        } catch (e) {
          console.warn('[TourList] enrich step failed:', e);
        }
      }
      
      // Fetch tour types
      try {
        const typesData = await tourService.getTourTypes();
        setTourTypes(typesData);
      } catch (typeError) {
        console.error('Error fetching tour types:', typeError);
        // Set empty array as fallback
        setTourTypes([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError('Không thể tải danh sách tour. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchTours();
  }, []);
  
  // Update active filters when filters change
  useEffect(() => {
    const newActiveFilters = [];
    
    if (filters.search) {
      newActiveFilters.push({ 
        key: 'search',
        label: `Tìm kiếm: ${filters.search}` 
      });
    }
    
    if (filters.destination) {
      newActiveFilters.push({ 
        key: 'destination', 
        label: `Điểm đến: ${filters.destination}` 
      });
    }
    
    if (filters.tourType) {
      const typeObj = tourTypes.find(t => t.id.toString() === filters.tourType);
      newActiveFilters.push({ 
        key: 'tourType', 
        label: `Loại tour: ${typeObj ? typeObj.name : filters.tourType}` 
      });
    }
    
    if (filters.minPrice && filters.maxPrice) {
      newActiveFilters.push({ 
        key: 'price', 
        label: `Giá: ${filters.minPrice} VNĐ - ${filters.maxPrice} VNĐ` 
      });
    } else if (filters.minPrice) {
      newActiveFilters.push({ 
        key: 'minPrice', 
        label: `Giá từ: ${filters.minPrice} VNĐ` 
      });
    } else if (filters.maxPrice) {
      newActiveFilters.push({ 
        key: 'maxPrice', 
        label: `Giá đến: ${filters.maxPrice} VNĐ` 
      });
    }
    
    setActiveFilters(newActiveFilters);
  }, [filters, tourTypes]);
  
  // Apply filters whenever tours or filters change
  useEffect(() => {
    if (!tours.length) return;
    
    // Apply filters to tours
    let result = [...tours];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(tour => 
        tour.name.toLowerCase().includes(searchLower) || 
        (tour.description && tour.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Tour type filter
    if (filters.tourType) {
      result = result.filter(tour => 
        tour.typeOfTourEntities && 
        tour.typeOfTourEntities.some(type => 
          type.id === parseInt(filters.tourType) || 
          type.name.toLowerCase() === filters.tourType.toLowerCase()
        )
      );
    }
    
    // Destination filter
    if (filters.destination) {
      const destinationLower = filters.destination.toLowerCase();
      result = result.filter(tour => {
        // Check if tour has destination information
        if (tour.destinations && tour.destinations.length) {
          return tour.destinations.some(dest => 
            dest.toLowerCase().includes(destinationLower)
          );
        }
        // Fallback to description search for destination
        return tour.description && tour.description.toLowerCase().includes(destinationLower);
      });
    }
    
    // Price range filters
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      result = result.filter(tour => 
        tour.startingPrice && tour.startingPrice >= minPrice
      );
    }
    
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      result = result.filter(tour => 
        tour.startingPrice && tour.startingPrice <= maxPrice
      );
    }
    
    // Sort the results
    switch (filters.sortBy) {
      case 'lowest':
        result.sort((a, b) => (a.startingPrice || Infinity) - (b.startingPrice || Infinity));
        break;
      case 'highest':
        result.sort((a, b) => (b.startingPrice || 0) - (a.startingPrice || 0));
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
        break;
    }
    
    // Update filtered tours
    setFilteredTours(result);
    
    // Update URL with filters that are set
    const newParams = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) newParams[key] = value;
    });
    setSearchParams(newParams, { replace: true });
    
  }, [tours, filters, setSearchParams]);
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle price range selection
  const handlePriceRangeChange = (min, max) => {
    setFilters(prev => ({
      ...prev,
      minPrice: min,
      maxPrice: max
    }));
  };
  
  // Remove a single filter
  const handleRemoveFilter = (key) => {
    if (key === 'price') {
      setFilters(prev => ({
        ...prev,
        minPrice: '',
        maxPrice: ''
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [key]: ''
      }));
    }
  };
  
  // Handle reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      tourType: '',
      destination: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest'
    });
  };
  
  // Toggle view mode (grid/list)
  const toggleViewMode = (mode) => {
    setViewMode(mode);
  };
  
  // Toggle filters visibility on mobile
  const toggleFilters = () => {
    setFiltersVisible(prev => !prev);
  };
  
  // Load more tours
  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => prev + 6);
      setLoadingMore(false);
    }, 800);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Linh hoạt';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `Ngày ${day} tháng ${month} năm ${year}`;
  };
  
  // Get tour duration in days
  const getTourDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Linh hoạt';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1 ? '1 ngày' : `${diffDays} ngày`;
  };
  
  return (
    <div className="tour-list-page">
      {/* Header Banner */}
      <div style={{ 
        padding: '5rem 0 6rem',
        backgroundImage: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.8) 100%), url("https://images.unsplash.com/photo-1669130603807-6a7d3771538e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h1 className="text-white mb-2">Khám Phá Tour Du Lịch</h1>
              <p className="text-white">Khám phá những điểm đến tuyệt vời và trải nghiệm khó quên trên khắp thế giới</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container" style={{ marginTop: '-3rem' }}>
        {/* Search Bar */}
        <div className="search-box mb-4">
          <form className="row g-3" onSubmit={(e) => e.preventDefault()}>
            <div className="col-lg-5 col-md-6">
              <label>Tìm kiếm tour</label>
                      <input
                        type="text"
                        className="form-control"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                placeholder="Nhập từ khóa tìm kiếm..."
              />
            </div>
            <div className="col-lg-4 col-md-6">
              <label>Điểm đến</label>
              <input 
                type="text" 
                className="form-control" 
                name="destination"
                value={filters.destination}
                onChange={handleFilterChange}
                placeholder="Nhập điểm đến..."
              />
            </div>
            <div className="col-lg-3 col-md-12">
              <label style={{ visibility: "hidden" }}>Tìm kiếm</label>
              <button 
                type="button" 
                onClick={handleResetFilters}
                className="btn btn-outline-secondary w-100"
              >
                Đặt lại bộ lọc
                      </button>
                    </div>
          </form>
        </div>
        
        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="active-filters mb-4">
            {activeFilters.map((filter, index) => (
              <div key={index} className="filter-tag">
                {filter.label}
                <span 
                  className="close ms-2" 
                  onClick={() => handleRemoveFilter(filter.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="fas fa-times"></i>
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div className="row">
          {/* Filters sidebar */}
          <div className="col-lg-3 mb-4 mb-lg-0">
            <div className="d-lg-none mb-3">
              <button 
                className="btn btn-primary w-100"
                onClick={toggleFilters}
              >
                {filtersVisible ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              </button>
                  </div>
                  
            <div className={`filter-sidebar ${!filtersVisible ? 'd-none d-lg-block' : ''}`}>
              <h4>Bộ lọc</h4>
              
              {/* Tour Types Filter */}
                  <div className="mb-4">
                <label className="form-label">Loại Tour</label>
                    <select
                      className="form-select"
                      name="tourType"
                      value={filters.tourType}
                      onChange={handleFilterChange}
                    >
                  <option value="">Tất cả loại tour</option>
                  {tourTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  
              {/* Price Range Filter */}
              <div className="mb-4">
                <label className="form-label">Khoảng giá</label>
                {priceRanges.map((range, index) => (
                  <div className="form-check mb-2" key={index}>
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="priceRange" 
                      id={`priceRange${index}`}
                      checked={filters.minPrice === range.min && filters.maxPrice === range.max}
                      onChange={() => handlePriceRangeChange(range.min, range.max)}
                    />
                    <label className="form-check-label" htmlFor={`priceRange${index}`}>
                      {range.label}
                    </label>
                  </div>
                ))}
              </div>
              
              {/* Custom Price Range */}
                  <div className="mb-4">
                <label className="form-label">Tùy chỉnh khoảng giá</label>
                    <div className="row g-2">
                      <div className="col-6">
                        <input
                          type="number"
                      className="form-control form-control-sm" 
                      placeholder="Từ VNĐ" 
                          name="minPrice"
                          value={filters.minPrice}
                          onChange={handleFilterChange}
                          min="0"
                        />
                      </div>
                      <div className="col-6">
                        <input
                          type="number"
                      className="form-control form-control-sm" 
                      placeholder="Đến VNĐ" 
                          name="maxPrice"
                          value={filters.maxPrice}
                          onChange={handleFilterChange}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                  
              {/* Sort Order */}
                  <div className="mb-4">
                <label className="form-label">Sắp xếp theo</label>
                    <select
                      className="form-select"
                      name="sortBy"
                      value={filters.sortBy}
                      onChange={handleFilterChange}
                    >
                  <option value="newest">Mới nhất</option>
                  <option value="lowest">Giá: thấp đến cao</option>
                  <option value="highest">Giá: cao đến thấp</option>
                  <option value="name">Tên (A-Z)</option>
                    </select>
                  </div>
                  
              {/* View Mode */}
              <div className="mb-4">
                <label className="form-label">Chế độ hiển thị</label>
                <div className="btn-group w-100">
                  <button 
                    type="button" 
                    className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => toggleViewMode('grid')}
                  >
                    <i className="fas fa-th-large"></i>
                    </button>
                  <button 
                    type="button" 
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => toggleViewMode('list')}
                  >
                    <i className="fas fa-list"></i>
                    </button>
                  </div>
              </div>
            </div>
          </div>
          
          {/* Tour listings */}
          <div className="col-lg-9">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h5 mb-0">Tour Du Lịch</h2>
                {!loading && (
                  <p className="text-muted mb-0">Hiển thị {Math.min(displayCount, filteredTours.length)} / {filteredTours.length} tour</p>
                )}
              </div>
            </div>
            
            {loading ? (
              <LoadingSpinner message="Đang tải danh sách tour..." />
            ) : error ? (
              <div className="alert alert-danger" role="alert">
                    {error}
              </div>
            ) : filteredTours.length === 0 ? (
              <div className="text-center py-5">
                <h3 className="h5 mb-3">Không tìm thấy tour</h3>
                <p className="text-muted mb-4">Thử điều chỉnh tiêu chí tìm kiếm hoặc duyệt tất cả các tour hiện có.</p>
                <button className="btn btn-primary" onClick={handleResetFilters}>Xem tất cả tour</button>
              </div>
            ) : viewMode === 'grid' ? (
              <>
              <div className="row g-4">
                  {filteredTours.slice(0, displayCount).map(tour => (
                  <div key={tour.id} className="col-md-6 col-lg-4">
                      <div className="tour-card">
                        <div className="tour-card-img-container">
                          <img 
                            src={tour.mainImage} 
                            alt={tour.name}
                            className="tour-card-img"
                            onLoad={(e) => { if (DEBUG_IMAGES) console.log('[TourList] image loaded', tour.id, e.target.src); }}
                            onError={(e) => { console.warn('[TourList] image failed', tour.id, e.target.src); e.currentTarget.src = FALLBACK_IMG; }}
                          />
                          {tour.tourPrices && tour.tourPrices.length > 1 && (
                            <div className="tour-card-badge">
                              Giảm 15%
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
                            <div className="score">9.2</div>
                            <div className="review-count">124</div>
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
                              <i className="fas fa-clock me-1"></i> {getTourDuration(tour.startDate, tour.endDate)}
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
              </>
            ) : (
              <div className="tour-list">
                {filteredTours.slice(0, displayCount).map(tour => (
                  <div key={tour.id} className="tour-card mb-4" style={{ display: 'flex', flexDirection: 'row', height: 'auto' }}>
                    <div className="tour-card-img-container" style={{ width: '35%', height: 'auto', minHeight: '200px', maxHeight: '100%' }}>
                      <img 
                        src={tour.mainImage} 
                        alt={tour.name}
                        className="tour-card-img"
                        onLoad={(e) => { if (DEBUG_IMAGES) console.log('[TourList] image loaded', tour.id, e.target.src); }}
                        onError={(e) => { console.warn('[TourList] image failed', tour.id, e.target.src); e.currentTarget.src = FALLBACK_IMG; }}
                      />
                      {tour.tourPrices && tour.tourPrices.length > 1 && (
                        <div className="tour-card-badge">
                          Giảm 15%
                        </div>
                      )}
                    </div>
                    <div className="tour-card-body" style={{ width: '65%' }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h3 className="tour-card-title">{tour.name}</h3>
                          <p className="tour-card-location">
                            <i className="fas fa-map-marker-alt"></i> {tour.location || 'Đa điểm'}
                          </p>
                        </div>
                        <div className="tour-card-rating">
                          <div className="score">9.2</div>
                          <div className="stars">★★★★★</div>
                          </div>
                        </div>
                        
                      <p className="mb-3 text-muted">
                          {tour.description ? (
                          tour.description.length > 120 ? 
                            `${tour.description.substring(0, 120)}...` : 
                              tour.description
                        ) : 'Khám phá vẻ đẹp tuyệt vời của tour này với những trải nghiệm đáng nhớ.'}
                      </p>
                      
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        <span className="badge bg-light text-dark p-2">
                          <i className="far fa-calendar-alt me-1"></i> {formatDate(tour.startDate)}
                        </span>
                        <span className="badge bg-light text-dark p-2">
                          <i className="fas fa-clock me-1"></i> {getTourDuration(tour.startDate, tour.endDate)}
                        </span>
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="tour-card-price">
                          <span className="current-price">{new Intl.NumberFormat('vi-VN').format(tour.startingPrice || 0)} VNĐ</span>
                          <span className="price-unit">/ người</span>
                        </div>
                        <Link to={`/tours/${tour.id}`} className="btn btn-primary">
                          Xem Chi Tiết
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Load more button */}
            {filteredTours.length > displayCount && (
              <div className="text-center my-4">
                <button 
                  className="btn btn-outline-primary px-4" 
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Đang tải..." : "Xem thêm"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourListPage;
