/**
 * Database Service Layer
 * Provides easy access to DAMAC data from MongoDB
 */

import {
  Project,
  Cluster,
  Property,
  Amenity,
  Pricing,
  Location,
} from './schemas.js';

// ============================================
// PROJECT SERVICES
// ============================================

async function getProjectInfo() {
  return await Project.findOne({ name: 'DAMAC Hills 2' });
}

async function getProjectStats() {
  const project = await getProjectInfo();
  if (!project) return null;
  
  const clusterCount = await Cluster.countDocuments({ projectId: project._id });
  const amenityCount = await Amenity.countDocuments();
  
  return {
    name: project.name,
    totalUnits: project.totalUnits,
    totalClusters: clusterCount,
    location: project.location,
    developer: project.developer,
    amenities: amenityCount,
  };
}

// ============================================
// CLUSTER SERVICES
// ============================================

async function getAllClusters() {
  return await Cluster.find().sort({ name: 1 });
}

async function getClusterById(clusterId) {
  return await Cluster.findById(clusterId);
}

async function getClusterByName(clusterName) {
  return await Cluster.findOne({ 
    name: new RegExp(clusterName, 'i') 
  });
}

async function getClustersByUnitType(unitType) {
  return await Cluster.find({ 
    unitTypes: unitType 
  });
}

async function getClustersByAmenity(amenity) {
  return await Cluster.find({ 
    amenities: new RegExp(amenity, 'i') 
  });
}

// ============================================
// PROPERTY SERVICES
// ============================================

async function getPropertiesByBedroom(bedrooms) {
  return await Property.find({ bedrooms: bedrooms })
    .sort({ 'price.aed': 1 })
    .limit(50);
}

async function getPropertiesByType(propertyType) {
  return await Property.find({ propertyType: propertyType })
    .sort({ 'price.aed': 1 })
    .limit(50);
}

async function getPropertiesByPriceRange(minPrice, maxPrice) {
  return await Property.find({
    'price.aed': { $gte: minPrice, $lte: maxPrice }
  }).sort({ 'price.aed': 1 });
}

async function getAvailableProperties() {
  return await Property.find({ status: 'Available' })
    .sort({ 'price.aed': 1 })
    .limit(100);
}

async function getPropertiesByCluster(clusterId) {
  return await Property.find({ clusterId: clusterId })
    .sort({ unitNumber: 1 });
}

async function searchProperties(filters = {}) {
  const query = {};
  
  if (filters.bedrooms) query.bedrooms = filters.bedrooms;
  if (filters.propertyType) query.propertyType = filters.propertyType;
  if (filters.minPrice || filters.maxPrice) {
    query['price.aed'] = {};
    if (filters.minPrice) query['price.aed'].$gte = filters.minPrice;
    if (filters.maxPrice) query['price.aed'].$lte = filters.maxPrice;
  }
  if (filters.status) query.status = filters.status;
  if (filters.clusterId) query.clusterId = filters.clusterId;
  
  return await Property.find(query)
    .sort({ 'price.aed': 1 })
    .limit(filters.limit || 50);
}

// ============================================
// PRICING SERVICES
// ============================================

async function getPricingForBedroom(bedroomType, propertyType = 'Apartment') {
  return await Pricing.findOne({
    bedroomType: bedroomType,
    propertyType: propertyType
  });
}

async function getAllPricing() {
  return await Pricing.find().sort({ propertyType: 1, bedroomType: 1 });
}

async function getPricingByPropertyType(propertyType) {
  return await Pricing.find({ propertyType: propertyType });
}

async function getPriceRange(propertyType = null) {
  const query = propertyType ? { propertyType } : {};
  const results = await Pricing.find(query);
  
  if (results.length === 0) return null;
  
  const prices = results.map(r => r.avgPrice?.aed || 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(prices.reduce((a, b) => a + b) / prices.length),
  };
}

// ============================================
// AMENITY SERVICES
// ============================================

async function getAllAmenities() {
  return await Amenity.find().sort({ category: 1, name: 1 });
}

async function getAmenitiesByCategory(category) {
  return await Amenity.find({ category: category }).sort({ name: 1 });
}

async function searchAmenities(query) {
  return await Amenity.find({
    name: new RegExp(query, 'i')
  });
}

async function getAmenitiesSummary() {
  const result = await Amenity.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        amenities: { $push: '$name' }
      }
    },
    { $sort: { category: 1 } }
  ]);
  
  return result;
}

// ============================================
// LOCATION SERVICES
// ============================================

async function getSchoolsNearby(limit = 10) {
  return await Location.find({ category: 'School' })
    .sort({ 'distance.km': 1 })
    .limit(limit);
}

async function getHospitalsNearby(limit = 10) {
  return await Location.find({ category: 'Hospital' })
    .sort({ 'distance.km': 1 })
    .limit(limit);
}

async function getShoppingNearby(limit = 10) {
  return await Location.find({ category: 'Shopping' })
    .sort({ 'distance.km': 1 })
    .limit(limit);
}

async function getLocationsByCategory(category) {
  return await Location.find({ category: category })
    .sort({ 'distance.km': 1 });
}

async function searchLocations(query) {
  return await Location.find({
    $or: [
      { name: new RegExp(query, 'i') },
      { category: new RegExp(query, 'i') }
    ]
  }).sort({ 'distance.km': 1 });
}

// ============================================
// ANALYTICS & REPORTING
// ============================================

async function getPropertyStats() {
  const stats = await Property.aggregate([
    {
      $group: {
        _id: '$propertyType',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price.aed' },
        minPrice: { $min: '$price.aed' },
        maxPrice: { $max: '$price.aed' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return stats;
}

async function getPropertyDistributionByBedroom() {
  return await Property.aggregate([
    {
      $group: {
        _id: '$bedrooms',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price.aed' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
}

async function getPropertyDistributionByCluster() {
  return await Property.aggregate([
    {
      $group: {
        _id: '$clusterName',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price.aed' }
      }
    },
    { $sort: { count: -1 } }
  ]);
}

async function getPriceStatistics() {
  const stats = await Property.aggregate([
    {
      $group: {
        _id: '$propertyType',
        avgPrice: { $avg: '$price.aed' },
        medianPrice: { $avg: '$price.aed' }, // Approximate
        pricePerSqm: { $avg: { $divide: ['$price.aed', '$size.sqm'] } }
      }
    }
  ]);
  
  return stats;
}

// ============================================
// COMPARISON SERVICES
// ============================================

async function comparePrices(bedrooms1, bedrooms2) {
  const [price1, price2] = await Promise.all([
    getPricingForBedroom(bedrooms1),
    getPricingForBedroom(bedrooms2)
  ]);
  
  return {
    bedrooms1,
    bedrooms2,
    price1: price1?.avgPrice?.aed,
    price2: price2?.avgPrice?.aed,
    difference: Math.abs((price1?.avgPrice?.aed || 0) - (price2?.avgPrice?.aed || 0)),
    percentageDifference: price1 && price2 ? 
      Math.round(((price1.avgPrice.aed - price2.avgPrice.aed) / price2.avgPrice.aed) * 100) : 0
  };
}

async function comparePropertyTypes() {
  const pricing = await getAllPricing();
  const grouped = {};
  
  pricing.forEach(p => {
    if (!grouped[p.propertyType]) {
      grouped[p.propertyType] = [];
    }
    grouped[p.propertyType].push({
      bedrooms: p.bedroomType,
      avgPrice: p.avgPrice?.aed
    });
  });
  
  return grouped;
}

// ============================================
// FILTERS & SORTING
// ============================================

async function getPropertiesWithFilters(filters = {}, options = {}) {
  const {
    bedrooms,
    propertyType,
    minPrice,
    maxPrice,
    cluster,
    status = 'Available'
  } = filters;
  
  const {
    sortBy = 'price',
    sortOrder = 1,
    limit = 50,
    skip = 0
  } = options;
  
  const query = { status };
  
  if (bedrooms) query.bedrooms = parseInt(bedrooms);
  if (propertyType) query.propertyType = propertyType;
  if (minPrice || maxPrice) {
    query['price.aed'] = {};
    if (minPrice) query['price.aed'].$gte = parseInt(minPrice);
    if (maxPrice) query['price.aed'].$lte = parseInt(maxPrice);
  }
  if (cluster) query.clusterId = cluster;
  
  const sortObj = {};
  if (sortBy === 'price') {
    sortObj['price.aed'] = sortOrder;
  } else if (sortBy === 'size') {
    sortObj['size.sqm'] = sortOrder;
  } else {
    sortObj[sortBy] = sortOrder;
  }
  
  const [data, total] = await Promise.all([
    Property.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Property.countDocuments(query)
  ]);
  
  return {
    data,
    total,
    limit,
    skip,
    pages: Math.ceil(total / limit)
  };
}

// ============================================
// EXPORT ALL SERVICES
// ============================================

export {
  // Project
  getProjectInfo,
  getProjectStats,
  
  // Cluster
  getAllClusters,
  getClusterById,
  getClusterByName,
  getClustersByUnitType,
  getClustersByAmenity,
  
  // Property
  getPropertiesByBedroom,
  getPropertiesByType,
  getPropertiesByPriceRange,
  getAvailableProperties,
  getPropertiesByCluster,
  searchProperties,
  getPropertiesWithFilters,
  
  // Pricing
  getPricingForBedroom,
  getAllPricing,
  getPricingByPropertyType,
  getPriceRange,
  
  // Amenity
  getAllAmenities,
  getAmenitiesByCategory,
  searchAmenities,
  getAmenitiesSummary,
  
  // Location
  getSchoolsNearby,
  getHospitalsNearby,
  getShoppingNearby,
  getLocationsByCategory,
  searchLocations,
  
  // Analytics
  getPropertyStats,
  getPropertyDistributionByBedroom,
  getPropertyDistributionByCluster,
  getPriceStatistics,
  
  // Comparison
  comparePrices,
  comparePropertyTypes,
};
