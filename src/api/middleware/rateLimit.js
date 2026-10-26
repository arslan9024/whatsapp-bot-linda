// Centralized rate limiting middleware using express-rate-limit
import rateLimit from 'express-rate-limit';

// Usage: apply to sensitive endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    timestamp: new Date().toISOString()
  }
});

// For stricter endpoints (e.g., login, device linking)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many attempts, please try again later.',
    timestamp: new Date().toISOString()
  }
});
