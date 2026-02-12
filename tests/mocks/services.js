/**
 * Mock Services for Testing
 * Provides mock implementations of all external services
 */

/**
 * Mock WhatsApp Client
 */
class MockWhatsAppClient {
  constructor(options = {}) {
    this.isConnected = true;
    this.messages = [];
    this.groups = [];
    this.contacts = [];
    this.options = options;
  }

  async sendMessage(to, message) {
    if (!this.isConnected) {
      throw new Error('WhatsApp client not connected');
    }

    const msg = {
      id: `msg_${Date.now()}`,
      to,
      message,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    this.messages.push(msg);
    return msg;
  }

  async downloadMedia(mediaId) {
    return Buffer.from(`mock-media-data-${mediaId}`);
  }

  async uploadFile(filePath) {
    return {
      id: `media_${Date.now()}`,
      filePath,
      size: Math.floor(Math.random() * 10000000),
      uploaded: true
    };
  }

  async createGroup(name, participants) {
    const group = {
      id: `group_${Date.now()}`,
      name,
      participants,
      created: new Date().toISOString()
    };

    this.groups.push(group);
    return group;
  }

  async getGroupInfo(groupId) {
    return this.groups.find(g => g.id === groupId) || null;
  }

  async disconnect() {
    this.isConnected = false;
  }

  async connect() {
    this.isConnected = true;
  }

  getMessages() {
    return this.messages;
  }

  getGroups() {
    return this.groups;
  }

  reset() {
    this.messages = [];
    this.groups = [];
    this.contacts = [];
  }
}

/**
 * Mock MongoDB
 */
class MockMongoDb {
  constructor() {
    this.data = {};
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }

    return {
      insertOne: jest.fn(async (doc) => {
        const withId = { _id: `${Date.now()}`, ...doc };
        this.data[name].push(withId);
        return { insertedId: withId._id };
      }),

      insertMany: jest.fn(async (docs) => {
        const inserted = docs.map(doc => ({
          _id: `${Date.now()}_${Math.random()}`,
          ...doc
        }));

        this.data[name].push(...inserted);
        return { insertedIds: inserted.map(d => d._id) };
      }),

      findOne: jest.fn(async (query) => {
        return this.data[name].find(doc =>
          Object.keys(query).every(key => doc[key] === query[key])
        ) || null;
      }),

      find: jest.fn(async (query = {}) => {
        return this.data[name].filter(doc =>
          Object.keys(query).every(key => doc[key] === query[key])
        );
      }),

      updateOne: jest.fn(async (query, update) => {
        const index = this.data[name].findIndex(doc =>
          Object.keys(query).every(key => doc[key] === query[key])
        );

        if (index !== -1) {
          this.data[name][index] = { ...this.data[name][index], ...update.$set };
          return { modifiedCount: 1 };
        }

        return { modifiedCount: 0 };
      }),

      deleteOne: jest.fn(async (query) => {
        const index = this.data[name].findIndex(doc =>
          Object.keys(query).every(key => doc[key] === query[key])
        );

        if (index !== -1) {
          this.data[name].splice(index, 1);
          return { deletedCount: 1 };
        }

        return { deletedCount: 0 };
      }),

      countDocuments: jest.fn(async (query = {}) => {
        return this.data[name].filter(doc =>
          Object.keys(query).every(key => doc[key] === query[key])
        ).length;
      })
    };
  }

  async connect() {
    return this;
  }

  async disconnect() {
    this.data = {};
  }

  reset() {
    this.data = {};
  }
}

/**
 * Mock Google APIs
 */
class MockGoogleApi {
  constructor() {
    this.contacts = [];
    this.sheets = [];
  }

  async listContacts(options = {}) {
    return {
      contacts: this.contacts.slice(0, options.maxResults || 10),
      nextPage: this.contacts.length > (options.maxResults || 10) ? 'next' : null
    };
  }

  async createContact(contact) {
    const newContact = {
      id: `contact_${Date.now()}`,
      ...contact,
      created: new Date().toISOString()
    };

    this.contacts.push(newContact);
    return newContact;
  }

  async updateContact(contactId, updates) {
    const index = this.contacts.findIndex(c => c.id === contactId);

    if (index !== -1) {
      this.contacts[index] = { ...this.contacts[index], ...updates };
      return this.contacts[index];
    }

    return null;
  }

  async deleteContact(contactId) {
    const index = this.contacts.findIndex(c => c.id === contactId);

    if (index !== -1) {
      this.contacts.splice(index, 1);
      return true;
    }

    return false;
  }

  async listSheets(options = {}) {
    return {
      sheets: this.sheets,
      totalCount: this.sheets.length
    };
  }

  async createSheet(title, headers = []) {
    const newSheet = {
      id: `sheet_${Date.now()}`,
      title,
      headers,
      rows: [],
      created: new Date().toISOString()
    };

    this.sheets.push(newSheet);
    return newSheet;
  }

  async appendRow(sheetId, row) {
    const sheet = this.sheets.find(s => s.id === sheetId);

    if (sheet) {
      sheet.rows.push({
        id: `row_${Date.now()}`,
        values: row,
        timestamp: new Date().toISOString()
      });

      return { appended: true, rowCount: sheet.rows.length };
    }

    return { appended: false };
  }

  reset() {
    this.contacts = [];
    this.sheets = [];
  }
}

/**
 * Mock Logger
 */
class MockLogger {
  constructor() {
    this.logs = [];
  }

  info(message, data = {}) {
    this.logs.push({ level: 'info', message, data, timestamp: new Date().toISOString() });
  }

  error(message, data = {}) {
    this.logs.push({ level: 'error', message, data, timestamp: new Date().toISOString() });
  }

  warn(message, data = {}) {
    this.logs.push({ level: 'warn', message, data, timestamp: new Date().toISOString() });
  }

  debug(message, data = {}) {
    this.logs.push({ level: 'debug', message, data, timestamp: new Date().toISOString() });
  }

  getLogs() {
    return this.logs;
  }

  getLogsByLevel(level) {
    return this.logs.filter(l => l.level === level);
  }

  reset() {
    this.logs = [];
  }
}

/**
 * Mock File Service
 */
class MockFileService {
  constructor(options = {}) {
    this.files = new Map();
    this.uploadedFiles = [];
    this.options = options;
  }

  async downloadFile(fileId) {
    if (!this.files.has(fileId)) {
      throw new Error(`File not found: ${fileId}`);
    }
    return this.files.get(fileId);
  }

  async uploadFile(filePath, fileData) {
    const fileId = `file_${Date.now()}`;
    this.files.set(fileId, fileData);
    this.uploadedFiles.push({
      id: fileId,
      path: filePath,
      size: fileData.length,
      uploaded: new Date().toISOString()
    });
    return {
      id: fileId,
      path: filePath,
      size: fileData.length
    };
  }

  async deleteFile(fileId) {
    if (this.files.has(fileId)) {
      this.files.delete(fileId);
      return true;
    }
    return false;
  }

  async getFileInfo(fileId) {
    if (this.files.has(fileId)) {
      return {
        id: fileId,
        size: this.files.get(fileId).length,
        exists: true
      };
    }
    return null;
  }

  async ensureDirExists(dirPath) {
    return dirPath;
  }

  async saveFile(filePath, fileData) {
    return this.uploadFile(filePath, fileData);
  }

  async readFile(filePath) {
    // In tests, return mock file data
    return Buffer.from(`mock-file-data-${filePath}`);
  }

  reset() {
    this.files.clear();
    this.uploadedFiles = [];
  }
}

/**
 * Mock Event Emitter
 */
class MockEventEmitter {
  constructor() {
    this.listeners = {};
    this.eventLog = [];
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
    return this;
  }

  once(event, callback) {
    const wrappedCallback = (...args) => {
      callback(...args);
      this.off(event, wrappedCallback);
    };

    return this.on(event, wrappedCallback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    return this;
  }

  emit(event, data = {}) {
    this.eventLog.push({ event, data, timestamp: new Date().toISOString() });

    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }

    return this;
  }

  getEvents() {
    return this.eventLog;
  }

  getEventsByName(eventName) {
    return this.eventLog.filter(e => e.event === eventName);
  }

  reset() {
    this.listeners = {};
    this.eventLog = [];
  }
}

/**
 * MockRedis - Simulates Redis cache for testing
 * Implements: set, get, del, exists, incr, expire, flushAll, keys, ttl
 */
class MockRedis {
  constructor() {
    this.store = {};
    this.expirations = {};
    this.callCount = {};
  }

  set(key, value, options = {}) {
    this.store[key] = JSON.stringify(value);
    this.callCount.set = (this.callCount.set || 0) + 1;
    
    if (options.EX) {
      const expiryTime = Date.now() + (options.EX * 1000);
      this.expirations[key] = expiryTime;
    }
    
    return 'OK';
  }

  get(key) {
    this.callCount.get = (this.callCount.get || 0) + 1;
    
    // Check if key has expired
    if (this.expirations[key] && Date.now() > this.expirations[key]) {
      delete this.store[key];
      delete this.expirations[key];
      return null;
    }
    
    if (!(key in this.store)) return null;
    try {
      return JSON.parse(this.store[key]);
    } catch {
      return this.store[key];
    }
  }

  del(key) {
    this.callCount.del = (this.callCount.del || 0) + 1;
    if (key in this.store) {
      delete this.store[key];
      delete this.expirations[key];
      return 1;
    }
    return 0;
  }

  exists(key) {
    if (this.expirations[key] && Date.now() > this.expirations[key]) {
      delete this.store[key];
      delete this.expirations[key];
      return 0;
    }
    return key in this.store ? 1 : 0;
  }

  incr(key) {
    this.callCount.incr = (this.callCount.incr || 0) + 1;
    const current = this.get(key) || 0;
    const newValue = parseInt(current) + 1;
    this.set(key, newValue);
    return newValue;
  }

  expire(key, seconds) {
    if (!(key in this.store)) return 0;
    const expiryTime = Date.now() + (seconds * 1000);
    this.expirations[key] = expiryTime;
    return 1;
  }

  ttl(key) {
    if (!(key in this.store)) return -2;
    if (!this.expirations[key]) return -1;
    
    const remaining = Math.ceil((this.expirations[key] - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  keys(pattern = '*') {
    const allKeys = Object.keys(this.store).filter(key => {
      // Check expiration
      if (this.expirations[key] && Date.now() > this.expirations[key]) {
        delete this.store[key];
        delete this.expirations[key];
        return false;
      }
      return true;
    });

    if (pattern === '*') return allKeys;
    
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    
    return allKeys.filter(key => regex.test(key));
  }

  flushAll() {
    this.store = {};
    this.expirations = {};
    return 'OK';
  }

  mget(...keys) {
    return keys.map(key => this.get(key));
  }

  mset(...args) {
    for (let i = 0; i < args.length; i += 2) {
      this.set(args[i], args[i + 1]);
    }
    return 'OK';
  }

  getStats() {
    return {
      totalKeys: Object.keys(this.store).length,
      callCounts: this.callCount,
      hitRate: this.calculateHitRate(),
    };
  }

  calculateHitRate() {
    const gets = this.callCount.get || 0;
    if (gets === 0) return 100;
    const hits = gets - (this.callCount.misses || 0);
    return Math.round((hits / gets) * 100);
  }

  reset() {
    this.store = {};
    this.expirations = {};
    this.callCount = {};
  }
}

module.exports = {
  MockWhatsAppClient,
  MockMongoDb,
  MockGoogleApi,
  MockLogger,
  MockFileService,
  MockEventEmitter,
  MockRedis,

  /**
   * Create test services object
   */
  createMockServices: (options = {}) => ({
    whatsappClient: new MockWhatsAppClient(options.whatsappOptions),
    mongodb: new MockMongoDb(),
    googleApi: new MockGoogleApi(),
    logger: new MockLogger(),
    eventEmitter: new MockEventEmitter()
  }),

  /**
   * Create mock with spy capabilities
   */
  createSpiedMock: (implementation) => {
    const mock = jest.fn(implementation);
    mock.calls = [];

    return mock;
  }
};
