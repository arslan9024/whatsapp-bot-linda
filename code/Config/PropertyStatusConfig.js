/**
 * PropertyStatusConfig.js
 * Comprehensive property status enumeration and normalization rules
 */

const TRANSACTION_TYPES = {
  SALE: {
    code: 'SALE',
    label: 'Available for Sale',
    aliases: ['sale', 'selling', 'sell', 'for sale', 'available for sale', 'buy'],
    description: 'Property is available for purchase',
    color: '#4CAF50'
  },
  RENT: {
    code: 'RENT',
    label: 'Available for Rent',
    aliases: ['rent', 'rental', 'lease', 'leasing', 'for rent', 'available for rent', 'let'],
    description: 'Property is available for lease/rental',
    color: '#2196F3'
  },
  SOLD: {
    code: 'SOLD',
    label: 'Sold',
    aliases: ['sold', 'closed', 'completed', 'transaction closed', 'deal closed'],
    description: 'Property has been sold/transferred',
    color: '#9E9E9E'
  },
  RENTED: {
    code: 'RENTED',
    label: 'Rented/Leased',
    aliases: ['rented', 'leased', 'occupied', 'tenant occupied', 'under lease'],
    description: 'Property is currently rented/leased',
    color: '#FF9800'
  },
  PENDING: {
    code: 'PENDING',
    label: 'Pending',
    aliases: ['pending', 'under offer', 'in negotiation', 'pending sale', 'pending lease', 'negotiation'],
    description: 'Property is in negotiation or pending transaction',
    color: '#FFC107'
  },
  VACANT: {
    code: 'VACANT',
    label: 'Vacant (Not Listed)',
    aliases: ['vacant', 'unlisted', 'off market', 'hold', 'withdrawn'],
    description: 'Property is not currently listed or is temporarily off market',
    color: '#9C27B0'
  }
};

const PROCESSING_STATUSES = {
  PENDING_REVIEW: {
    code: 'pending_review',
    label: 'Pending Review',
    description: 'Property record needs manual verification',
    stage: 'validation'
  },
  AUTO_REPLIED: {
    code: 'auto_replied',
    label: 'Auto Replied',
    description: 'Automated system response was sent',
    stage: 'communication'
  },
  MANUAL_REVIEW: {
    code: 'manual_review',
    label: 'Manual Review',
    description: 'Agent is manually reviewing the record',
    stage: 'validation'
  },
  VERIFIED: {
    code: 'verified',
    label: 'Verified',
    description: 'Record has been verified by agent',
    stage: 'completion'
  }
};

const DATA_QUALITY_LEVELS = {
  LOW: {
    code: 'low',
    label: 'Low',
    description: 'Incomplete/uncertain data (<=50% fields filled)',
    threshold: 50,
    color: '#F44336'
  },
  MEDIUM: {
    code: 'medium',
    label: 'Medium',
    description: 'Partial data (50-80% fields filled)',
    threshold: 80,
    color: '#FF9800'
  },
  HIGH: {
    code: 'high',
    label: 'High',
    description: 'Complete/verified data (>80% fields filled)',
    threshold: 100,
    color: '#4CAF50'
  }
};

const SENTIMENT_TYPES = {
  POSITIVE: {
    code: 'positive',
    label: 'Positive',
    aliases: ['interested', 'enthusiastic', 'keen', 'ready', 'urgent', 'immediate'],
    weight: 3
  },
  NEGATIVE: {
    code: 'negative',
    label: 'Negative',
    aliases: ['not interested', 'expensive', 'reject', 'decline', 'no thanks', 'pass'],
    weight: 1
  },
  NEUTRAL: {
    code: 'neutral',
    label: 'Neutral',
    aliases: ['inquiry', 'question', 'information', 'curious'],
    weight: 2
  },
  URGENT: {
    code: 'urgent',
    label: 'Urgent',
    aliases: ['immediate', 'asap', 'rush', 'today', 'this week'],
    weight: 4
  }
};

const INQUIRY_INTENTS = {
  BUY: {
    code: 'buy',
    label: 'Want to Buy',
    keywords: ['buy', 'purchase', 'looking to buy']
  },
  RENT: {
    code: 'rent',
    label: 'Want to Rent',
    keywords: ['rent', 'lease', 'looking to rent']
  },
  INQUIRY: {
    code: 'inquiry',
    label: 'General Inquiry',
    keywords: ['tell me', 'details', 'information']
  },
  COMPLAINT: {
    code: 'complaint',
    label: 'Complaint',
    keywords: ['issue', 'problem', 'complaint']
  }
};

function normalizeStatus(inputValue) {
  if (!inputValue || typeof inputValue !== 'string') {
    return null;
  }

  const normalized = inputValue.toLowerCase().trim();

  for (const [key, statusObj] of Object.entries(TRANSACTION_TYPES)) {
    if (
      statusObj.code.toLowerCase() === normalized ||
      statusObj.aliases.some(alias => alias.toLowerCase() === normalized)
    ) {
      return {
        code: statusObj.code,
        label: statusObj.label,
        color: statusObj.color,
        description: statusObj.description
      };
    }
  }

  return null;
}

function detectSentiment(text) {
  if (!text || typeof text !== 'string') {
    return SENTIMENT_TYPES.NEUTRAL;
  }

  const lowerText = text.toLowerCase();

  if (SENTIMENT_TYPES.URGENT.aliases.some(keyword => lowerText.includes(keyword))) {
    return {
      code: SENTIMENT_TYPES.URGENT.code,
      label: SENTIMENT_TYPES.URGENT.label,
      weight: SENTIMENT_TYPES.URGENT.weight
    };
  }

  if (SENTIMENT_TYPES.POSITIVE.aliases.some(keyword => lowerText.includes(keyword))) {
    return {
      code: SENTIMENT_TYPES.POSITIVE.code,
      label: SENTIMENT_TYPES.POSITIVE.label,
      weight: SENTIMENT_TYPES.POSITIVE.weight
    };
  }

  if (SENTIMENT_TYPES.NEGATIVE.aliases.some(keyword => lowerText.includes(keyword))) {
    return {
      code: SENTIMENT_TYPES.NEGATIVE.code,
      label: SENTIMENT_TYPES.NEGATIVE.label,
      weight: SENTIMENT_TYPES.NEGATIVE.weight
    };
  }

  return {
    code: SENTIMENT_TYPES.NEUTRAL.code,
    label: SENTIMENT_TYPES.NEUTRAL.label,
    weight: SENTIMENT_TYPES.NEUTRAL.weight
  };
}

function detectIntent(text) {
  if (!text || typeof text !== 'string') {
    return INQUIRY_INTENTS.INQUIRY;
  }

  const lowerText = text.toLowerCase();

  for (const [key, intentObj] of Object.entries(INQUIRY_INTENTS)) {
    if (intentObj.keywords.some(keyword => lowerText.includes(keyword))) {
      return {
        code: intentObj.code,
        label: intentObj.label
      };
    }
  }

  return {
    code: INQUIRY_INTENTS.INQUIRY.code,
    label: INQUIRY_INTENTS.INQUIRY.label
  };
}

function getAllValidStatuses() {
  return Object.keys(TRANSACTION_TYPES).map(key => TRANSACTION_TYPES[key].code);
}

function getStatusByCode(code) {
  return TRANSACTION_TYPES[code] || null;
}

function isValidStatus(value) {
  return Object.values(TRANSACTION_TYPES).some(
    status => status.code === value || status.aliases.includes(value.toLowerCase())
  );
}


export default {
  TRANSACTION_TYPES,
  PROCESSING_STATUSES,
  DATA_QUALITY_LEVELS,
  SENTIMENT_TYPES,
  INQUIRY_INTENTS,
  normalizeStatus,
  detectSentiment,
  detectIntent,
  getAllValidStatuses,
  getStatusByCode,
  isValidStatus
};
