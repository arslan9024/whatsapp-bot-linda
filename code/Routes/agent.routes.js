/**
 * Agent Routes - DAMAC Hills 2 API
 * Endpoints for managing agent listings and commissions
 */

import express from 'express';
import { PropertyAgentService } from '../Database/index.js';

const router = express.Router();
const agentService = new PropertyAgentService();

/**
 * GET /api/agents
 * List all agent assignments
 */
router.get('/', async (req, res) => {
  try {
    const { propertyId, agentId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (agentId) filter.agentId = agentId;

    const skip = (page - 1) * limit;
    const agents = await agentService.find(filter, { 
      skip, 
      limit,
      sort: { assignmentDate: -1 }
    });

    const total = await agentService.count(filter);

    res.json({
      success: true,
      data: agents,
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
 * GET /api/agents/:id
 * Get a specific agent assignment
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await agentService.find({ _id: id });
    
    if (!agent || agent.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent assignment not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: agent[0],
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
 * POST /api/agents
 * Create a new agent assignment
 */
router.post('/', async (req, res) => {
  try {
    const {
      propertyId,
      agentId,
      commissionPercentage,
      assignmentDate,
      endDate,
      notes
    } = req.body;

    if (!propertyId || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: propertyId, agentId',
        timestamp: new Date().toISOString()
      });
    }

    const agent = await agentService.create({
      propertyId,
      agentId,
      commissionPercentage: commissionPercentage || 0,
      assignmentDate: assignmentDate ? new Date(assignmentDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Agent assignment created',
      data: agent,
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
 * PUT /api/agents/:id
 * Update an agent assignment
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates._id;
    delete updates.createdAt;
    delete updates.propertyId;
    delete updates.agentId;

    const agent = await agentService.update(id, updates);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent assignment not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Agent assignment updated',
      data: agent,
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
 * DELETE /api/agents/:id
 * Delete an agent assignment
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await agentService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Agent assignment not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Agent assignment deleted',
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
 * GET /api/agents/property/:propertyId
 * Get all agents assigned to a property
 */
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const agents = await agentService.findByProperty(propertyId);

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

/**
 * GET /api/agents/agent/:agentId
 * Get all properties assigned to an agent
 */
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const agents = await agentService.findByAgent(agentId);

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
