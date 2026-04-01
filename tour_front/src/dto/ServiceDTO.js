/**
 * Data Transfer Object for Service
 * Ensures service data is formatted correctly for API
 */
class ServiceDTO {
  constructor(name, description, price, available, typeOfTourId) {
    this.name = name || '';
    this.description = description || '';
    this.price = typeof price === 'string' ? parseFloat(price) : (price || 0);
    this.available = available === undefined ? true : !!available;
    this.typeOfTourId = typeOfTourId ? parseInt(typeOfTourId) : null;
  }
  
  /**
   * Create from service object
   * @param {Object} service - Service object from UI
   * @returns {ServiceDTO} Formatted service DTO
   */
  static fromService(service) {
    if (!service) return null;
    
    const typeId = service.typeOfTourId || service.typeOfServiceId;
    
    return new ServiceDTO(
      service.name,
      service.description,
      service.price,
      service.available,
      typeId
    );
  }
}

export default ServiceDTO; 