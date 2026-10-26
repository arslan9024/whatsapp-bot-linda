const PAGINATION_LIMIT = 100;
const MAX_SKIP = 100_000;
const MAX_SEARCH_LENGTH = 200;
const MAX_NESTING_DEPTH = 10;

const paginationFields = new Set(['page', 'limit', 'skip']);
const searchFields = new Set(['search', 'query', 'namePattern']);

function hasUnsafeMongoKeys(value, depth = 0) {
  if (depth > MAX_NESTING_DEPTH) return true;
  if (Array.isArray(value)) return value.some((item) => hasUnsafeMongoKeys(item, depth + 1));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) =>
    key.startsWith('$') || key.includes('.') || hasUnsafeMongoKeys(nested, depth + 1)
  );
}

export function validateApiRequest(req, res, next) {
  for (const field of paginationFields) {
    const value = req.query[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      return res.status(400).json({ error: `Invalid ${field}` });
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number)) {
      return res.status(400).json({ error: `Invalid ${field}` });
    }
    if (field === 'page' && number < 1) {
      return res.status(400).json({ error: 'page must be at least 1' });
    }
    if (field === 'skip' && (number < 0 || number > MAX_SKIP)) {
      return res.status(400).json({ error: `skip must be between 0 and ${MAX_SKIP}` });
    }
    if (field === 'limit' && (number < 1 || number > PAGINATION_LIMIT)) {
      return res.status(400).json({ error: `limit must be between 1 and ${PAGINATION_LIMIT}` });
    }
  }

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || PAGINATION_LIMIT);
  if ((page - 1) * limit > MAX_SKIP) {
    return res.status(400).json({ error: `Requested page exceeds the maximum offset of ${MAX_SKIP}` });
  }

  for (const field of searchFields) {
    const value = req.query[field];
    if (value !== undefined && (typeof value !== 'string' || value.length > MAX_SEARCH_LENGTH)) {
      return res.status(400).json({ error: `${field} must be a string of at most ${MAX_SEARCH_LENGTH} characters` });
    }
  }

  if (req.query.sortBy !== undefined &&
      (typeof req.query.sortBy !== 'string' || !/^[A-Za-z][A-Za-z0-9_.]{0,63}$/.test(req.query.sortBy))) {
    return res.status(400).json({ error: 'Invalid sortBy field' });
  }
  if (req.query.sortOrder !== undefined &&
      !['1', '-1'].includes(req.query.sortOrder)) {
    return res.status(400).json({ error: 'sortOrder must be 1 or -1' });
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.body === undefined) {
      req.body = {};
    } else if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    } else if (hasUnsafeMongoKeys(req.body)) {
      return res.status(400).json({ error: 'Request body contains unsupported keys or is nested too deeply' });
    }
  }

  return next();
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
