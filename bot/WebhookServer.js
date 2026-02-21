/**
 * Webhook Server
 * Handles incoming webhooks from external services:
 * - Twilio callbacks
 * - Payment notifications
 * - API event callbacks
 * - Administrative commands
 */

import express from 'express';
import EventEmitter from 'events';

class WebhookServer extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = config;
    this.port = config.port || 3001;
    this.host = config.host || 'localhost';
    this.app = express();
    this.server = null;

    // Middleware setup
    this.setupMiddleware();
    this.setupRoutes();

    this.log(`WebhookServer initialized on ${this.host}:${this.port}`);
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // JSON parser with limit
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      this.log(`${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((err, req, res, next) => {
      this.log(`Error: ${err.message}`);
      res.status(400).json({ error: err.message });
    });
  }

  /**
   * Setup webhook routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Twilio webhook
    this.app.post('/webhook/twilio', (req, res) => {
      this.handleTwilioWebhook(req, res);
    });

    // Payment webhook
    this.app.post('/webhook/payment', (req, res) => {
      this.handlePaymentWebhook(req, res);
    });

    // API event webhook
    this.app.post('/webhook/event', (req, res) => {
      this.handleEventWebhook(req, res);
    });

    // Admin webhook
    this.app.post('/webhook/admin', (req, res) => {
      this.handleAdminWebhook(req, res);
    });

    // Generic webhook
    this.app.post('/webhook/:service', (req, res) => {
      this.handleGenericWebhook(req, res);
    });
  }

  /**
   * Handle Twilio webhook
   * Expected: { MessageSid, AccountSid, From, To, Body, NumMedia, ...media fields }
   */
  handleTwilioWebhook(req, res) {
    try {
      const webhook = {
        service: 'twilio',
        timestamp: Date.now(),
        messageId: req.body.MessageSid,
        from: req.body.From,
        to: req.body.To,
        body: req.body.Body,
        mediaCount: parseInt(req.body.NumMedia || 0),
        raw: req.body
      };

      // Extract media URLs if present
      if (webhook.mediaCount > 0) {
        webhook.media = [];
        for (let i = 0; i < webhook.mediaCount; i++) {
          const mediaUrl = req.body[`MediaUrl${i}`];
          const mediaType = req.body[`MediaContentType${i}`];
          if (mediaUrl) {
            webhook.media.push({ url: mediaUrl, type: mediaType });
          }
        }
      }

      this.emit('twilio', webhook);
      res.json({ success: true, messageId: webhook.messageId });
    } catch (error) {
      this.log(`Twilio error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle payment webhook
   * Expected: { transactionId, amount, currency, status, orderId, ...payment fields }
   */
  handlePaymentWebhook(req, res) {
    try {
      const webhook = {
        service: 'payment',
        timestamp: Date.now(),
        transactionId: req.body.transactionId,
        amount: req.body.amount,
        currency: req.body.currency,
        status: req.body.status,
        orderId: req.body.orderId,
        metadata: req.body.metadata || {},
        raw: req.body
      };

      // Validate payment
      if (!this.validatePaymentWebhook(webhook)) {
        return res.status(400).json({ error: 'Invalid payment webhook' });
      }

      this.emit('payment', webhook);
      res.json({ success: true, transactionId: webhook.transactionId });
    } catch (error) {
      this.log(`Payment error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle event webhook
   * Expected: { eventType, entityType, entityId, data, ...event fields }
   */
  handleEventWebhook(req, res) {
    try {
      const webhook = {
        service: 'event',
        timestamp: Date.now(),
        eventType: req.body.eventType,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        data: req.body.data || {},
        raw: req.body
      };

      this.emit('event', webhook);
      res.json({ success: true, eventType: webhook.eventType });
    } catch (error) {
      this.log(`Event error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle admin webhook
   * Expected: { command, params, secret }
   */
  handleAdminWebhook(req, res) {
    try {
      // Verify secret
      if (req.body.secret !== this.config.adminSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const webhook = {
        service: 'admin',
        timestamp: Date.now(),
        command: req.body.command,
        params: req.body.params || {},
        raw: req.body
      };

      this.emit('admin', webhook);
      res.json({ success: true, command: webhook.command });
    } catch (error) {
      this.log(`Admin error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle generic webhook
   */
  handleGenericWebhook(req, res) {
    try {
      const webhook = {
        service: req.params.service,
        timestamp: Date.now(),
        data: req.body
      };

      this.emit(`webhook:${req.params.service}`, webhook);
      res.json({ success: true, service: webhook.service });
    } catch (error) {
      this.log(`Webhook error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Validate payment webhook
   */
  validatePaymentWebhook(webhook) {
    // Check required fields
    if (!webhook.transactionId || !webhook.amount || !webhook.status) {
      return false;
    }

    // Validate amount
    if (isNaN(webhook.amount) || webhook.amount <= 0) {
      return false;
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'disputed'];
    if (!validStatuses.includes(webhook.status)) {
      return false;
    }

    return true;
  }

  /**
   * Start server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          this.log(`✅ Webhook server running on http://${this.host}:${this.port}`);
          this.emit('started');
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          this.log(`❌ Server error: ${error.message}`);
          this.emit('error', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop server
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      try {
        this.server.close(() => {
          this.log('✅ Webhook server stopped');
          this.emit('stopped');
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Register webhook handler
   */
  on(event, callback) {
    super.on(event, callback);
    this.log(`Registered handler for event: ${event}`);
  }

  /**
   * Logging utility
   */
  log(message) {
    console.log(`[WebhookServer] ${message}`);
  }
}

export default WebhookServer;
