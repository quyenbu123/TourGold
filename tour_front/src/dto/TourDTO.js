/**
 * Data Transfer Object for Tour
 * Ensures tour data is formatted correctly for API
 */
class TourDTO {
  constructor(data = {}) {
    // Basic information
    this.id = data.id;
    this.name = data.name || '';
    this.description = data.description || '';
    this.maxQuantity = data.maxQuantity ? parseInt(data.maxQuantity) : 0;
    this.approvalStatus = data.approvalStatus || 'PENDING';
    
    // Dates
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    
    // Related objects
    this.typeOfTourIds = data.typeOfTourIds || [];
    this.tourPrices = data.tourPrices || [];
    this.services = data.services || [];
    this.itineraries = data.itineraries || [];
    this.itineraryStrings = data.itineraryStrings || [];
    
    // Control flags for API
    this.clearAllPrices = true;
    this.clearAllServices = true;
  }
}

export default TourDTO; 