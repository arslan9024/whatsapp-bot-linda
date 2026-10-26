/**
 * Google API Constants & Configuration
 * Centralized configuration for all Google API services
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

// ============================================================================
// GOOGLE OAUTH SCOPES
// ============================================================================

const GOOGLE_SCOPES = {
  // Gmail Scopes
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  GMAIL_MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  GMAIL_SEND: 'https://www.googleapis.com/auth/gmail.send',
  
  // Google Sheets Scopes
  SHEETS_READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  SHEETS_READWRITE: 'https://www.googleapis.com/auth/spreadsheets',
  
  // Google Drive Scopes
  DRIVE_READONLY: 'https://www.googleapis.com/auth/drive.readonly',
  DRIVE_READWRITE: 'https://www.googleapis.com/auth/drive',
  
  // Google Calendar Scopes
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  CALENDAR_READWRITE: 'https://www.googleapis.com/auth/calendar',
  
  // Additional Scopes
  USERINFO: 'https://www.googleapis.com/auth/userinfo.profile',
  USERINFO_EMAIL: 'https://www.googleapis.com/auth/userinfo.email',
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const API_ENDPOINTS = {
  // Google APIs Discovery Service
  DISCOVERY_BASE: 'https://www.googleapis.com/discovery/v1',
  
  // Google Sheets
  SHEETS_API_VERSION: 'v4',
  SHEETS_API_URL: 'https://sheets.googleapis.com/v4',
  
  // Gmail API
  GMAIL_API_VERSION: 'v1',
  GMAIL_API_URL: 'https://www.googleapis.com/gmail/v1',
  
  // Google Drive
  DRIVE_API_VERSION: 'v3',
  DRIVE_API_URL: 'https://www.googleapis.com/drive/v3',
  
  // Google Calendar
  CALENDAR_API_VERSION: 'v3',
  CALENDAR_API_URL: 'https://www.googleapis.com/calendar/v3',
  
  // OAuth 2.0
  OAUTH_TOKEN_URL: 'https://oauth.googleapis.com/token',
  OAUTH_AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  OAUTH_REVOKE_URL: 'https://oauth.googleapis.com/revoke',
};

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

const SERVICE_CONFIG = {
  // JWT Configuration
  JWT: {
    algorithm: 'HS256',
    expirationTime: '1h',
    issuer: 'Google Service Account',
  },
  
  // Token Configuration
  TOKEN: {
    refreshThreshold: 300000, // 5 minutes (in ms)
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },
  
  // Cache Configuration
  CACHE: {
    defaultTTL: 3600000, // 1 hour
    maxSize: 1000, // Max items in cache
    evictionPolicy: 'LRU', // Least Recently Used
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    requestsPerSecond: 10,
    burstSize: 100,
    windowMs: 1000, // 1 second
  },
  
  // Retry Configuration
  RETRY: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
  },
  
  // Timeout Configuration
  TIMEOUT: {
    default: 30000, // 30 seconds
    upload: 60000, // 1 minute
    download: 60000, // 1 minute
  },
};

// ============================================================================
// ERROR CODES & MESSAGES
// ============================================================================

const ERROR_CODES = {
  // Authentication Errors
  AUTH_FAILED: 'AUTH_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',
  
  // API Errors
  API_ERROR: 'API_ERROR',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  API_NOT_FOUND: 'API_NOT_FOUND',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_RANGE: 'INVALID_RANGE',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_FILE_ID: 'INVALID_FILE_ID',
  
  // Service Errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVICE_NOT_INITIALIZED: 'SERVICE_NOT_INITIALIZED',
  CACHE_ERROR: 'CACHE_ERROR',
  
  // Unknown Error
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

const ERROR_MESSAGES = {
  AUTH_FAILED: 'Authentication failed. Please check credentials.',
  INVALID_CREDENTIALS: 'Invalid credentials provided.',
  TOKEN_EXPIRED: 'Token has expired. Refreshing...',
  TOKEN_INVALID: 'Token is invalid.',
  TOKEN_REFRESH_FAILED: 'Failed to refresh token.',
  
  API_ERROR: 'Google API error occurred.',
  API_QUOTA_EXCEEDED: 'Google API quota exceeded. Please try again later.',
  API_RATE_LIMIT: 'Rate limit exceeded. Please slow down.',
  API_NOT_FOUND: 'Resource not found.',
  
  VALIDATION_ERROR: 'Validation error occurred.',
  INVALID_RANGE: 'Invalid sheet range specified.',
  INVALID_EMAIL: 'Invalid email address.',
  INVALID_FILE_ID: 'Invalid file ID.',
  
  SERVICE_UNAVAILABLE: 'Service is currently unavailable.',
  SERVICE_NOT_INITIALIZED: 'Service has not been initialized.',
  CACHE_ERROR: 'Cache operation failed.',
  
  UNKNOWN_ERROR: 'An unknown error occurred.',
};

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS = {
  // Sheet Operations
  SHEET: {
    majorDimension: 'ROWS',
    valueInputOption: 'USER_ENTERED',
    responseValueRenderOption: 'FORMATTED_VALUE',
  },
  
  // Gmail Operations
  GMAIL: {
    maxResults: 10,
    format: 'full',
    labelIds: ['INBOX'],
  },
  
  // Drive Operations
  DRIVE: {
    maxResults: 100,
    pageSize: 100,
    spaces: 'drive',
  },
  
  // Calendar Operations
  CALENDAR: {
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  },
};

// ============================================================================
// GMAIL LABELS (Common)
// ============================================================================

const GMAIL_LABELS = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  DRAFT: 'DRAFT',
  SPAM: 'SPAM',
  TRASH: 'TRASH',
  STARRED: 'STARRED',
  UNREAD: 'UNREAD',
  IMPORTANT: 'IMPORTANT',
};

// ============================================================================
// MIME TYPES (For file uploads)
// ============================================================================

const MIME_TYPES = {
  // Text
  PLAIN_TEXT: 'text/plain',
  HTML: 'text/html',
  CSV: 'text/csv',
  JSON: 'application/json',
  XML: 'application/xml',
  
  // Documents
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Images
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
  SVG: 'image/svg+xml',
  
  // Archives
  ZIP: 'application/zip',
  RAR: 'application/x-rar-compressed',
  GZIP: 'application/gzip',
  
  // Spreadsheet (Google Sheets)
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  GOOGLE_DOC: 'application/vnd.google-apps.document',
  GOOGLE_SLIDE: 'application/vnd.google-apps.presentation',
};

// ============================================================================
// HTTP HEADERS
// ============================================================================

const HTTP_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  USER_AGENT: 'User-Agent',
  ACCEPT: 'Accept',
  CACHE_CONTROL: 'Cache-Control',
  WWW_AUTHENTICATE: 'WWW-Authenticate',
};

// ============================================================================
// BATCH OPERATION LIMITS
// ============================================================================

const BATCH_LIMITS = {
  // Gmail batch size
  GMAIL_BATCH_SIZE: 100,
  
  // Sheets batch size
  SHEETS_BATCH_SIZE: 1000,
  
  // Drive batch size
  DRIVE_BATCH_SIZE: 1000,
  
  // Calendar batch size
  CALENDAR_BATCH_SIZE: 250,
};

// ============================================================================
// PAGINATION
// ============================================================================

const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  DEFAULT_MAX_RESULTS: 50,
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GOOGLE_SCOPES,
  API_ENDPOINTS,
  SERVICE_CONFIG,
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_OPTIONS,
  GMAIL_LABELS,
  MIME_TYPES,
  HTTP_HEADERS,
  BATCH_LIMITS,
  PAGINATION,
};
