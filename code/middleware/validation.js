// Centralized input validation middleware using Zod
import { z } from 'zod';

// Usage: validateBody(schema)
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: err.errors || err.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Usage: validateQuery(schema)
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: err.errors || err.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Usage: validateParams(schema)
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: err.errors || err.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}
