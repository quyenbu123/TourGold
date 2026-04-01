/**
 * Mock API Service - cung cấp dữ liệu giả khi ứng dụng chạy ở chế độ demo
 */

/**
 * Tạo dữ liệu tour mẫu
 * @param {number} id - ID của tour
 * @returns {Object} Đối tượng tour mẫu
 */
const createMockTour = (id) => {
  const destinations = [
    { name: "Đà Lạt", desc: "Thành phố ngàn hoa" },
    { name: "Nha Trang", desc: "Thiên đường biển" },
    { name: "Hạ Long", desc: "Kỳ quan thiên nhiên" },
    { name: "Hội An", desc: "Phố cổ lãng mạn" },
    { name: "Sapa", desc: "Thị trấn trong sương" },
    { name: "Đà Nẵng", desc: "Thành phố đáng sống" },
    { name: "Phú Quốc", desc: "Đảo ngọc" },
    { name: "Huế", desc: "Cố đô lịch sử" }
  ];
  
  const destination = destinations[id % destinations.length];
  
  return {
    id: id,
    name: `${destination.name} - ${destination.desc}`,
    description: `Khám phá ${destination.name} - ${destination.desc} với các điểm tham quan nổi tiếng và ẩm thực đặc sắc.`,
    startDate: new Date(Date.now() + (7 + id) * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + (10 + id) * 24 * 60 * 60 * 1000).toISOString(),
    maxQuantity: 15 + (id % 10),
    approvalStatus: ["PENDING", "APPROVED", "REJECTED"][id % 3],
    typeOfTourEntities: [
      { id: 1, name: "City Tour" },
      { id: 2 + (id % 5), name: ["Beach", "Mountain", "Cultural", "Nature", "Historical"][id % 5] }
    ],
    tourPrices: [
      { id: id * 2 - 1, name: "Standard Package", price: 1500000 + (id * 100000), description: "Gói tiêu chuẩn" },
      { id: id * 2, name: "Premium Package", price: 2500000 + (id * 150000), description: "Gói cao cấp" }
    ],
    services: [
      { id: id * 3 - 2, name: "Đưa đón sân bay", description: "Dịch vụ đưa đón tận nơi", price: 300000 },
      { id: id * 3 - 1, name: "Hướng dẫn viên", description: "Hướng dẫn viên chuyên nghiệp", price: 500000 },
      { id: id * 3, name: "Ăn uống", description: "Các bữa ăn theo lịch trình", price: 0 }
    ],
    itineraries: [
      { id: id * 3 - 2, date_time: new Date(Date.now() + (7 + id) * 24 * 60 * 60 * 1000).toISOString(), itinerary: "Nhận phòng khách sạn và nghỉ ngơi" },
      { id: id * 3 - 1, date_time: new Date(Date.now() + (8 + id) * 24 * 60 * 60 * 1000).toISOString(), itinerary: "Tham quan các địa điểm du lịch" },
      { id: id * 3, date_time: new Date(Date.now() + (9 + id) * 24 * 60 * 60 * 1000).toISOString(), itinerary: "Trải nghiệm ẩm thực địa phương" }
    ],
    images: [
      { id: id * 3 - 2, url: `https://picsum.photos/800/600?random=${id*3-2}` },
      { id: id * 3 - 1, url: `https://picsum.photos/800/600?random=${id*3-1}` },
      { id: id * 3, url: `https://picsum.photos/800/600?random=${id*3}` }
    ]
  };
};

/**
 * Mock Service API
 */
const mockApiService = {
  /**
   * Get all tours
   * @returns {Array} Array of mock tours
   */
  getAllTours: () => {
    return Array.from({ length: 8 }, (_, i) => createMockTour(i + 1));
  },
  
  /**
   * Get tour by ID
   * @param {number} id - Tour ID
   * @returns {Object} Mock tour
   */
  getTourById: (id) => {
    return createMockTour(parseInt(id));
  },
  
  /**
   * Get tour types
   * @returns {Array} Array of tour types
   */
  getTourTypes: () => {
    return [
      { id: 1, name: "City Tour" },
      { id: 2, name: "Beach" },
      { id: 3, name: "Mountain" },
      { id: 4, name: "Cultural" },
      { id: 5, name: "Nature" },
      { id: 6, name: "Historical" },
      { id: 7, name: "Adventure" }
    ];
  },
  
  /**
   * Get service types
   * @returns {Array} Array of service types
   */
  getServiceTypes: () => {
    return [
      { id: 1, name: "Transportation", description: "Dịch vụ vận chuyển" },
      { id: 2, name: "Accommodation", description: "Dịch vụ lưu trú" },
      { id: 3, name: "Food & Beverage", description: "Dịch vụ ăn uống" },
      { id: 4, name: "Guide", description: "Hướng dẫn viên" },
      { id: 5, name: "Insurance", description: "Bảo hiểm du lịch" }
    ];
  }
};

export default mockApiService; 