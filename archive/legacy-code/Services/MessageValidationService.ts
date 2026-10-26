/**
 * ============================================
 * MESSAGE VALIDATION SERVICE (Phase 17, TypeScript)
 * ============================================
 * 
 * Validates message content against WhatsApp limits,
 * safety rules, and quality standards.
 */

export interface IMessage {
  messageId: string;
  fromNumber: string;
  toNumber: string;
  body?: string;
  mediaUrl?: string;
  mimeType?: string;
  mediaSize?: number;
}

export class MessageValidationService {
  maxBodyLength = 65536;  // WhatsApp limit
  maxPhoneLength = 20;
  maxMediaSize = 104857600;  // 100MB
  allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  /**
   * Validate message
   */
  validate(message: IMessage): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!message.messageId) errors.push('Missing messageId');
    if (!message.fromNumber) errors.push('Missing fromNumber');
    if (!message.toNumber) errors.push('Missing toNumber');

    // Validate phone numbers
    if (message.fromNumber && message.fromNumber.length > this.maxPhoneLength)
      errors.push('fromNumber too long');
    if (message.toNumber && message.toNumber.length > this.maxPhoneLength)
      errors.push('toNumber too long');

    // Validate body
    if (message.body && message.body.length > this.maxBodyLength)
      errors.push('Message body too long');

    // Validate media
    if (message.mediaUrl) {
      if (!message.mimeType || !this.allowedMimeTypes.includes(message.mimeType))
        errors.push('Invalid or missing mimeType');
      if (message.mediaSize && message.mediaSize > this.maxMediaSize)
        errors.push('Media size exceeds limit');
    }

    return { errors, warnings };
  }
}
