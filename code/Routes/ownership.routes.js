/**
 * Ownership Routes - DAMAC Hills 2 API
 * Endpoints for managing property ownership
 */

import express from 'express';
import { PropertyOwnershipService } from '../Database/index.js';

const router = express.Router();
const ownershipService = new PropertyOwnershipService();

/**
 * GET /api/ownerships
 * List all property ownerships
 */
router.get('/', async (req, res) => {
  try {
    const { propertyId, ownerId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (ownerId) filter.ownerId = ownerId;

    const skip = (page - 1) * limit;
    const ownerships = await ownershipService.find(filter, { 
      skip, 
      limit,
      sort: { acquiredDate: -1 }
    });

    const total = await ownershipService.count(filter);

    res.json({
      success: true,
      data: ownerships,
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
 * GET /api/ownerships/:id
 * Get a specific ownership record
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ownership = await ownershipService.find({ _id: id });
    
    if (!ownership || ownership.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ownership record not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: ownership[0],
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
 * POST /api/ownerships
 * Create a new ownership record
 */
router.post('/', async (req, res) => {
  try {
    const {
      propertyId,
      ownerId,
      ownershipPercentage,
      acquiredDate,
      acquiredPrice,
      notes
    } = req.body;

    if (!propertyId || !ownerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: propertyId, ownerId',
        timestamp: new Date().toISOString()
      });
    }

    const ownership = await ownershipService.create({
      propertyId,
      ownerId,
      ownershipPercentage: ownershipPercentage || 100,
      acquiredDate: acquiredDate ? new Date(acquiredDate) : new Date(),
      acquiredPrice,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Ownership record created',
      data: ownership,
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
 * PUT /api/ownerships/:id
 * Update an ownership record
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates._id;
    delete updates.createdAt;
    delete updates.propertyId;
    delete updates.ownerId;

    const ownership = await ownershipService.update(id, updates);

    if (!ownership) {
      return res.status(404).json({
        success: false,
        error: 'Ownership record not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Ownership record updated',
      data: ownership,
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
 * DELETE /api/ownerships/:id
 * Delete an ownership record
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ownershipService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Ownership record not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Ownership record deleted',
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
 * GET /api/ownerships/property/:propertyId
 * Get all owners of a property
 */
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const ownerships = await ownershipService.findByProperty(propertyId);

    res.json({
      success: true,
      data: ownerships,
      count: ownerships.length,
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
 * GET /api/ownerships/owner/:ownerId
 * Get all properties owned by a person
 */
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;

    const ownerships = await ownershipService.findByOwner(ownerId);

    res.json({
      success: true,
      data: ownerships,
      count: ownerships.length,
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
