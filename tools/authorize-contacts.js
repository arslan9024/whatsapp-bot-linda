import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { google } from 'googleapis';
import {
  CONTACTS_EMAIL, CONTACTS_SCOPE, createContactsClient, saveContactsToken,
} from '../src/integrations/google/api/ContactsOAuth.js';

const state = randomBytes(32).toString('hex');
let client;
let verifier;
let busy = false;
let timer;
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method !== 'GET' || url.pathname !== '/oauth2callback') {
    res.writeHead(404).end('Not found');
    return;
  }
  const supplied = Buffer.from(url.searchParams.get('state') || '');
  const expected = Buffer.from(state);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.writeHead(400).end('Invalid authorization state. Use the original sign-in link.');
    return;
  }
  if (busy) {
    res.writeHead(409).end('Authorization is already being processed.');
    return;
  }
  const code = url.searchParams.get('code');
  if (!code && !url.searchParams.has('error')) {
    console.warn('Incomplete OAuth callback received; still waiting for Google authorization.');
    res.writeHead(400).end('Authorization code missing. Complete sign-in using the original Google authorization link. The setup is still waiting.');
    return;
  }
  busy = true;
  try {
    if (url.searchParams.has('error')) {
      throw new Error('Consent denied by Google or the user. Restart authorization to try again.');
    }
    const { tokens } = await client.getToken({ code, codeVerifier: verifier });
    client.setCredentials(tokens);
    const identity = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
    if (identity.data.email !== CONTACTS_EMAIL || !identity.data.verified_email) {
      throw new Error('Wrong Google account. Sign in with the configured Goraha Gmail account.');
    }
    const record = { email: CONTACTS_EMAIL, tokens };
    if (!tokens.refresh_token || !tokens.scope?.split(/\s+/).includes(CONTACTS_SCOPE)) {
      throw new Error('Offline access or Contacts read/write permission was not granted.');
    }
    await google.people({ version: 'v1', auth: client }).people.connections.list({
      resourceName: 'people/me', pageSize: 1, personFields: 'metadata',
      fields: 'connections(resourceName)',
    });
    saveContactsToken(record);
    console.log('PASS: Goraha identity, Contacts read/write scope and read request verified. Token saved under secrets. No contacts changed.');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Linda Contacts authorization complete. You can close this tab. No contacts were changed.');
  } catch (error) {
    const message = error.response
      ? `Google request failed (HTTP ${error.response.status}). Check People API, consent settings and selected account.`
      : error.message;
    console.error(`Contacts authorization failed: ${message}`);
    process.exitCode = 1;
    res.writeHead(400).end('Authorization failed. See the Linda setup terminal. No token was saved.');
  } finally {
    clearTimeout(timer);
    server.close();
  }
});

server.on('error', (error) => {
  clearTimeout(timer);
  console.error(`Contacts callback server failed: ${error.code || 'unknown error'}`);
  process.exitCode = 1;
});
server.listen(0, '127.0.0.1', async () => {
  try {
    const redirect = `http://127.0.0.1:${server.address().port}/oauth2callback`;
    client = createContactsClient(redirect);
    const pkce = await client.generateCodeVerifierAsync();
    verifier = pkce.codeVerifier;
    const url = client.generateAuthUrl({
      access_type: 'offline', prompt: 'consent', state,
      login_hint: CONTACTS_EMAIL,
      scope: [CONTACTS_SCOPE, 'https://www.googleapis.com/auth/userinfo.email'],
      code_challenge: pkce.codeChallenge, code_challenge_method: 'S256',
    });
    console.log(`Callback ready: ${redirect}`);
    console.log(`Sign in as ${CONTACTS_EMAIL}. Open this link on this computer within 10 minutes:`);
    console.log(url);
    timer = setTimeout(() => {
      console.error('Contacts authorization timed out. Run npm run contacts:authorize to retry.');
      process.exitCode = 1;
      server.close();
    }, 10 * 60 * 1000);
  } catch {
    console.error('Cannot initialize Contacts OAuth. Check the Desktop JSON file in secrets.');
    process.exitCode = 1;
    server.close();
  }
});
