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

module.exports = {
  MockWhatsAppClient,
  MockMongoDb,
  MockGoogleApi,
  MockLogger,
  MockFileService,
  MockEventEmitter,

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
