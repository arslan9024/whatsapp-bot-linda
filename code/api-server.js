/**
 * DAMAC Hills 2 API Server - Complete Integration
 * Production-ready RESTful endpoints for property management
 * Integrates all services: People, Properties, Tenancies, Ownerships, Buying, Agents
 */

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { apiLimiter } from './middleware/rateLimit.js';
import {
  assertApiAccessToken,
  getApiCorsOptions,
  requireApiPermission,
  requireApiRole,
  requireApiToken,
} from './middleware/apiSecurity.js';
import { validateApiRequest } from './middleware/apiRequestValidation.js';
import { createApiMetrics } from './middleware/apiMetrics.js';
import CommunicationLog from './Database/CommunicationLogSchema.js';

// Import all route handlers
import peopleRoutes from './Routes/people.routes.js';
import propertyRoutes from './Routes/property.routes.js';
import tenancyRoutes from './Routes/tenancy.routes.js';
import ownershipRoutes from './Routes/ownership.routes.js';
import buyingRoutes from './Routes/buying.routes.js';
import agentRoutes from './Routes/agent.routes.js';

// Phase 20 + Phase 5 Feature routes
import commissionRoutes from './Routes/CommissionRoutes.js';
import commissionRulesRoutes from './Routes/commission-rules.routes.js';
import communicationRoutes from './Routes/communication.routes.js';
import analyticsRoutes from './Routes/analytics.routes.js';
import invoiceRoutes from './Routes/invoice.routes.js';
import notificationRoutes from './Routes/notification.routes.js';

// Import database initialization
import { initializeDatabase } from './Database/index.js';

// Load environment variables
dotenv.config();
assertApiAccessToken();

const app = express();
const apiMetrics = createApiMetrics();
const PORT = process.env.API_PORT || process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/damac-hills-2';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========================================
// MIDDLEWARE
// ========================================

// CORS configuration
app.use(cors(getApiCorsOptions()));

// Body parser middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(apiMetrics.middleware);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const safePath = req.path.replace(/\+?\d{7,}/g, (value) => `***${value.replace(/\D/g, '').slice(-4)}`);
    console.log(`[${new Date().toISOString()}] ${req.method} ${safePath} - ${res.statusCode} (${duration}ms)`);
  });
  next();
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
    const [queueDepth, delivery] = await Promise.all([
      CommunicationLog.countDocuments({ status: 'queued' }),
      CommunicationLog.aggregate([
        { $match: { sentAt: { $type: 'date' }, deliveredAt: { $type: 'date' } } },
        { $group: { _id: null, averageMs: { $avg: { $subtract: ['$deliveredAt', '$sentAt'] } } } },
      ]),
    ]);
    res.json({
      ...apiMetrics.snapshot(),
      queueDepth,
      averageDeliveryLatencyMs: Math.round(delivery[0]?.averageMs || 0),
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// DATABASE CONNECTION
// ========================================

let db;

async function connectDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 Using the configured MongoDB endpoint.');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully');

    // Initialize database schemas and seed data
    db = mongoose.connection;
    
    // You can initialize reference data here if needed
    console.log('✅ Database initialization complete');
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.name);
    if (NODE_ENV === 'development') {
      console.error(error.message);
    }
    return false;
  }
}

// ========================================
// ROUTES
// ========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api', apiLimiter, requireApiToken, requireApiPermission, validateApiRequest);

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'DAMAC Hills 2 Property Management API',
    timestamp: new Date().toISOString()
  });
});

// API Routes - Mount all endpoints
app.use('/api/people', peopleRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenancies', tenancyRoutes);
app.use('/api/ownerships', ownershipRoutes);
app.use('/api/buying', buyingRoutes);
app.use('/api/agents', agentRoutes);

// Phase 20 + Phase 5 Feature routes
app.use('/api/commissions', commissionRoutes);
app.use('/api/commission-rules', commissionRulesRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Redact sensitive fields from error output
  const redact = (obj) => {
    if (!obj) return obj;
    const clone = { ...obj };
    if (clone.password) clone.password = '[REDACTED]';
    if (clone.token) clone.token = '[REDACTED]';
    if (clone.secret) clone.secret = '[REDACTED]';
    return clone;
  };
  const safeError = {
    name: err.name,
    message: err.message,
    code: err.code,
    details: redact(err.details),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  };
  console.error('❌ Error:', safeError);

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: Object.values(err.errors).map(e => e.message),
      timestamp: new Date().toISOString()
    });
  }
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate key error',
      field: Object.keys(err.keyPattern)[0],
      timestamp: new Date().toISOString()
    });
  }
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }
  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: safeError,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// SERVER STARTUP
// ========================================

async function startServer() {
  try {
    // Connect to database first
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
      console.error('Failed to connect to database. Server not starting.');
      process.exit(1);
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(70));
      console.log('🚀 DAMAC Hills 2 API Server - Production Ready');
      console.log('='.repeat(70));
      console.log(`📍 Server URL:       http://localhost:${PORT}`);
      console.log(`🌐 Environment:      ${NODE_ENV}`);
      console.log(`📊 Database:         ${mongoose.connection.name}`);
      console.log(`⚙️  Node Version:     ${process.version}`);
      console.log('');
      console.log('📚 Available API Endpoints:');
      console.log('   ├─ /health                      Server health status');
      console.log('   ├─ /api/version                 API version info');
      console.log('   ├─ /api/people                  Person management (CRUD)');
      console.log('   ├─ /api/properties              Property management (CRUD)');
      console.log('   ├─ /api/tenancies               Tenancy contracts (CRUD)');
      console.log('   ├─ /api/ownerships              Property ownership (CRUD)');
      console.log('   ├─ /api/buying                  Buying inquiries (CRUD)');
      console.log('   ├─ /api/agents                  Agent assignments (CRUD)');
      console.log('   └─ /api/notifications             Notification system (CRUD)');
      console.log('');
      console.log('💡 Quick Test Commands:');
      console.log(`   • curl http://localhost:${PORT}/health`);
      console.log(`   • curl http://localhost:${PORT}/api/version`);
      console.log(`   • curl http://localhost:${PORT}/api/people`);
      console.log('');
      console.log('📖 For usage examples, see: API_DOCUMENTATION.md');
      console.log('='.repeat(70) + '\n');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

// Start the server
startServer();

export default app;
