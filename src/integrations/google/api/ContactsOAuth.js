import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

export const CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts';
export const CONTACTS_EMAIL = 'goraha.properties@gmail.com';
export const CLIENT_PATH = fileURLToPath(new URL('../../../../secrets/goraha-bot-people-app.json', import.meta.url));
export const TOKEN_PATH = fileURLToPath(new URL('../../../../secrets/goraha-contacts-token.json', import.meta.url));

export function createContactsClient(redirectUri, clientPath = CLIENT_PATH) {
  const config = JSON.parse(fs.readFileSync(clientPath, 'utf8')).installed;
  if (!config?.client_id || !config.client_secret) {
    throw new Error('Contacts OAuth requires a downloaded Desktop client JSON.');
  }
  const client = new google.auth.OAuth2(config.client_id, config.client_secret, redirectUri);
  client.transporter.defaults = { ...client.transporter.defaults, timeout: 20000, retry: false };
  return client;
}

export function validateContactsToken(record) {
  if (record.email !== CONTACTS_EMAIL || !record.tokens?.refresh_token) {
    throw new Error('Contacts authorization is missing the expected account or refresh token. Run npm run contacts:authorize.');
  }
  if (!record.tokens.scope?.split(/\s+/).includes(CONTACTS_SCOPE)) {
    throw new Error('Contacts read/write permission was not granted. Run npm run contacts:authorize.');
  }
}

export function saveContactsToken(record, tokenPath = TOKEN_PATH) {
  validateContactsToken(record);
  fs.writeFileSync(tokenPath, JSON.stringify(record, null, 2), { mode: 0o600 });
}

export function loadContactsAuth() {
  const record = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  validateContactsToken(record);
  const client = createContactsClient();
  client.setCredentials(record.tokens);
  client.on('tokens', (tokens) => {
    record.tokens = { ...record.tokens, ...tokens };
    saveContactsToken(record);
  });
  return client;
}
