/**
 * EXPRESS SERVER FOR DAMAC HILLS 2
 * 
 * REST API server for property management
 * 
 * Run with: npm run express-server
 * Or: node express-server.js
 * 
 * Server runs on: http://localhost:5000
 * API Endpoints: http://localhost:5000/api/v1/damac/*
 */

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import damacApiRoutes from './code/Routes/damacApiRoutes.js';
import communicationRoutes from './code/Routes/communication.routes.js';
import { connectToMongoDB } from './code/Database/config.js';
import {
  assertApiAccessToken,
  getApiCorsOptions,
  requireApiPermission,
  requireApiRole,
  requireApiToken,
} from './code/middleware/apiSecurity.js';
import { validateApiRequest } from './code/middleware/apiRequestValidation.js';
import { createApiMetrics } from './code/middleware/apiMetrics.js';
import { apiLimiter } from './code/middleware/rateLimit.js';
import CommunicationLog from './code/Database/CommunicationLogSchema.js';

const app = express();
const apiMetrics = createApiMetrics();
const PORT = process.env.EXPRESS_SERVER_PORT || 5000;

assertApiAccessToken();

// Initialize MongoDB connection
await connectToMongoDB();

// Middleware
app.use(cors(getApiCorsOptions()));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiMetrics.middleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    ready,
    database: ready ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', apiLimiter, requireApiToken, requireApiRole('admin'), async (req, res, next) => {
  try {
    const queueDepth = await CommunicationLog.countDocuments({ status: 'queued' });
    res.json({ ...apiMetrics.snapshot(), queueDepth });
  } catch (error) {
    next(error);
  }
});

// API Info endpoint
app.get('/info', (req, res) => {
  res.json({
    name: 'DAMAC Hills 2 - Property Management API',
    version: '1.0.0',
    description: 'REST API for managing properties, owners, and contacts',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      info: 'GET /info',
      api: 'GET /api/v1/damac/*'
    }
  });
});

// Mount DAMAC API routes
app.use('/api/v1/damac', apiLimiter, requireApiToken, requireApiPermission, validateApiRequest);
app.use('/api/v1/damac', damacApiRoutes);

// Mount Communication API routes (Phase 5)
app.use('/api/v1/damac/communication', communicationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.name || 'Error');
  if (process.env.NODE_ENV === 'development') console.error(err.message);
  res.status(500).json({
    error: 'Internal server error',
    status: 'SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 DAMAC HILLS 2 - EXPRESS SERVER                 ║
║                   API Server Starting...                        ║
╚════════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:${PORT}
📊 API Base URL: http://localhost:${PORT}/api/v1/damac
🏥 Health Check: http://localhost:${PORT}/health
ℹ️  Server Info: http://localhost:${PORT}/info

📚 Available Endpoints:
  - Owners:         POST/GET/PUT/DELETE /api/v1/damac/owners
  - Contacts:       POST/GET/PUT/DELETE /api/v1/damac/contacts
  - Properties:     GET/PUT /api/v1/damac/properties
  - Import/Sync:    POST /api/v1/damac/import/*, /api/v1/damac/sync/*
  - Analytics:      GET /api/v1/damac/analytics/*
  - Search:         GET /api/v1/damac/search/*
  - Communication:  /api/v1/damac/communication/* (Phase 5 - Templates & Messaging)

🛑 To stop server: Press Ctrl+C

  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default server;
