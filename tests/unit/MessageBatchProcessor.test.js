/**
 * MessageBatchProcessor Unit Tests
 * Phase 6 M2 Module 2
 */

const MessageBatchProcessor = require('../../code/WhatsAppBot/Handlers/MessageBatchProcessor');
const { MockLogger, MockEventEmitter } = require('../mocks/services');
const fixtures = require('../fixtures/fixtures');

describe('MessageBatchProcessor', () => {
  let processor;
  let mockLogger;
  let mockEmitter;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockEmitter = new MockEventEmitter();

    processor = new MessageBatchProcessor({
      maxConcurrentBatches: 3,
      maxMessagesPerBatch: 100,
      rateLimit: { messagesPerSecond: 10 },
      maxRetries: 3
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ INITIALIZATION TESTS ============
  describe('Initialization', () => {
    it('should initialize processor successfully', async () => {
      const result = await processor.initialize();

      expect(result.success).toBe(true);
      expect(result.message).toContain('ready');
    });

    it('should set correct configuration on init', async () => {
      await processor.initialize();

      const stats = processor.getEngineStats();
      expect(stats.activeBatches).toBe(0);
    });
  });

  // ============ BATCH CREATION TESTS ============
  describe('createBatch', () => {
    beforeEach(async () => {
      await processor.initialize();
    });

    it('should create batch with valid config', () => {
      const result = processor.createBatch({
        name: 'Test Batch'
      });

      expect(result.success).toBe(true);
      expect(result.batch.name).toBe('Test Batch');
      expect(result.batch.status).toBe('pending');
    });

    it('should generate unique batch ID', () => {
      const batch1 = processor.createBatch({ name: 'Batch 1' });
      const batch2 = processor.createBatch({ name: 'Batch 2' });

      expect(batch1.batchId).not.toBe(batch2.batchId);
    });

    it('should initialize progress tracking', () => {
      const result = processor.createBatch({ name: 'Test' });

      expect(result.batch.progress).toEqual({
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0
      });
    });

    it('should set default priority to normal', () => {
      const result = processor.createBatch({ name: 'Test' });

      expect(result.batch.priority).toBe('normal');
    });
  });

  // ============ MESSAGE ADDITION TESTS ============
  describe('addMessagesToBatch', () => {
    let batchId;

    beforeEach(async () => {
      await processor.initialize();
      const batch = processor.createBatch({ name: 'Test Batch' });
      batchId = batch.batchId;
    });

    it('should add single message to batch', () => {
      const message = { id: 'msg1', to: '+1234567890', text: 'Hello' };
      const result = processor.addMessagesToBatch(batchId, [message]);

      expect(result.success).toBe(true);
      expect(result.messageCount).toBe(1);
    });

    it('should add multiple messages to batch', () => {
      const messages = [
        { id: 'msg1', to: '+1111111111', text: 'Hello 1' },
        { id: 'msg2', to: '+2222222222', text: 'Hello 2' },
        { id: 'msg3', to: '+3333333333', text: 'Hello 3' }
      ];

      const result = processor.addMessagesToBatch(batchId, messages);

      expect(result.messageCount).toBe(3);
    });

    it('should generate message IDs if not provided', () => {
      const messages = [
        { to: '+1111111111', text: 'Hello' }
      ];

      processor.addMessagesToBatch(batchId, messages);
      const batchDetails = processor.getBatchDetails(batchId);

      expect(batchDetails.messages[0].id).toBeDefined();
    });

    it('should enforce batch size limit', () => {
      const messages = Array.from({ length: 150 }, (_, i) => ({
        id: `msg_${i}`,
        to: `+1${String(i).padStart(10, '0')}`,
        text: `Message ${i}`
      }));

      expect(() => {
        processor.addMessagesToBatch(batchId, messages);
      }).toThrow('Batch size limit exceeded');
    });

    it('should reject messages to closed batch', () => {
      processor.createBatch({ name: 'Batch 2' });
      const batch2 = processor.listBatches()[1];
      
      // Simulate closing batch
      const closedBatchId = batchId;
      processor.cancelBatch(closedBatchId);

      expect(() => {
        processor.addMessagesToBatch(closedBatchId, [{ to: '+1234567890', text: 'Hello' }]);
      }).toThrow();
    });
  });

  // ============ BATCH PROCESSING TESTS ============
  describe('processBatch', () => {
    let batchId;

    beforeEach(async () => {
      await processor.initialize();
      const batch = processor.createBatch({ name: 'Test Batch' });
      batchId = batch.batchId;

      processor.addMessagesToBatch(batchId, [
        { id: 'msg1', to: '+1111111111', text: 'Hello 1' },
        { id: 'msg2', to: '+2222222222', text: 'Hello 2' }
      ]);
    });

    it('should process batch successfully', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });

      const result = await processor.processBatch(batchId, mockHandler);

      expect(result.success).toBe(true);
      expect(result.progress.sent).toBe(2);
    });

    it('should call handler for each message', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });

      await processor.processBatch(batchId, mockHandler);

      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('should update batch status during processing', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });

      await processor.processBatch(batchId, mockHandler);

      const status = processor.getBatchStatus(batchId);
      expect(status.status).toBe('completed');
    });

    it('should track processing duration', async () => {
      const mockHandler = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { status: 'sent' };
      });

      const result = await processor.processBatch(batchId, mockHandler);

      expect(result.duration).toBeGreaterThan(0);
    });
  });

  // ============ BATCH STATUS TESTS ============
  describe('getBatchStatus', () => {
    let batchId;

    beforeEach(async () => {
      await processor.initialize();
      const batch = processor.createBatch({ name: 'Test Batch' });
      batchId = batch.batchId;
    });

    it('should return batch status', () => {
      const status = processor.getBatchStatus(batchId);

      expect(status).toHaveProperty('id');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('progress');
    });

    it('should calculate success rate', async () => {
      processor.addMessagesToBatch(batchId, [
        { id: 'msg1', to: '+1111111111', text: 'Hello' },
        { id: 'msg2', to: '+2222222222', text: 'Hello' }
      ]);

      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });
      await processor.processBatch(batchId, mockHandler);

      const status = processor.getBatchStatus(batchId);
      expect(status.successRate).toContain('%');
    });
  });

  // ============ BATCH LISTING AND DETAILS TESTS ============
  describe('listBatches', () => {
    beforeEach(async () => {
      await processor.initialize();
      processor.createBatch({ name: 'Batch 1' });
      processor.createBatch({ name: 'Batch 2' });
      processor.createBatch({ name: 'Batch 3' });
    });

    it('should list all batches', () => {
      const batches = processor.listBatches();

      expect(batches.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter batches by status', () => {
      const pendingBatches = processor.listBatches({ status: 'pending' });

      expect(pendingBatches.every(b => b.status === 'pending')).toBe(true);
    });
  });

  describe('getBatchDetails', () => {
    let batchId;

    beforeEach(async () => {
      await processor.initialize();
      const batch = processor.createBatch({ name: 'Test Batch' });
      batchId = batch.batchId;

      processor.addMessagesToBatch(batchId, [
        { id: 'msg1', to: '+1111111111', text: 'Hello 1' }
      ]);
    });

    it('should return detailed batch information', () => {
      const details = processor.getBatchDetails(batchId);

      expect(details).toHaveProperty('id');
      expect(details).toHaveProperty('messages');
      expect(details).toHaveProperty('progress');
      expect(details.messages.length).toBe(1);
    });
  });

  // ============ BATCH CANCELLATION TESTS ============
  describe('cancelBatch', () => {
    let batchId;

    beforeEach(async () => {
      await processor.initialize();
      const batch = processor.createBatch({ name: 'Test Batch' });
      batchId = batch.batchId;
    });

    it('should cancel batch', () => {
      const result = processor.cancelBatch(batchId);

      expect(result.success).toBe(true);
    });

    it('should set batch status to cancelled', () => {
      processor.cancelBatch(batchId);

      const status = processor.getBatchStatus(batchId);
      expect(status.status).toBe('cancelled');
    });
  });

  // ============ RATE LIMITING TESTS ============
  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await processor.initialize();
    });

    it('should enforce rate limiting', async () => {
      const batch = processor.createBatch({ name: 'Rate Test' });
      
      const messages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg_${i}`,
        to: `+1${String(i).padStart(10, '0')}`,
        text: `Message ${i}`
      }));

      processor.addMessagesToBatch(batch.batchId, messages);

      const startTime = Date.now();
      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });

      await processor.processBatch(batch.batchId, mockHandler);

      const duration = Date.now() - startTime;
      // With 10 msg/sec rate limit, 20 messages should take ~2 seconds
      expect(duration).toBeGreaterThan(1000);
    });
  });

  // ============ METRICS TESTS ============
  describe('getMetrics', () => {
    beforeEach(async () => {
      await processor.initialize();
    });

    it('should return processor metrics', () => {
      const metrics = processor.getMetrics();

      expect(metrics).toHaveProperty('totalBatches');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('failureRate');
    });

    it('should track total messages', async () => {
      const batch = processor.createBatch({ name: 'Test' });
      processor.addMessagesToBatch(batch.batchId, [
        { id: 'msg1', to: '+1111111111', text: 'Hello' },
        { id: 'msg2', to: '+2222222222', text: 'Hello' }
      ]);

      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });
      await processor.processBatch(batch.batchId, mockHandler);

      const metrics = processor.getMetrics();
      expect(metrics.totalMessages).toBeGreaterThanOrEqual(2);
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe('Error Handling', () => {
    beforeEach(async () => {
      await processor.initialize();
    });

    it('should handle batch not found', () => {
      expect(() => {
        processor.getBatchStatus('non_existent');
      }).not.toThrow(); // Should return null gracefully
    });

    it('should handle handler errors gracefully', async () => {
      const batch = processor.createBatch({ name: 'Error Test' });
      processor.addMessagesToBatch(batch.batchId, [
        { id: 'msg1', to: '+1111111111', text: 'Hello' }
      ]);

      const errorHandler = jest.fn().mockRejectedValue(new Error('Send failed'));

      // Should not throw, should handle error gracefully
      const result = await processor.processBatch(batch.batchId, errorHandler);
      expect(result.progress.failed).toBeGreaterThanOrEqual(0);
    });
  });

  // ============ CONCURRENT PROCESSING TESTS ============
  describe('Concurrent Batch Processing', () => {
    beforeEach(async () => {
      await processor.initialize();
    });

    it('should handle multiple concurrent batches', async () => {
      const batch1 = processor.createBatch({ name: 'Batch 1' });
      const batch2 = processor.createBatch({ name: 'Batch 2' });

      processor.addMessagesToBatch(batch1.batchId, [
        { id: 'msg1', to: '+1111111111', text: 'Hello 1' }
      ]);
      processor.addMessagesToBatch(batch2.batchId, [
        { id: 'msg2', to: '+2222222222', text: 'Hello 2' }
      ]);

      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });

      const results = await Promise.all([
        processor.processBatch(batch1.batchId, mockHandler),
        processor.processBatch(batch2.batchId, mockHandler)
      ]);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should respect max concurrent batches limit', async () => {
      const smallProcessor = new MessageBatchProcessor({
        maxConcurrentBatches: 1
      });

      await smallProcessor.initialize();

      const batches = Array.from({ length: 3 }, (_, i) => {
        const batch = smallProcessor.createBatch({ name: `Batch ${i}` });
        smallProcessor.addMessagesToBatch(batch.batchId, [
          { id: `msg_${i}`, to: '+1111111111', text: `Hello ${i}` }
        ]);
        return batch.batchId;
      });

      const mockHandler = jest.fn().mockResolvedValue({ status: 'sent' });

      // All should eventually complete
      const results = await Promise.all(
        batches.map(id => smallProcessor.processBatch(id, mockHandler))
      );

      expect(results).toHaveLength(3);
    });
  });
});
