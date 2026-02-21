g/**
 * Bot Connection Manager
 * Handles different connection modes:
 * 1. Browser (whatsapp-web.js style)
 * 2. WebSocket (Baileys style)
 * 3. Hybrid (both available, configurable)
 */

import EventEmitter from 'events';

class BotConnection extends EventEmitter {
  constructor(config) {
    super();

    this.config = config;
    this.mode = config.mode; // 'browser', 'websocket', 'hybrid'
    this.client = null;
    this.isConnected = false;
    this.connectTime = null;

    this.log(`Initializing ${this.mode} connection mode`);
  }

  /**
   * Connect using configured mode
   */
  async connect() {
    try {
      switch (this.mode) {
        case 'browser':
          return await this.connectBrowserMode();
        case 'websocket':
          return await this.connectWebSocketMode();
        case 'hybrid':
          return await this.connectHybridMode();
        default:
          throw new Error(`Unknown connection mode: ${this.mode}`);
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Browser Mode (like whatsapp-web.js)
   * Requirements: npm install whatsapp-web.js
   */
  async connectBrowserMode() {
    try {
      this.log('🌐 Connecting via Browser mode (whatsapp-web.js)...');

      // Lazy load whatsapp-web.js
      const { Client, LocalAuth } = await import('whatsapp-web.js');

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.config.sessionName || 'bot-client'
        }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true
        }
      });

      // Setup event listeners
      this.client.on('qr', (qr) => {
        this.log('📱 QR Code generated, scan with your phone');
        this.emit('qr', qr);
      });

      this.client.on('authenticated', () => {
        this.log('✅ Browser mode authenticated');
        this.isConnected = true;
        this.connectTime = Date.now();
        this.emit('authenticated');
      });

      this.client.on('auth_failure', () => {
        this.log('❌ Browser auth failed');
        this.emit('error', new Error('Browser authentication failed'));
      });

      this.client.on('disconnected', () => {
        this.log('⚠️ Browser disconnected');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.client.on('message', (msg) => {
        this.emit('message', {
          from: msg.from,
          body: msg.body,
          timestamp: msg.timestamp,
          isGroup: msg.isGroup,
          author: msg.author
        });
      });

      // Initialize
      await this.client.initialize();
      this.log('✅ Browser mode initialized');

    } catch (error) {
      this.log(`❌ Browser mode error: ${error.message}`);
      throw error;
    }
  }

  /**
   * WebSocket Mode (like Baileys)
   * Requirements: npm install @whiskeysockets/baileys
   */
  async connectWebSocketMode() {
    try {
      this.log('🔌 Connecting via WebSocket mode (Baileys)...');

      // Lazy load Baileys
      const makeWASocket = await import('@whiskeysockets/baileys');
      const sock = makeWASocket.default({
        printQRInTerminal: true,
        auth: undefined, // Load from file if needed
        browser: ['Chrome', '120', '0'], // Simulate Chrome
        version: [2, 3000, 1015901307], // WhatsApp version
        syncFullHistory: false,
        shouldIgnoreJid: (jid) => false,
        retryRequestDelayMs: 100,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        maxMsgsInStore: 200
      });

      this.client = sock;

      // Setup event listeners
      this.client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.log('📱 QR Code generated');
          this.emit('qr', qr);
        }

        if (connection === 'connecting') {
          this.log('🔄 WebSocket connecting...');
        }

        if (connection === 'open') {
          this.log('✅ WebSocket mode authenticated');
          this.isConnected = true;
          this.connectTime = Date.now();
          this.emit('authenticated');
        }

        if (connection === 'close') {
          this.log('⚠️ WebSocket disconnected');
          this.isConnected = false;
          
          // Check if should reconnect
          const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !==
            DisconnectReason.loggedOut;

          if (shouldReconnect) {
            this.emit('disconnected');
          }
        }
      });

      this.client.ev.on('messages.upsert', ({ messages }) => {
        for (const msg of messages) {
          if (!msg.message) continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

          this.emit('message', {
            from: msg.key.remoteJid,
            body: text,
            timestamp: msg.messageTimestamp,
            isGroup: msg.key.remoteJid?.includes('@g.us'),
            author: msg.key.participant
          });
        }
      });

      this.log('✅ WebSocket mode initialized');

    } catch (error) {
      this.log(`❌ WebSocket mode error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hybrid Mode
   * Tries browser first, falls back to websocket
   */
  async connectHybridMode() {
    try {
      this.log('⚡ Hybrid mode: Attempting browser first...');
      
      try {
        await this.connectBrowserMode();
        this.mode = 'browser';
        return;
      } catch (browserError) {
        this.log(`Browser failed, falling back to WebSocket: ${browserError.message}`);
        
        try {
          await this.connectWebSocketMode();
          this.mode = 'websocket';
          return;
        } catch (wsError) {
          this.log(`WebSocket also failed: ${wsError.message}`);
          throw new Error(`Both connection methods failed. Browser: ${browserError.message}. WebSocket: ${wsError.message}`);
        }
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send message using active connection
   */
  async sendMessage(chatId, text, options = {}) {
    if (!this.isConnected) {
      throw new Error('Bot not connected');
    }

    try {
      switch (this.mode) {
        case 'browser':
          return await this.sendMessageBrowser(chatId, text, options);
        case 'websocket':
          return await this.sendMessageWebSocket(chatId, text, options);
        default:
          throw new Error(`Unknown mode: ${this.mode}`);
      }
    } catch (error) {
      this.log(`Send error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send via browser
   */
  async sendMessageBrowser(chatId, text, options) {
    const chat = await this.client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);
    
    await chat.sendMessage(text, options);
    return { chatId, text, sent: true };
  }

  /**
   * Send via websocket
   */
  async sendMessageWebSocket(chatId, text, options) {
    await this.client.sendMessage(chatId, { text, ...options });
    return { chatId, text, sent: true };
  }

  /**
   * Disconnect
   */
  async disconnect() {
    if (!this.client) return;

    try {
      if (this.mode === 'browser') {
        await this.client.destroy();
      } else if (this.mode === 'websocket') {
        await this.client.end();
      }
      this.isConnected = false;
    } catch (error) {
      this.log(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Get uptime
   */
  getUptime() {
    if (!this.connectTime) return 0;
    return Date.now() - this.connectTime;
  }

  /**
   * Logging utility
   */
  log(message) {
    console.log(`[BotConnection] [${this.mode}] ${message}`);
  }
}

export default BotConnection;
