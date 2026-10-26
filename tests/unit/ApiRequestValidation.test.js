import { escapeRegex, validateApiRequest } from '../../code/middleware/apiRequestValidation.js';

describe('API request validation', () => {
  function run(query = {}, body = {}, method = 'GET') {
    const req = { query, body, method };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    validateApiRequest(req, res, next);
    return { res, next };
  }

  it('rejects malformed and excessive pagination limits', () => {
    expect(run({ page: '0' }).res.status).toHaveBeenCalledWith(400);
    expect(run({ limit: '101' }).res.status).toHaveBeenCalledWith(400);
    expect(run({ skip: '999999999999999999999' }).res.status).toHaveBeenCalledWith(400);
    expect(run({ sortOrder: '2' }).res.status).toHaveBeenCalledWith(400);
    expect(run({ limit: '20' }).next).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized searches and unsafe Mongo keys', () => {
    expect(run({ search: 'x'.repeat(201) }).res.status).toHaveBeenCalledWith(400);
    expect(run({}, { filter: { $where: 'return true' } }, 'POST').res.status).toHaveBeenCalledWith(400);
  });

  it('requires a JSON object for mutation requests and escapes regex input', () => {
    expect(run({}, [], 'POST').res.status).toHaveBeenCalledWith(400);
    expect(escapeRegex('unit.*')).toBe('unit\\.\\*');
    expect(run({}, { name: 'Linda' }, 'POST').next).toHaveBeenCalledTimes(1);

    const req = { method: 'POST', query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    validateApiRequest(req, res, jest.fn());
    expect(req.body).toEqual({});
  });
});
