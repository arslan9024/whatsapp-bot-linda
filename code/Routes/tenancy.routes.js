/**
 * Tenancy Routes - DAMAC Hills 2 API
 * Endpoints for managing rental contracts and payments
 */

import express from 'express';
import { PropertyTenancyService } from '../Database/index.js';

const router = express.Router();
const tenancyService = new PropertyTenancyService();

/**
 * GET /api/tenancies
 * List all tenancy contracts
 */
router.get('/', async (req, res) => {
  try {
    const { 
      propertyId,
      tenantId,
      status,
      page = 1, 
      limit = 20 
    } = req.query;

    // Build filter
    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (tenantId) filter.tenantId = tenantId;
    if (status) filter.contractStatus = status;

    // Get tenancies with pagination
    const skip = (page - 1) * limit;
    const tenancies = await tenancyService.find(filter, { 
      skip, 
      limit,
      sort: { contractStartDate: -1 }
    });

    const total = await tenancyService.count(filter);

    res.json({
      success: true,
      data: tenancies,
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
 * GET /api/tenancies/:id
 * Get a specific tenancy contract
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenancy = await tenancyService.find({ _id: id });
    
    if (!tenancy || tenancy.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenancy contract not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: tenancy[0],
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
 * POST /api/tenancies
 * Create a new tenancy contract
 */
router.post('/', async (req, res) => {
  try {
    const {
      propertyId,
      tenantId,
      contractStartDate,
      contractExpiryDate,
      rentAmount,
      paymentSchedule,
      numberOfCheques,
      chequeDetails,
      contractNotes
    } = req.body;

    // Validate required fields
    if (!propertyId || !tenantId || !contractStartDate || !rentAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: propertyId, tenantId, contractStartDate, rentAmount',
        timestamp: new Date().toISOString()
      });
    }

    // Create tenancy
    const tenancy = await tenancyService.create({
      propertyId,
      tenantId,
      contractStartDate: new Date(contractStartDate),
      contractExpiryDate: contractExpiryDate ? new Date(contractExpiryDate) : null,
      rentAmount,
      paymentSchedule: paymentSchedule || 'monthly',
      numberOfCheques: numberOfCheques || 1,
      chequeDetails: chequeDetails || [],
      contractNotes
    });

    res.status(201).json({
      success: true,
      message: 'Tenancy contract created successfully',
      data: tenancy,
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
 * PUT /api/tenancies/:id
 * Update a tenancy contract
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.createdAt;
    delete updates.propertyId;
    delete updates.tenantId;

    const tenancy = await tenancyService.update(id, updates);

    if (!tenancy) {
      return res.status(404).json({
        success: false,
        error: 'Tenancy contract not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Tenancy contract updated successfully',
      data: tenancy,
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
 * DELETE /api/tenancies/:id
 * Delete a tenancy contract
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await tenancyService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Tenancy contract not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Tenancy contract deleted successfully',
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
 * GET /api/tenancies/property/:propertyId
 * Get all tenancy contracts for a property
 */
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const tenancies = await tenancyService.findByProperty(propertyId);

    res.json({
      success: true,
      data: tenancies,
      count: tenancies.length,
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
 * GET /api/tenancies/tenant/:tenantId
 * Get all tenancy contracts for a tenant
 */
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenancies = await tenancyService.findByTenant(tenantId);

    res.json({
      success: true,
      data: tenancies,
      count: tenancies.length,
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
 * POST /api/tenancies/:id/payment
 * Record a payment for a tenancy contract
 */
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentDate,
      amount,
      paymentMethod,
      chequeNumber,
      referenceNumber,
      notes
    } = req.body;

    if (!paymentDate || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: paymentDate, amount',
        timestamp: new Date().toISOString()
      });
    }

    const result = await tenancyService.recordPayment(id, {
      paymentDate: new Date(paymentDate),
      amount,
      paymentMethod: paymentMethod || 'cheque',
      chequeNumber,
      referenceNumber,
      notes
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
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
 * GET /api/tenancies/:id/payments
 * Get all payments for a tenancy
 */
router.get('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;

    const tenancy = await tenancyService.find({ _id: id });
    
    if (!tenancy || tenancy.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenancy contract not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: tenancy[0].payments || [],
      count: (tenancy[0].payments || []).length,
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
 * GET /api/tenancies/:id/rent-calculation
 * Calculate total rent for a tenancy
 */
router.get('/:id/rent-calculation', async (req, res) => {
  try {
    const { id } = req.params;

    const tenancy = await tenancyService.find({ _id: id });
    
    if (!tenancy || tenancy.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenancy contract not found',
        timestamp: new Date().toISOString()
      });
    }

    const t = tenancy[0];
    const totalRent = t.rentAmount * (t.numberOfCheques || 1);
    const paidAmount = (t.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingAmount = totalRent - paidAmount;

    res.json({
      success: true,
      data: {
        rentAmount: t.rentAmount,
        numberOfCheques: t.numberOfCheques,
        totalRent,
        paidAmount,
        remainingAmount,
        paymentsCount: (t.payments || []).length,
        paymentsMissing: (t.numberOfCheques || 1) - (t.payments || []).length
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

export default router;
