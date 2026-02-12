/**
 * Comprehensive Test Fixtures
 * Realistic data for all test scenarios
 * Phase 6 M2 Module 2
 */

const testFixtures = {
  // Valid phone numbers
  validPhoneNumbers: {
    us: '+14155552671',
    uk: '+442071838750',
    india: '+919876543210',
    dubai: '+971501234567',
    multiple: ['+14155552671', '+442071838750', '+919876543210']
  },

  // Messages
  messages: {
    simple: {
      id: 'msg_123',
      from: '+14155552671',
      to: '+442071838750',
      text: 'Hello, how are you?',
      timestamp: new Date('2026-02-13T10:00:00Z'),
      type: 'text'
    },

    batch: [
      {
        id: 'msg_1',
        to: '+14155552671',
        text: 'Hello User 1'
      },
      {
        id: 'msg_2',
        to: '+442071838750',
        text: 'Hello User 2'
      },
      {
        id: 'msg_3',
        to: '+919876543210',
        text: 'Hello User 3'
      }
    ]
  },

  // Templates
  templates: {
    simple: {
      name: 'greeting',
      content: 'Hello {{name}}!'
    },

    withMultipleVars: {
      name: 'order_confirmation',
      content: 'Order #{{orderId}} confirmed for {{customerName}}. Total: {{amount}} {{currency}}'
    },

    withConditional: {
      name: 'customer_status',
      content: 'Hello {{name}}, {{#if isPremium}}welcome back premium customer{{/if}}'
    }
  },

  // Conversations
  conversations: {
    simple: [
      { id: 'msg1', sender: 'user', text: 'Hello!', timestamp: new Date() },
      { id: 'msg2', sender: 'bot', text: 'Hi there!', timestamp: new Date() }
    ],

    positive: [
      { id: 'msg1', sender: 'user', text: 'Great service!', timestamp: new Date() },
      { id: 'msg2', sender: 'bot', text: 'Thank you!', timestamp: new Date() },
      { id: 'msg3', sender: 'user', text: 'Excellent work!', timestamp: new Date() }
    ],

    negative: [
      { id: 'msg1', sender: 'user', text: 'This is terrible', timestamp: new Date() },
      { id: 'msg2', sender: 'bot', text: 'I apologize', timestamp: new Date() },
      { id: 'msg3', sender: 'user', text: 'Very poor', timestamp: new Date() }
    ]
  },

  // Groups
  groups: {
    simple: {
      name: 'Team Chat',
      description: 'Team communication',
      participants: ['+14155552671', '+442071838750']
    }
  },

  // Accounts
  accounts: {
    master: {
      phone: '+14155552671',
      displayName: 'Linda Master',
      type: 'master'
    },

    secondary1: {
      phone: '+442071838750',
      displayName: 'Linda Secondary 1',
      type: 'secondary'
    },

    secondary2: {
      phone: '+919876543210',
      displayName: 'Linda Secondary 2',
      type: 'secondary'
    }
  },

  // Batches
  batches: {
    small: {
      name: 'Small Batch',
      messages: [
        { id: 'msg1', to: '+14155552671', text: 'Hello 1' },
        { id: 'msg2', to: '+442071838750', text: 'Hello 2' }
      ]
    },

    medium: {
      name: 'Medium Batch',
      messages: Array.from({ length: 50 }, (_, i) => ({
        id: `msg_${i}`,
        to: `+1${String(i).padStart(10, '0')}`,
        text: `Message ${i}`
      }))
    },

    large: {
      name: 'Large Batch',
      messages: Array.from({ length: 100 }, (_, i) => ({
        id: `msg_${i}`,
        to: `+1${String(i).padStart(10, '0')}`,
        text: `Message ${i}`
      }))
    }
  },

  // Commands
  commands: {
    simple: '/help',
    withSubcommand: '/whatsapp list',
    withArguments: '/whatsapp send +14155552671 "Hello World"',
    withFlags: '/contacts list --limit 10'
  },

  // WhatsApp Message Objects (for testing message handlers)
  whatsappMessage: {
    text: {
      id: 'msg_123_text',
      from: '+14155552671',
      to: '+442071838750',
      text: 'Hello, how are you?',
      timestamp: Date.now(),
      type: 'text',
      isFromMe: false,
      hasMedia: false
    },

    media: {
      id: 'msg_123_media',
      from: '+14155552671',
      to: '+442071838750',
      text: 'Check this image',
      timestamp: Date.now(),
      type: 'image',
      isFromMe: false,
      hasMedia: true,
      mediaData: {
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        url: 'https://example.com/image.jpg'
      }
    },

    video: {
      id: 'msg_123_video',
      from: '+14155552671',
      to: '+442071838750',
      text: 'Video message',
      timestamp: Date.now(),
      type: 'video',
      isFromMe: false,
      hasMedia: true,
      mediaData: {
        fileName: 'test.mp4',
        mimeType: 'video/mp4',
        size: 5242880,
        duration: 30,
        url: 'https://example.com/video.mp4'
      }
    },

    document: {
      id: 'msg_123_doc',
      from: '+14155552671',
      to: '+442071838750',
      text: 'Document',
      timestamp: Date.now(),
      type: 'document',
      isFromMe: false,
      hasMedia: true,
      mediaData: {
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        size: 1048576,
        url: 'https://example.com/report.pdf'
      }
    }
  },

  // WhatsApp Chat Objects (for testing chat handlers)
  whatsappChat: {
    private: {
      id: '_123456789@c.us',
      name: 'John Doe',
      isGroup: false,
      isReadOnly: false,
      unreadCount: 5,
      timestamp: Date.now(),
      contact: {
        id: '+14155552671',
        name: 'John Doe',
        number: '14155552671'
      }
    },

    group: {
      id: '123456-789012@g.us',
      name: 'Test Group',
      isGroup: true,
      isReadOnly: false,
      unreadCount: 10,
      timestamp: Date.now(),
      groupMetadata: {
        id: '123456-789012@g.us',
        creation: Date.now(),
        owner: '+14155552671',
        subject: 'Test Group',
        subjectTime: Date.now(),
        subjectOwner: '+14155552671',
        desc: 'Test group description',
        descTime: Date.now(),
        descOwner: '+14155552671',
        participants: [
          {
            id: '+14155552671',
            isAdmin: true,
            isSuperAdmin: true
          },
          {
            id: '+442071838750',
            isAdmin: false,
            isSuperAdmin: false
          },
          {
            id: '+919876543210',
            isAdmin: false,
            isSuperAdmin: false
          }
        ]
      }
    }
  },

  // WhatsApp Contact Objects (for testing contact handlers)
  whatsappContact: {
    user1: {
      id: '+14155552671',
      name: 'John Doe',
      number: '14155552671',
      pushname: 'John Doe',
      shortName: 'John',
      isMyContact: true,
      isBlocked: false,
      statusMute: false,
      status: 'Available now',
      lastSeen: Date.now(),
      profilePicThumbObj: {
        eTag: 'eTag123',
        data: 'imageData',
        id: '+14155552671'
      }
    },

    user2: {
      id: '+442071838750',
      name: 'Jane Smith',
      number: '442071838750',
      pushname: 'Jane Smith',
      shortName: 'Jane',
      isMyContact: true,
      isBlocked: false,
      statusMute: false,
      status: 'Busy',
      lastSeen: Date.now() - 3600000,
      profilePicThumbObj: {
        eTag: 'eTag456',
        data: 'imageData2',
        id: '+442071838750'
      }
    },

    user3: {
      id: '+919876543210',
      name: 'Raj Patel',
      number: '919876543210',
      pushname: 'Raj Patel',
      shortName: 'Raj',
      isMyContact: true,
      isBlocked: false,
      statusMute: true,
      status: 'Away',
      lastSeen: Date.now() - 7200000,
      profilePicThumbObj: null
    }
  },

  // Recipients for batch operations
  recipients: Array.from({ length: 10 }, (_, i) => ({
    id: `user_${i}`,
    number: `+1${String(i).padStart(10, '0')}`,
    name: `User ${i}`,
    variables: {
      orderId: `ORD-${String(i).padStart(3, '0')}`,
      amount: `$${(i + 1) * 50}.99`,
      currency: 'USD'
    }
  }))
};

module.exports = testFixtures;
