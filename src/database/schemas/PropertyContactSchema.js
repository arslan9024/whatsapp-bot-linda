/**
 * ========================================================================
 * PROPERTY CONTACT SCHEMA - DAMAC HILLS 2
 * Phase 30: Advanced Property Management
 * ========================================================================
 * 
 * Stores property contact information (alternative contacts, agents, etc.):
 * - Contact basic information (name, phone, email)
 * - Contact type (agent, broker, tenant, caretaker, etc.)
 * - Relations to owners and properties
 * - Communication channel tracking (WhatsApp, SMS, Email, etc.)
 * - Verification status
 * 
 * @module PropertyContactSchema
 * @since Phase 30 - February 19, 2026
 */

import mongoose from 'mongoose';

// ========================================================================
// PROPERTY CONTACT SCHEMA
// ========================================================================
// Represents a contact related to properties (agent, broker, tenant, etc.)

const propertyContactSchema = new mongoose.Schema({
  // ========================================================================
  // PRIMARY IDENTIFIER
  // ========================================================================
  contactId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    description: 'Unique identifier for the contact (format: CONTACT-YYYYMMDD-XXXXX)'
  },

  // ========================================================================
  // CONTACT PERSONAL INFORMATION
  // ========================================================================
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true,
    description: 'Contact first name'
  },

  lastName: {
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
    description: 'Contact last name'
  },

  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
    description: 'Full name (computed from firstName + lastName)'
  },

  // ========================================================================
  // CONTACT TYPE & ROLE
  // ========================================================================
  contactType: {
    type: String,
    enum: ['agent', 'broker', 'tenant', 'caretaker', 'manager', 'family_member', 'other'],
    required: true,
    index: true,
    description: 'Type/role of contact'
  },

  role: {
    type: String,
    maxlength: 100,
    description: 'Specific role (e.g., Sales Agent, Property Manager)'
  },

  companyName: {
    type: String,
    maxlength: 200,
    description: 'Company/organization affiliation'
  },

  designation: {
    type: String,
    maxlength: 100,
    description: 'Job title or designation'
  },

  // ========================================================================
  // CONTACT INFORMATION
  // ========================================================================
  primaryPhone: {
    type: String,
    required: true,
    match: /^\+?[0-9]{7,15}$/,
    index: true,
    description: 'Primary phone number (international format)'
  },

  alternatePhone: {
    type: String,
    sparse: true,
    match: /^\+?[0-9]{7,15}$/,
    description: 'Secondary phone number'
  },

  email: {
    type: String,
    sparse: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    index: true,
    description: 'Primary email address'
  },

  alternateEmail: {
    type: String,
    sparse: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: 'Secondary email address'
  },

  // ========================================================================
  // COMMUNICATION CHANNELS
  // ========================================================================
  channels: {
    email: {
      type: Boolean,
      default: false,
      description: 'Contact prefers email'
    },
    phone: {
      type: Boolean,
      default: true,
      description: 'Contact prefers phone calls'
    },
    sms: {
      type: Boolean,
      default: false,
      description: 'Contact prefers SMS'
    },
    whatsapp: {
      type: Boolean,
      default: false,
      description: 'Contact prefers WhatsApp'
    }
  },

  preferredChannel: {
    type: String,
    enum: ['email', 'phone', 'sms', 'whatsapp'],
    default: 'phone',
    description: 'Preferred communication channel'
  },

  // ========================================================================
  // RELATIONSHIPS
  // ========================================================================
  linkedOwnerId: {
    type: String,
    sparse: true,
    index: true,
    description: 'Reference to PropertyOwner (if applicable)'
  },

  linkedPropertyIds: [
    {
      type: String,
      description: 'References to properties this contact manages/is associated with'
    }
  ],

  // ========================================================================
  // IDENTIFICATION & VERIFICATION
  // ========================================================================
  idType: {
    type: String,
    enum: ['passport', 'emirates_id', 'national_id', 'visa', 'none'],
    description: 'Type of identification document'
  },

  idNumber: {
    type: String,
    sparse: true,
    trim: true,
    maxlength: 30,
    description: 'Identification document number'
  },

  licenseNumber: {
    type: String,
    sparse: true,
    trim: true,
    maxlength: 50,
    description: 'Professional license number (for agents/brokers)'
  },

  licenseExpiry: {
    type: Date,
    sparse: true,
    description: 'License expiration date'
  },

  // ========================================================================
  // VERIFICATION STATUS
  // ========================================================================
  verified: {
    type: Boolean,
    default: false,
    description: 'Whether contact is verified'
  },

  verificationDate: {
    type: Date,
    sparse: true,
    description: 'When contact was verified'
  },

  verificationMethod: {
    type: String,
    enum: ['manual', 'phone_call', 'sms', 'email', 'whatsapp'],
    description: 'Verification method used'
  },

  // ========================================================================
  // STATUS & ACTIVITY
  // ========================================================================
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'suspended'],
    default: 'active',
    index: true,
    description: 'Contact status'
  },

  lastActivityAt: {
    type: Date,
    sparse: true,
    description: 'Last activity timestamp'
  },

  responseRate: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Percentage of messages responded to'
  },

  // ========================================================================
  // METADATA & AUDIT
  // ========================================================================
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'Creation timestamp'
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    description: 'Last update timestamp'
  },

  createdBy: {
    type: String,
    description: 'User/system that created this record'
  },

  updatedBy: {
    type: String,
    description: 'User/system that last updated this record'
  },

  notes: {
    type: String,
    maxlength: 1000,
    description: 'Internal notes about the contact'
  },

  // ========================================================================
  // SOURCE TRACKING
  // ========================================================================
  sourceSystem: {
    type: String,
    enum: ['google_sheets', 'direct_entry', 'import', 'sync', 'integration'],
    default: 'google_sheets',
    description: 'Where the contact data originated'
  },

  externalId: {
    type: String,
    sparse: true,
    description: 'External ID from source system'
  },

  lastSyncedAt: {
    type: Date,
    sparse: true,
    description: 'Last synchronization timestamp'
  },

  // ========================================================================
  // COMPUTED FIELDS
  // ========================================================================
  propertyCount: {
    type: Number,
    default: 0,
    description: 'Cached count of properties (use linkedPropertyIds.length)'
  }

}, {
  timestamps: true,
  strict: true,
  validateBeforeSave: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================================================
// INDEXES FOR PERFORMANCE
// ========================================================================

// Primary lookup indexes
propertyContactSchema.index({ contactId: 1 });
propertyContactSchema.index({ email: 1 });
propertyContactSchema.index({ primaryPhone: 1 });
propertyContactSchema.index({ licenseNumber: 1 });

// Status & filtering
propertyContactSchema.index({ status: 1, contactType: 1 });
propertyContactSchema.index({ verified: 1, status: 1 });

// Search indexes
propertyContactSchema.index({ fullName: 'text', email: 'text', primaryPhone: 'text' });

// Relationship indexes
propertyContactSchema.index({ linkedOwnerId: 1 });
propertyContactSchema.index({ linkedPropertyIds: 1 });

// Source tracking
propertyContactSchema.index({ sourceSystem: 1, externalId: 1 });
propertyContactSchema.index({ lastSyncedAt: -1 });

// Activity tracking
propertyContactSchema.index({ lastActivityAt: -1 });

// ========================================================================
// VIRTUALS
// ========================================================================

propertyContactSchema.virtual('displayName').get(function() {
  return this.fullName || this.firstName;
});

propertyContactSchema.virtual('isVerified').get(function() {
  return this.verified === true;
});

propertyContactSchema.virtual('isAgent').get(function() {
  return this.contactType === 'agent' || this.contactType === 'broker';
});

propertyContactSchema.virtual('daysAsContact').get(function() {
  const now = new Date();
  const daysDiff = Math.floor((now - this.createdAt) / (1000 * 60 * 60 * 24));
  return daysDiff;
});

// ========================================================================
// HOOKS
// ========================================================================

// Update the updatedAt field on save
propertyContactSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compute full name before save
propertyContactSchema.pre('save', function(next) {
  if (this.firstName) {
    this.fullName = this.lastName 
      ? `${this.firstName} ${this.lastName}` 
      : this.firstName;
  }
  next();
});

// ========================================================================
// METHODS
// ========================================================================

/**
 * Get contact communication channels
 */
propertyContactSchema.methods.getCommunicationChannels = function() {
  return {
    email: this.channels.email,
    phone: this.channels.phone,
    sms: this.channels.sms,
    whatsapp: this.channels.whatsapp,
    preferred: this.preferredChannel
  };
};

/**
 * Get all contact info
 */
propertyContactSchema.methods.getContactInfo = function() {
  return {
    name: this.fullName,
    type: this.contactType,
    email: this.email,
    alternateEmail: this.alternateEmail,
    primaryPhone: this.primaryPhone,
    alternatePhone: this.alternatePhone,
    preferredChannel: this.preferredChannel,
    verified: this.verified
  };
};

/**
 * Check if contact can be contacted
 */
propertyContactSchema.methods.canBeContacted = function() {
  return this.status === 'active' && (
    this.channels.email || 
    this.channels.phone || 
    this.channels.sms || 
    this.channels.whatsapp
  );
};

/**
 * Mark contact as active with current timestamp
 */
propertyContactSchema.methods.markActive = function() {
  this.status = 'active';
  this.lastActivityAt = new Date();
  return this.save();
};

/**
 * Archive the contact (soft delete)
 */
propertyContactSchema.methods.archive = function() {
  this.status = 'archived';
  this.updatedAt = new Date();
  return this.save();
};

/**
 * Update last activity
 */
propertyContactSchema.methods.updateActivity = function() {
  this.lastActivityAt = new Date();
  return this.save();
};

// ========================================================================
// STATICS
// ========================================================================

/**
 * Find contact by phone
 */
propertyContactSchema.statics.findByPhone = function(phone) {
  return this.findOne({
    $or: [
      { primaryPhone: phone },
      { alternatePhone: phone }
    ]
  });
};

/**
 * Find contact by email
 */
propertyContactSchema.statics.findByEmail = function(email) {
  return this.findOne({
    $or: [
      { email: email.toLowerCase() },
      { alternateEmail: email.toLowerCase() }
    ]
  });
};

/**
 * Find agents only
 */
propertyContactSchema.statics.findAgents = function() {
  return this.find({
    contactType: { $in: ['agent', 'broker'] },
    status: 'active'
  });
};

/**
 * Find verified contacts
 */
propertyContactSchema.statics.findVerified = function() {
  return this.find({ verified: true, status: 'active' });
};

/**
 * Get active contacts by type
 */
propertyContactSchema.statics.findByType = function(type) {
  return this.find({ contactType: type, status: 'active' });
};

/**
 * Get statistics
 */
propertyContactSchema.statics.getStatistics = function() {
  return Promise.all([
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ verified: true }),
    this.countDocuments(),
    this.countDocuments({ contactType: 'agent' }),
    this.countDocuments({ contactType: 'broker' })
  ]).then(([active, verified, total, agents, brokers]) => {
    return {
      totalContacts: total,
      activeContacts: active,
      verifiedContacts: verified,
      archivedContacts: total - active,
      agentCount: agents,
      brokerCount: brokers
    };
  });
};

// ========================================================================
// MODEL EXPORT
// ========================================================================

export default mongoose.model('PropertyContact', propertyContactSchema);
