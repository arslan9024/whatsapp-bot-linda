/**
 * DAMAC HILLS 2 - REST API ROUTES
 * 
 * Complete REST API endpoints for property management
 * 
 * Endpoints:
 * - Owners: Create, Read, Update, Delete, Search, Verify
 * - Contacts: Create, Read, Update, Delete, Search
 * - Properties: Read, Update, Link
 * - Import/Sync: Bulk operations
 * - Analytics: Dashboards, Reports
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 19, 2026
 */

import express from 'express';
import PropertyOwnerService from '../Database/PropertyOwnerService.js';
import PropertyImportService from '../Database/PropertyImportService.js';
import DataMigrationService from '../Database/DataMigrationService.js';
import DashboardDataService from '../Database/DashboardDataService.js';

const router = express.Router();

// ============================================================================
// OWNER ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/owners
 * Create a new owner
 */
router.post('/owners', async (req, res) => {
  try {
    const { firstName, lastName, primaryPhone, email, ...rest } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        error: 'First name and last name are required'
      });
    }

    const owner = await PropertyOwnerService.createOwner({
      firstName,
      lastName,
      primaryPhone,
      email,
      ...rest
    });

    res.status(201).json({
      success: true,
      message: 'Owner created successfully',
      data: owner
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'CREATE_OWNER_FAILED'
    });
  }
});

/**
 * GET /api/v1/owners
 * List all owners with pagination
 */
router.get('/owners', async (req, res) => {
  try {
    const { skip = 0, limit = 50, status = 'all', verified = 'all' } = req.query;

    const query = {};
    if (status !== 'all') query.status = status;
    if (verified !== 'all') query.verified = verified === 'true';

    // Use PropertyOwnerService.PropertyOwner for direct queries
    const PropertyOwner = PropertyOwnerService.PropertyOwner;
    
    const [owners, total] = await Promise.all([
      PropertyOwner.find(query)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      PropertyOwner.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: owners,
      pagination: {
        skip: parseInt(skip),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'LIST_OWNERS_FAILED'
    });
  }
});

/**
 * GET /api/v1/owners/:id
 * Get owner by ID
 */
router.get('/owners/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try as ownerId or MongoDB _id
    let owner = await PropertyOwnerService.getOwnerById(id);
    if (!owner) {
      owner = await PropertyOwnerService.PropertyOwner.findOne({ ownerId: id });
    }

    if (!owner) {
      return res.status(404).json({
        error: 'Owner not found',
        id
      });
    }

    res.json({
      success: true,
      data: owner
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'GET_OWNER_FAILED'
    });
  }
});

/**
 * GET /api/v1/owners/phone/:phone
 * Get owner by phone
 */
router.get('/owners/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    const owner = await PropertyOwnerService.getOwnerByPhone(phone);
    if (!owner) {
      return res.status(404).json({
        error: 'Owner not found',
        phone
      });
    }

    res.json({
      success: true,
      data: owner
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/owners/email/:email
 * Get owner by email
 */
router.get('/owners/email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const owner = await PropertyOwnerService.getOwnerByEmail(email);
    if (!owner) {
      return res.status(404).json({
        error: 'Owner not found',
        email
      });
    }

    res.json({
      success: true,
      data: owner
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/owners/search/:query
 * Search owners by name, email, phone
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;

    const results = await PropertyOwnerService.searchOwners(
      { $text: { $search: query } },
      0,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'SEARCH_FAILED'
    });
  }
});

/**
 * PUT /api/v1/owners/:id
 * Update owner
 */
router.put('/owners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const owner = await PropertyOwnerService.updateOwner(id, updateData);
    if (!owner) {
      return res.status(404).json({
        error: 'Owner not found'
      });
    }

    res.json({
      success: true,
      message: 'Owner updated successfully',
      data: owner
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'UPDATE_OWNER_FAILED'
    });
  }
});

/**
 * DELETE /api/v1/owners/:id
 * Archive/delete owner
 */
router.delete('/owners/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await PropertyOwnerService.archiveOwner(id);
    if (!result) {
      return res.status(404).json({
        error: 'Owner not found'
      });
    }

    res.json({
      success: true,
      message: 'Owner archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'DELETE_OWNER_FAILED'
    });
  }
});

/**
 * POST /api/v1/owners/:id/verify
 * Verify owner
 */
router.post('/owners/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'document', userId = 'api' } = req.body;

    const result = await PropertyOwnerService.verifyOwner(id, method, userId);
    if (!result) {
      return res.status(404).json({
        error: 'Owner not found'
      });
    }

    res.json({
      success: true,
      message: 'Owner verified successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'VERIFY_OWNER_FAILED'
    });
  }
});

/**
 * GET /api/v1/owners/:id/properties
 * Get owner's properties
 */
router.get('/owners/:id/properties', async (req, res) => {
  try {
    const { id } = req.params;

    const owner = await PropertyOwnerService.PropertyOwner.findOne({ ownerId: id });
    if (!owner) {
      return res.status(404).json({
        error: 'Owner not found'
      });
    }

    const properties = await PropertyOwnerService.PropertyOwnerProperties
      .find({ ownerId: owner._id })
      .lean();

    res.json({
      success: true,
      data: properties,
      count: properties.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/owners/:id/audit-trail
 * Get owner's audit trail
 */
router.get('/owners/:id/audit-trail', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const trail = await PropertyOwnerService.getAuditTrail(id, parseInt(limit));

    res.json({
      success: true,
      data: trail,
      count: trail.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// ============================================================================
// CONTACT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/contacts
 * Create new contact
 */
router.post('/contacts', async (req, res) => {
  try {
    const { firstName, lastName, primaryPhone, contactType, ...rest } = req.body;

    if (!firstName || !lastName || !contactType) {
      return res.status(400).json({
        error: 'firstName, lastName, and contactType are required'
      });
    }

    const contact = await PropertyOwnerService.createContact({
      firstName,
      lastName,
      primaryPhone,
      contactType,
      ...rest
    });

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'CREATE_CONTACT_FAILED'
    });
  }
});

/**
 * GET /api/v1/contacts
 * List all contacts
 */
router.get('/contacts', async (req, res) => {
  try {
    const { skip = 0, limit = 50, type = 'all' } = req.query;

    const query = {};
    if (type !== 'all') query.contactType = type;

    const [contacts, total] = await Promise.all([
      PropertyOwnerService.PropertyContact
        .find(query)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
      PropertyOwnerService.PropertyContact.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        skip: parseInt(skip),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/contacts/:id
 * Get contact by ID
 */
router.get('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let contact = await PropertyOwnerService.PropertyContact.findById(id).lean();
    if (!contact) {
      contact = await PropertyOwnerService.PropertyContact.findOne({ contactId: id }).lean();
    }

    if (!contact) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/contacts/:id
 * Update contact
 */
router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await PropertyOwnerService.PropertyContact
      .findByIdAndUpdate(id, req.body, { new: true })
      .lean();

    if (!contact) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/contacts/:id
 * Delete contact
 */
router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await PropertyOwnerService.PropertyContact.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// ============================================================================
// IMPORT & SYNC ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/import/owners
 * Bulk import owners
 */
router.post('/import/owners', async (req, res) => {
  try {
    const { data, options = {} } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        error: 'data must be a non-empty array'
      });
    }

    const result = await DataMigrationService.migrateOwnersFromSheets(data, options);

    res.json({
      success: true,
      message: 'Owner import completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'IMPORT_FAILED'
    });
  }
});

/**
 * POST /api/v1/import/contacts
 * Bulk import contacts
 */
router.post('/import/contacts', async (req, res) => {
  try {
    const { data, options = {} } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        error: 'data must be a non-empty array'
      });
    }

    const result = await DataMigrationService.migrateContactsFromSheets(data, options);

    res.json({
      success: true,
      message: 'Contact import completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'IMPORT_FAILED'
    });
  }
});

/**
 * POST /api/v1/sync/owners
 * Sync owners (merge existing + new)
 */
router.post('/sync/owners', async (req, res) => {
  try {
    const { data, options = {} } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        error: 'data must be an array'
      });
    }

    const result = await DataMigrationService.syncOwnerData(data, options);

    res.json({
      success: true,
      message: 'Sync completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'SYNC_FAILED'
    });
  }
});

// ============================================================================
// ANALYTICS & DASHBOARD ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/analytics/dashboard
 * Get dashboard overview
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const data = await DashboardDataService.getDashboardOverview();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/owners
 * Get owner statistics
 */
router.get('/analytics/owners', async (req, res) => {
  try {
    const data = await DashboardDataService.getOwnerStatistics();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/contacts
 * Get contact statistics
 */
router.get('/analytics/contacts', async (req, res) => {
  try {
    const data = await DashboardDataService.getContactStatistics();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/properties
 * Get property statistics
 */
router.get('/analytics/properties', async (req, res) => {
  try {
    const data = await DashboardDataService.getPropertyStatistics();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/quality
 * Get data quality score
 */
router.get('/analytics/quality', async (req, res) => {
  try {
    const data = await DashboardDataService.getDataQualityScore();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/activity
 * Get recent activity
 */
router.get('/analytics/activity', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const data = await DashboardDataService.getRecentActivity(parseInt(limit));
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/status
 * Get migration status
 */
router.get('/analytics/status', async (req, res) => {
  try {
    const data = await DataMigrationService.getMigrationStatus();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// ============================================================================
// HEALTH & INFO ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'DAMAC Hills 2 API'
  });
});

/**
 * GET /api/v1/info
 * API information
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'DAMAC Hills 2 Property Management API',
    version: '1.0.0',
    endpoints: {
      owners: {
        create: 'POST /api/v1/owners',
        list: 'GET /api/v1/owners',
        get: 'GET /api/v1/owners/:id',
        update: 'PUT /api/v1/owners/:id',
        delete: 'DELETE /api/v1/owners/:id',
        verify: 'POST /api/v1/owners/:id/verify'
      },
      contacts: {
        create: 'POST /api/v1/contacts',
        list: 'GET /api/v1/contacts',
        get: 'GET /api/v1/contacts/:id',
        update: 'PUT /api/v1/contacts/:id',
        delete: 'DELETE /api/v1/contacts/:id'
      },
      import: {
        owners: 'POST /api/v1/import/owners',
        contacts: 'POST /api/v1/import/contacts',
        sync: 'POST /api/v1/sync/owners'
      },
      analytics: {
        dashboard: 'GET /api/v1/analytics/dashboard',
        owners: 'GET /api/v1/analytics/owners',
        contacts: 'GET /api/v1/analytics/contacts',
        properties: 'GET /api/v1/analytics/properties',
        quality: 'GET /api/v1/analytics/quality'
      }
    }
  });
});

export default router;
