/**
 * Property Routes - DAMAC Hills 2 API
 * Endpoints for managing properties
 */

import express from 'express';
import { PropertyService } from '../Database/index.js';

const router = express.Router();
const propertyService = new PropertyService();

/**
 * GET /api/properties
 * List all properties with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { 
      cluster, 
      bedrooms, 
      status, 
      minPrice, 
      maxPrice, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;

    // Build filter
    const filter = {};
    if (cluster) filter.cluster = cluster;
    if (bedrooms) filter.bedrooms = parseInt(bedrooms);
    if (status) filter.availabilityStatus = status;
    if (minPrice || maxPrice) {
      filter.estimatedValue = {};
      if (minPrice) filter.estimatedValue.$gte = parseInt(minPrice);
      if (maxPrice) filter.estimatedValue.$lte = parseInt(maxPrice);
    }
    if (search) {
      filter.$or = [
        { unitNumber: { $regex: search, $options: 'i' } },
        { buildingName: { $regex: search, $options: 'i' } }
      ];
    }

    // Get properties with pagination
    const skip = (page - 1) * limit;
    const properties = await propertyService.find(filter, { 
      skip, 
      limit,
      sort: { createdAt: -1 }
    });

    const total = await propertyService.count(filter);

    res.json({
      success: true,
      data: properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/properties/:id
 * Get a specific property by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const property = await propertyService.find({ _id: id });
    
    if (!property || property.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: property[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/properties
 * Create a new property
 */
router.post('/', async (req, res) => {
  try {
    const {
      unitNumber,
      buildingName,
      cluster,
      bedrooms,
      bathrooms,
      builtUpArea,
      parkingSpaces,
      furnishingStatus,
      availabilityStatus,
      occupancyStatus,
      estimatedValue,
      developer
    } = req.body;

    // Validate required fields
    if (!unitNumber || !buildingName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: unitNumber, buildingName',
        timestamp: new Date().toISOString()
      });
    }

    // Create property
    const property = await propertyService.create({
      unitNumber,
      buildingName,
      cluster,
      bedrooms: bedrooms || 0,
      bathrooms: bathrooms || 0,
      builtUpArea: builtUpArea || 0,
      parkingSpaces: parkingSpaces || 0,
      furnishingStatus: furnishingStatus || 'unfurnished',
      availabilityStatus: availabilityStatus || 'available_for_rent',
      occupancyStatus: occupancyStatus || 'vacant',
      estimatedValue: estimatedValue || 0,
      developer
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/properties/:id
 * Update a property
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.createdAt;

    const property = await propertyService.update(id, updates);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/properties/:id
 * Delete a property
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await propertyService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Property deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/properties/cluster/:clusterId
 * Get properties by cluster
 */
router.get('/cluster/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;

    const properties = await propertyService.findByCluster(clusterId);

    res.json({
      success: true,
      data: properties,
      count: properties.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/properties/developer/:developerId
 * Get properties by developer
 */
router.get('/developer/:developerId', async (req, res) => {
  try {
    const { developerId } = req.params;

    const properties = await propertyService.findByDeveloper(developerId);

    res.json({
      success: true,
      data: properties,
      count: properties.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/properties/:id/availability
 * Update property availability status
 */
router.put('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { availabilityStatus } = req.body;

    if (!availabilityStatus) {
      return res.status(400).json({
        success: false,
        error: 'availabilityStatus is required',
        timestamp: new Date().toISOString()
      });
    }

    const property = await propertyService.updateAvailability(id, availabilityStatus);

    res.json({
      success: true,
      message: 'Availability status updated',
      data: property,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
