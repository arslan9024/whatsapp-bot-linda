import {
  assertApiAccessToken,
  getApiCorsOptions,
  requireApiPermission,
  requireApiToken,
} from '../../code/middleware/apiSecurity.js';

describe('API security middleware', () => {
  const originalToken = process.env.API_ACCESS_TOKEN;
  const originalReadToken = process.env.API_READ_TOKEN;
  const originalMessagingToken = process.env.API_MESSAGING_TOKEN;
  const originalOrigins = process.env.API_CORS_ORIGINS;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.API_ACCESS_TOKEN;
    } else {
      process.env.API_ACCESS_TOKEN = originalToken;
    }
    for (const [name, value] of [
      ['API_READ_TOKEN', originalReadToken],
      ['API_MESSAGING_TOKEN', originalMessagingToken],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }

    if (originalOrigins === undefined) {
      delete process.env.API_CORS_ORIGINS;
    } else {
      process.env.API_CORS_ORIGINS = originalOrigins;
    }
  });

  it('requires a sufficiently long API token at startup', () => {
    delete process.env.API_ACCESS_TOKEN;
    expect(() => assertApiAccessToken()).toThrow(/at least 32 characters/);

    process.env.API_ACCESS_TOKEN = 'a'.repeat(32);
    expect(assertApiAccessToken()).toBe('a'.repeat(32));
  });

  it('rejects missing and invalid bearer tokens', () => {
    process.env.API_ACCESS_TOKEN = 'a'.repeat(32);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireApiToken({ get: () => undefined }, response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();

    requireApiToken({ get: () => 'Bearer wrong' }, response, next);
    expect(response.status).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed when authentication is not configured', () => {
    delete process.env.API_ACCESS_TOKEN;
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireApiToken({ get: () => 'Bearer any-token' }, response, next);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a matching bearer token', () => {
    const token = 'b'.repeat(32);
    process.env.API_ACCESS_TOKEN = token;
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireApiToken({ get: () => `Bearer ${token}` }, response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('allows only configured browser origins', () => {
    process.env.API_CORS_ORIGINS = 'https://app.example, https://admin.example';
    const options = getApiCorsOptions();
    const callback = jest.fn();

    options.origin('https://app.example', callback);
    options.origin('https://untrusted.example', callback);
    options.origin(undefined, callback);

    expect(callback.mock.calls).toEqual([
      [null, true],
      [null, false],
      [null, true],
    ]);
    expect(options.allowedHeaders).toContain('Idempotency-Key');
  });

  it('restricts scoped credentials to their permitted routes', () => {
    process.env.API_ACCESS_TOKEN = 'a'.repeat(32);
    process.env.API_READ_TOKEN = 'r'.repeat(32);
    process.env.API_MESSAGING_TOKEN = 'm'.repeat(32);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireApiToken({ get: () => `Bearer ${process.env.API_READ_TOKEN}` }, response, next);
    const readReq = { apiRole: 'read', method: 'GET', originalUrl: '/api/people' };
    requireApiPermission(readReq, response, next);
    expect(readReq.apiRole).toBe('read');
    expect(next).toHaveBeenCalledTimes(2);

    const writeReq = { apiRole: 'read', method: 'DELETE', originalUrl: '/api/people/1' };
    requireApiPermission(writeReq, response, next);
    expect(response.status).toHaveBeenCalledWith(403);

    const messagingReq = { apiRole: 'messaging', method: 'POST', originalUrl: '/api/communications/send' };
    requireApiPermission(messagingReq, response, next);
    expect(next).toHaveBeenCalledTimes(3);

    const legacyMessagingReq = { apiRole: 'messaging', method: 'POST', originalUrl: '/api/v1/damac/communication/send' };
    requireApiPermission(legacyMessagingReq, response, next);
    expect(next).toHaveBeenCalledTimes(4);
  });
});
