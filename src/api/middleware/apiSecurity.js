import { timingSafeEqual } from 'node:crypto';

const MINIMUM_TOKEN_LENGTH = 32;

export function assertApiAccessToken() {
  const token = process.env.API_ACCESS_TOKEN;
  if (typeof token !== 'string' || token.length < MINIMUM_TOKEN_LENGTH) {
    throw new Error(`API_ACCESS_TOKEN must be configured with at least ${MINIMUM_TOKEN_LENGTH} characters.`);
  }

  for (const name of ['API_READ_TOKEN', 'API_MESSAGING_TOKEN']) {
    const scopedToken = process.env[name];
    if (scopedToken && scopedToken.length < MINIMUM_TOKEN_LENGTH) {
      throw new Error(`${name} must be at least ${MINIMUM_TOKEN_LENGTH} characters.`);
    }
  }
  const configuredTokens = ['API_ACCESS_TOKEN', 'API_READ_TOKEN', 'API_MESSAGING_TOKEN']
    .map((name) => process.env[name])
    .filter(Boolean);
  if (new Set(configuredTokens).size !== configuredTokens.length) {
    throw new Error('API role tokens must be distinct.');
  }

  return token;
}

export function requireApiToken(req, res, next) {
  try {
    assertApiAccessToken();
  } catch {
    return res.status(503).json({ error: 'API authentication is not configured' });
  }

  const authorization = req.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  const providedToken = match?.[1] || '';
  const credentials = [
    ['admin', process.env.API_ACCESS_TOKEN],
    ['read', process.env.API_READ_TOKEN],
    ['messaging', process.env.API_MESSAGING_TOKEN],
  ];
  const role = credentials.find(([, token]) => token && safeTokenMatch(providedToken, token))?.[0];

  if (!role) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.apiRole = role;
  return next();
}

function safeTokenMatch(provided, expected) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function requireApiRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.apiRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

export function requireApiPermission(req, res, next) {
  if (req.apiRole === 'admin') return next();

  if (req.apiRole === 'read' && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (
    req.apiRole === 'messaging' &&
    req.method === 'POST' &&
    /^\/(?:api\/communications|api\/v1\/damac\/communication)\/(send|send-direct|send-bulk|schedule)(?:\?|$)/.test(req.originalUrl)
  ) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden' });
}

export function getApiCorsOptions() {
  const allowedOrigins = new Set(
    (process.env.API_CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  return {
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  };
}
