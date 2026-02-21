/**
 * People Routes - DAMAC Hills 2 API
 * Endpoints for managing persons (owners, tenants, agents)
 */

import express from 'express';
import { PersonService } from '../Database/index.js';

const router = express.Router();
const personService = new PersonService();

/**
 * GET /api/people
 * List all people with optional filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Get people with pagination
    const skip = (page - 1) * limit;
    const people = await personService.find(filter, { 
      skip, 
      limit,
      sort: { createdAt: -1 }
    });

    const total = await personService.count(filter);

    res.json({
      success: true,
      data: people,
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
 * GET /api/people/:id
 * Get a specific person by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const person = await personService.find({ _id: id });
    
    if (!person || person.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: person[0],
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
 * POST /api/people
 * Create a new person
 */
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, emiratesId, bankAccount } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email',
        timestamp: new Date().toISOString()
      });
    }

    // Create person
    const person = await personService.create({
      firstName,
      lastName,
      email,
      phone,
      role: role || 'owner',
      emiratesId,
      bankAccount
    });

    res.status(201).json({
      success: true,
      message: 'Person created successfully',
      data: person,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error.message.includes('duplicate')) {
      return res.status(409).json({
        success: false,
        error: 'Person already exists with this email',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/people/:id
 * Update a person
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.createdAt;

    const person = await personService.update(id, updates);

    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Person updated successfully',
      data: person,
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
 * DELETE /api/people/:id
 * Delete a person
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await personService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Person deleted successfully',
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
 * GET /api/people/role/owners
 * Get all owners
 */
router.get('/role/owners', async (req, res) => {
  try {
    const owners = await personService.findOwners();

    res.json({
      success: true,
      data: owners,
      count: owners.length,
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
 * GET /api/people/role/tenants
 * Get all tenants
 */
router.get('/role/tenants', async (req, res) => {
  try {
    const tenants = await personService.findTenants();

    res.json({
      success: true,
      data: tenants,
      count: tenants.length,
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
 * GET /api/people/role/agents
 * Get all agents
 */
router.get('/role/agents', async (req, res) => {
  try {
    const agents = await personService.findAgents();

    res.json({
      success: true,
      data: agents,
      count: agents.length,
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
