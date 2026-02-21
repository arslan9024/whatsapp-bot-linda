/**
 * Buying Routes - DAMAC Hills 2 API
 * Endpoints for managing property purchases
 */

import express from 'express';
import { PropertyBuyingService } from '../Database/index.js';

const router = express.Router();
const buyingService = new PropertyBuyingService();

/**
 * GET /api/buyings
 * List all buying agreements
 */
router.get('/', async (req, res) => {
  try {
    const { propertyId, buyerId, status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (buyerId) filter.buyerId = buyerId;
    if (status) filter.transactionStatus = status;

    const skip = (page - 1) * limit;
    const buyings = await buyingService.find(filter, { 
      skip, 
      limit,
      sort: { agreementDate: -1 }
    });

    const total = await buyingService.count(filter);

    res.json({
      success: true,
      data: buyings,
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
 * GET /api/buyings/:id
 * Get a specific buying agreement
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const buying = await buyingService.find({ _id: id });
    
    if (!buying || buying.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Buying agreement not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: buying[0],
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
 * POST /api/buyings
 * Create a new buying agreement
 */
router.post('/', async (req, res) => {
  try {
    const {
      propertyId,
      buyerId,
      sellerId,
      purchasePrice,
      downPayment,
      agreementDate,
      completionDate,
      mortgageDetails,
      notes
    } = req.body;

    if (!propertyId || !buyerId || !sellerId || !purchasePrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: propertyId, buyerId, sellerId, purchasePrice',
        timestamp: new Date().toISOString()
      });
    }

    const buying = await buyingService.create({
      propertyId,
      buyerId,
      sellerId,
      purchasePrice,
      downPayment: downPayment || 0,
      agreementDate: agreementDate ? new Date(agreementDate) : new Date(),
      completionDate: completionDate ? new Date(completionDate) : null,
      mortgageDetails,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Buying agreement created',
      data: buying,
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
 * PUT /api/buyings/:id
 * Update a buying agreement
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates._id;
    delete updates.createdAt;
    delete updates.propertyId;
    delete updates.buyerId;
    delete updates.sellerId;

    const buying = await buyingService.update(id, updates);

    if (!buying) {
      return res.status(404).json({
        success: false,
        error: 'Buying agreement not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Buying agreement updated',
      data: buying,
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
 * DELETE /api/buyings/:id
 * Delete a buying agreement
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await buyingService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Buying agreement not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Buying agreement deleted',
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
 * GET /api/buyings/buyer/:buyerId
 * Get all buying agreements for a buyer
 */
router.get('/buyer/:buyerId', async (req, res) => {
  try {
    const { buyerId } = req.params;

    const buyings = await buyingService.findByBuyer(buyerId);

    res.json({
      success: true,
      data: buyings,
      count: buyings.length,
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
 * GET /api/buyings/seller/:sellerId
 * Get all selling agreements for a seller
 */
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;

    const buyings = await buyingService.findBySeller(sellerId);

    res.json({
      success: true,
      data: buyings,
      count: buyings.length,
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
