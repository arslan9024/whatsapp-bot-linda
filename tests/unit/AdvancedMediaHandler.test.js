/**
 * AdvancedMediaHandler Unit Tests
 * Phase 6 M2 Module 2
 */

const AdvancedMediaHandler = require('../../code/WhatsAppBot/Handlers/AdvancedMediaHandler');
const { MockLogger, MockFileService } = require('../mocks/services');
const fixtures = require('../fixtures/fixtures');

describe('AdvancedMediaHandler', () => {
  let handler;
  let mockLogger;
  let mockFileService;
  let mockBotContext;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockFileService = new MockFileService();

    mockBotContext = {
      message: fixtures.whatsappMessage.media,
      chat: fixtures.whatsappChat.private,
      contact: fixtures.whatsappContact.user1,
      client: {
        downloadMedia: jest.fn().mockResolvedValue(Buffer.from('mock-media-data'))
      }
    };

    handler = new AdvancedMediaHandler({
      logger: mockLogger,
      fileService: mockFileService,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf']
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ INITIALIZATION TESTS ============
  describe('Initialization', () => {
    it('should initialize handler', () => {
      expect(handler).toBeDefined();
      expect(handler.mediaCache).toBeDefined();
      expect(handler.cacheTTL).toBeDefined();
      expect(handler.supportedMimeTypes).toBeDefined();
    });
  });

  // ============ MEDIA DOWNLOAD TESTS ============
  describe('downloadMedia', () => {
    it('should download media from message', async () => {
      const result = await handler.downloadMedia(mockBotContext.message, mockBotContext);

      expect(result.success).toBe(true);
      expect(result.mediaData).toBeDefined();
      expect(result.mediaData).toBeInstanceOf(Buffer);
    });

    it('should validate MIME type', async () => {
      const invalidMessage = {
        ...fixtures.whatsappMessage.media,
        mimetype: 'application/exe'
      };

      const result = await handler.downloadMedia(invalidMessage, mockBotContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not allowed');
    });

    it('should check file size before download', async () => {
      mockBotContext.client.downloadMedia.mockResolvedValueOnce(
        Buffer.alloc(101 * 1024 * 1024) // 101MB
      );

      const result = await handler.downloadMedia(mockBotContext.message, mockBotContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('too large');
    });

    it('should handle download errors', async () => {
      mockBotContext.client.downloadMedia.mockRejectedValueOnce(
        new Error('Download failed')
      );

      const result = await handler.downloadMedia(mockBotContext.message, mockBotContext);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Download failed');
    });

    it('should track download metrics', async () => {
      await handler.downloadMedia(mockBotContext.message, mockBotContext);

      const metrics = handler.getMetrics();
      expect(metrics.totalDownloads).toBeGreaterThan(0);
    });
  });

  // ============ MEDIA UPLOAD TESTS ============
  describe('uploadMedia', () => {
    it('should upload media to WhatsApp', async () => {
      const result = await handler.uploadMedia(
        Buffer.from('test-data'),
        'image/jpeg',
        { filename: 'test.jpg' }
      );

      expect(result.success).toBe(true);
      expect(result.mediaUrl).toBeDefined();
    });

    it('should validate media before upload', async () => {
      const result = await handler.uploadMedia(
        Buffer.from('test'),
        'application/exe'
      );

      expect(result.success).toBe(false);
    });

    it('should encrypt media during upload', async () => {
      const result = await handler.uploadMedia(
        Buffer.from('sensitive-data'),
        'image/png',
        { encrypt: true }
      );

      expect(result.success).toBe(true);
      expect(result.encrypted).toBe(true);
    });
  });

  // ============ IMAGE PROCESSING TESTS ============
  describe('Image Processing', () => {
    it('should resize image', async () => {
      const result = await handler.processImage(
        mockBotContext.message,
        { resize: { width: 400, height: 300 } },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.processedBuffer).toBeDefined();
    });

    it('should generate thumbnail', async () => {
      const result = await handler.generateThumbnail(
        mockBotContext.message,
        { size: 200 },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.thumbnail).toBeDefined();
      expect(result.thumbnailSize).toBeLessThanOrEqual(200);
    });

    it('should compress image', async () => {
      const result = await handler.compressImage(
        mockBotContext.message,
        { quality: 80 },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.compressedSize).toBeLessThanOrEqual(
        result.originalSize
      );
    });

    it('should convert image format', async () => {
      const result = await handler.convertImage(
        mockBotContext.message,
        { format: 'png' },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('png');
    });

    it('should apply filters to image', async () => {
      const result = await handler.applyFilter(
        mockBotContext.message,
        { filter: 'grayscale' },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.filtered).toBe(true);
    });
  });

  // ============ VIDEO PROCESSING TESTS ============
  describe('Video Processing', () => {
    let videoMessage;

    beforeEach(() => {
      videoMessage = {
        ...fixtures.whatsappMessage.media,
        type: 'video',
        mimetype: 'video/mp4'
      };
    });

    it('should process video', async () => {
      const result = await handler.processVideo(
        videoMessage,
        {},
        mockBotContext
      );

      expect(result.success).toBe(true);
    });

    it('should extract video metadata', async () => {
      const result = await handler.getVideoMetadata(videoMessage, mockBotContext);

      expect(result.success).toBe(true);
      expect(result.metadata).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('width');
      expect(result.metadata).toHaveProperty('height');
    });

    it('should generate video preview', async () => {
      const result = await handler.generateVideoPreview(
        videoMessage,
        { timestamp: 2 },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.preview).toBeDefined();
    });

    it('should transcode video', async () => {
      const result = await handler.transcodeVideo(
        videoMessage,
        { format: 'webm' },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('webm');
    });

    it('should extract video frames', async () => {
      const result = await handler.extractFrames(
        videoMessage,
        { count: 5 },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.frames)).toBe(true);
      expect(result.frames.length).toBeLessThanOrEqual(5);
    });
  });

  // ============ AUDIO PROCESSING TESTS ============
  describe('Audio Processing', () => {
    let audioMessage;

    beforeEach(() => {
      audioMessage = {
        ...fixtures.whatsappMessage.media,
        type: 'audio',
        mimetype: 'audio/mpeg'
      };
    });

    it('should process audio', async () => {
      const result = await handler.processAudio(
        audioMessage,
        {},
        mockBotContext
      );

      expect(result.success).toBe(true);
    });

    it('should extract audio metadata', async () => {
      const result = await handler.getAudioMetadata(audioMessage, mockBotContext);

      expect(result.success).toBe(true);
      expect(result.metadata).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('bitrate');
      expect(result.metadata).toHaveProperty('format');
    });

    it('should convert audio format', async () => {
      const result = await handler.convertAudio(
        audioMessage,
        { format: 'wav' },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('wav');
    });

    it('should transcribe audio to text', async () => {
      const result = await handler.transcribeAudio(
        audioMessage,
        { language: 'en' },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
    });
  });

  // ============ DOCUMENT PROCESSING TESTS ============
  describe('Document Processing', () => {
    let docMessage;

    beforeEach(() => {
      docMessage = {
        ...fixtures.whatsappMessage.media,
        type: 'document',
        mimetype: 'application/pdf',
        filename: 'document.pdf'
      };
    });

    it('should process document', async () => {
      const result = await handler.processDocument(
        docMessage,
        {},
        mockBotContext
      );

      expect(result.success).toBe(true);
    });

    it('should extract text from PDF', async () => {
      const result = await handler.extractTextFromPdf(
        docMessage,
        {},
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
    });

    it('should parse document structure', async () => {
      const result = await handler.parseDocumentStructure(
        docMessage,
        {},
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.pages).toBeDefined();
    });

    it('should convert document format', async () => {
      const result = await handler.convertDocument(
        docMessage,
        { format: 'docx' },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('docx');
    });
  });

  // ============ BATCH PROCESSING TESTS ============
  describe('Batch Processing', () => {
    it('should process media batch', async () => {
      const messages = [
        fixtures.whatsappMessage.media,
        fixtures.whatsappMessage.media,
        fixtures.whatsappMessage.media
      ];

      const result = await handler.processBatch(messages, {}, mockBotContext);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(messages.length);
    });

    it('should queue media for processing', async () => {
      await handler.queueMedia(
        mockBotContext.message,
        { priority: 'high' },
        mockBotContext
      );

      const queueSize = handler.getQueueSize();
      expect(queueSize).toBeGreaterThan(0);
    });

    it('should process queue in priority order', async () => {
      const msg1 = { ...fixtures.whatsappMessage.media, id: 'msg1' };
      const msg2 = { ...fixtures.whatsappMessage.media, id: 'msg2' };

      await handler.queueMedia(msg1, { priority: 'low' }, mockBotContext);
      await handler.queueMedia(msg2, { priority: 'high' }, mockBotContext);

      const result = await handler.processNextInQueue();

      expect(result.messageId).toBe(msg2.id);
    });
  });

  // ============ CACHING TESTS ============
  describe('Caching', () => {
    it('should cache processed media', async () => {
      const messageId = 'test-message-id';

      await handler.cacheMedia(messageId, Buffer.from('cached-data'));

      const cached = handler.getFromCache(messageId);
      expect(cached).toBeDefined();
    });

    it('should expire cache entries', async () => {
      jest.useFakeTimers();

      const messageId = 'expire-test';
      await handler.cacheMedia(messageId, Buffer.from('data'), { ttl: 1000 });

      let cached = handler.getFromCache(messageId);
      expect(cached).toBeDefined();

      jest.advanceTimersByTime(1100);

      cached = handler.getFromCache(messageId);
      expect(cached).toBeNull();

      jest.useRealTimers();
    });

    it('should clear cache', async () => {
      await handler.cacheMedia('msg1', Buffer.from('data1'));
      await handler.cacheMedia('msg2', Buffer.from('data2'));

      handler.clearCache();

      expect(handler.getFromCache('msg1')).toBeNull();
      expect(handler.getFromCache('msg2')).toBeNull();
    });
  });

  // ============ COMPRESSION TESTS ============
  describe('Compression', () => {
    it('should compress media for transmission', async () => {
      const result = await handler.compressForTransmission(
        mockBotContext.message,
        { quality: 70 },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.compressedSize).toBeLessThanOrEqual(
        result.originalSize
      );
    });

    it('should create compressed batch', async () => {
      const messages = [
        fixtures.whatsappMessage.media,
        fixtures.whatsappMessage.media
      ];

      const result = await handler.compressBatch(
        messages,
        { quality: 60 },
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.compressedMessages.length).toBe(messages.length);
    });
  });

  // ============ VALIDATION TESTS ============
  describe('Validation', () => {
    it('should validate media message', () => {
      const valid = handler.isValidMediaMessage(mockBotContext.message);
      expect(valid).toBe(true);
    });

    it('should validate MIME type', () => {
      const valid = handler.isValidMimeType('image/jpeg');
      expect(valid).toBe(true);

      const invalid = handler.isValidMimeType('application/exe');
      expect(invalid).toBe(false);
    });

    it('should validate file size', () => {
      const valid = handler.isValidFileSize(50 * 1024 * 1024);
      expect(valid).toBe(true);

      const invalid = handler.isValidFileSize(150 * 1024 * 1024);
      expect(invalid).toBe(false);
    });
  });

  // ============ METRICS TESTS ============
  describe('Metrics', () => {
    it('should track download metrics', async () => {
      await handler.downloadMedia(mockBotContext.message, mockBotContext);

      const metrics = handler.getMetrics();

      expect(metrics).toHaveProperty('totalDownloads');
      expect(metrics).toHaveProperty('totalUploads');
      expect(metrics).toHaveProperty('bytesProcessed');
    });

    it('should track processing time', async () => {
      const promise = handler.processImage(
        mockBotContext.message,
        { resize: { width: 400, height: 300 } },
        mockBotContext
      );

      await promise;

      const metrics = handler.getMetrics();
      // Should have at least 0, could be more depending on actual execution time
      expect(metrics.averageProcessingTimeMs).toBeDefined();
      expect(metrics.processingEvents.length).toBeGreaterThan(0);
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe('Error Handling', () => {
    it('should handle invalid message', async () => {
      const result = await handler.downloadMedia(
        { /* invalid message */ },
        mockBotContext
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle processing errors gracefully', async () => {
      mockBotContext.client.downloadMedia.mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await handler.downloadMedia(
        mockBotContext.message,
        mockBotContext
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Network error');
    });
  });
});
