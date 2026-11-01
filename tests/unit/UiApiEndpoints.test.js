import loginHandler from '../../ui/pages/api/login.js';
import metricsHandler from '../../ui/pages/api/metrics.js';
import campaignsHandler from '../../ui/pages/api/campaigns.js';
import sessionsHandler from '../../ui/pages/api/sessions.js';
import runScriptHandler from '../../ui/pages/api/runScript.js';

function createMockReqRes({ method = 'GET', body = {}, query = {}, headers = {} } = {}) {
  const req = { method, body, query, headers };
  const res = {
    statusCode: 200,
    headers: {},
    ended: false,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return { req, res };
}

describe('UI API Endpoints (Visual Operations Center)', () => {
  describe('POST /api/login', () => {
    it('rejects unsupported HTTP methods', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      loginHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.body.error).toBe('Method not allowed');
    });

    it('rejects invalid login credentials', () => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        body: { username: 'wrong', password: 'bad' },
      });
      loginHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Invalid username or password');
    });

    it('authenticates valid admin credentials', () => {
      const originalToken = process.env.API_ACCESS_TOKEN;
      process.env.API_ACCESS_TOKEN = 'test_token_at_least_32_characters_long_for_security';

      const { req, res } = createMockReqRes({
        method: 'POST',
        body: {
          username: 'admin',
          password: 'test_token_at_least_32_characters_long_for_security',
        },
      });
      loginHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('test_token_at_least_32_characters_long_for_security');

      process.env.API_ACCESS_TOKEN = originalToken;
    });
  });

  describe('GET /api/metrics', () => {
    it('returns system uptime and active status snapshot', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      metricsHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('activeSessions');
      expect(res.body).toHaveProperty('rateLimit');
    });

    it('rejects non-GET methods', () => {
      const { req, res } = createMockReqRes({ method: 'DELETE' });
      metricsHandler(req, res);
      expect(res.statusCode).toBe(405);
    });
  });

  describe('Campaigns & Sessions APIs', () => {
    it('lists campaigns on GET and supports status toggling on PATCH', async () => {
      const { req: getReq, res: getRes } = createMockReqRes({ method: 'GET' });
      await campaignsHandler(getReq, getRes);
      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.campaigns)).toBe(true);

      const { req: patchReq, res: patchRes } = createMockReqRes({
        method: 'PATCH',
        query: { id: 'camp_test' },
        body: { status: 'paused' },
      });
      await campaignsHandler(patchReq, patchRes);
      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.body.status).toBe('paused');
    });

    it('lists sessions on GET and pings on POST', async () => {
      const { req: getReq, res: getRes } = createMockReqRes({ method: 'GET' });
      await sessionsHandler(getReq, getRes);
      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.sessions)).toBe(true);

      const { req: postReq, res: postRes } = createMockReqRes({
        method: 'POST',
        query: { id: 'session_1' },
      });
      await sessionsHandler(postReq, postRes);
      expect(postRes.statusCode).toBe(200);
      expect(postRes.body.pingStatus).toBe('alive');
    });
  });

  describe('POST /api/runScript Guardrails', () => {
    it('blocks arbitrary or unauthorized scripts', () => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        body: { script: 'malicious_rm_rf' },
      });
      runScriptHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid or unauthorized script');
    });
  });
});

