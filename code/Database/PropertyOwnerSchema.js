/**
 * ========================================================================
 * PROPERTY OWNER SCHEMA - DAMAC HILLS 2
 * Phase 30: Advanced Property Management
 * ========================================================================
 * 
 * Stores property owner information with efficient keys and relations:
 * - Owner basic information (name, email, phone)
 * - Ownership details (ownership type, percentage)
 * - Associated properties (via PropertyOwnerProperties linking table)
 * - Contact information and communication preferences
 * - Status tracking (active, inactive, archived)
 * 
 * @module PropertyOwnerSchema
 * @since Phase 30 - February 19, 2026
 */

import mongoose from 'mongoose';

// ========================================================================
// PROPERTY OWNER SCHEMA
// ========================================================================
// Represents a property owner in DAMAC Hills 2

const propertyOwnerSchema = new mongoose.Schema({
  // ========================================================================
  // PRIMARY IDENTIFIER
  // ========================================================================
  ownerId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    description: 'Unique identifier for the owner (format: OWNER-YYYYMMDD-XXXXX)'
  },

  // ========================================================================
  // OWNER PERSONAL INFORMATION
  // ========================================================================
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true,
    description: 'Owner first name'
  },

  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true,
    description: 'Owner last name'
  },

  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    description: 'Full name (computed from firstName + lastName)'
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

  countryCode: {
    type: String,
    default: 'AE',
    enum: ['AE', 'US', 'UK', 'IN', 'SA', 'other'],
    description: 'Phone country code'
  },

  // ========================================================================
  // OWNERSHIP DETAILS
  // ========================================================================
  ownershipType: {
    type: String,
    enum: ['individual', 'company', 'joint', 'trust', 'estate'],
    default: 'individual',
    description: 'Type of ownership'
  },

  ownershipPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
    description: 'Ownership percentage (0-100)'
  },

  companyName: {
    type: String,
    sparse: true,
    maxlength: 200,
    description: 'Company name (if ownership is company/trust/estate)'
  },

  companyRegistration: {
    type: String,
    sparse: true,
    maxlength: 50,
    description: 'Company registration number'
  },

  // ========================================================================
  // IDENTIFICATION & DOCUMENTATION
  // ========================================================================
  idType: {
    type: String,
    enum: ['passport', 'emirates_id', 'national_id', 'visa', 'other'],
    description: 'Type of identification document'
  },

  idNumber: {
    type: String,
    sparse: true,
    trim: true,
    index: true,
    maxlength: 30,
    description: 'Identification document number'
  },

  idExpiryDate: {
    type: Date,
    sparse: true,
    description: 'ID expiration date'
  },

  // ========================================================================
  // ADDRESS INFORMATION
  // ========================================================================
  addressLine1: {
    type: String,
    maxlength: 200,
    description: 'Primary address line'
  },

  addressLine2: {
    type: String,
    maxlength: 200,
    description: 'Secondary address line'
  },

  city: {
    type: String,
    maxlength: 50,
    description: 'City name'
  },

  country: {
    type: String,
    maxlength: 50,
    description: 'Country name'
  },

  postalCode: {
    type: String,
    maxlength: 20,
    description: 'Postal code'
  },

  // ========================================================================
  // COMMUNICATION PREFERENCES
  // ========================================================================
  preferredContact: {
    type: String,
    enum: ['email', 'phone', 'sms', 'whatsapp'],
    default: 'email',
    description: 'Preferred contact method'
  },

  notificationsEnabled: {
    type: Boolean,
    default: true,
    description: 'Whether owner wants to receive notifications'
  },

  whatsappOptIn: {
    type: Boolean,
    default: false,
    description: 'Owner opted in to WhatsApp communications'
  },

  // ========================================================================
  // GATEWAY LINKING (Multi-Account Access)
  // ========================================================================
  linkedContactIds: [
    {
      type: String,
      description: 'References to PropertyContact documents'
    }
  ],

  linkedPropertyIds: [
    {
      type: String,
      description: 'References to properties (via PropertyOwnerProperties)'
    }
  ],

  // ========================================================================
  // STATUS & LIFECYCLE
  // ========================================================================
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'suspended'],
    default: 'active',
    index: true,
    description: 'Owner account status'
  },

  verified: {
    type: Boolean,
    default: false,
    description: 'Whether owner identity is verified'
  },

  verificationDate: {
    type: Date,
    sparse: true,
    description: 'When owner was verified'
  },

  verificationMethod: {
    type: String,
    enum: ['manual', 'document_scan', 'email_confirmation', 'sms_confirmation'],
    description: 'How the owner was verified'
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
    description: 'Internal notes about the owner'
  },

  // ========================================================================
  // SOURCE TRACKING
  // ========================================================================
  sourceSystem: {
    type: String,
    enum: ['google_sheets', 'direct_entry', 'import', 'integration'],
    default: 'google_sheets',
    description: 'Where the owner data originated'
  },

  externalId: {
    type: String,
    sparse: true,
    description: 'External ID from source system (e.g., Google Sheets row ID)'
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
    description: 'Cached count of properties owned (use linkedPropertyIds.length)'
  },

  contactCount: {
    type: Number,
    default: 0,
    description: 'Cached count of contacts (use linkedContactIds.length)'
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
propertyOwnerSchema.index({ ownerId: 1 });
propertyOwnerSchema.index({ email: 1 });
propertyOwnerSchema.index({ primaryPhone: 1 });
propertyOwnerSchema.index({ idNumber: 1 });

// Status & filtering
propertyOwnerSchema.index({ status: 1, createdAt: -1 });
propertyOwnerSchema.index({ verified: 1, status: 1 });

// Search indexes
propertyOwnerSchema.index({ fullName: 'text', email: 'text', primaryPhone: 'text' });

// Relationship indexes
propertyOwnerSchema.index({ linkedPropertyIds: 1 });
propertyOwnerSchema.index({ linkedContactIds: 1 });

// Source tracking
propertyOwnerSchema.index({ sourceSystem: 1, externalId: 1 });
propertyOwnerSchema.index({ lastSyncedAt: -1 });

// ========================================================================
// VIRTUALS
// ========================================================================

propertyOwnerSchema.virtual('displayName').get(function() {
  return this.fullName || `${this.firstName} ${this.lastName}`;
});

propertyOwnerSchema.virtual('isVerified').get(function() {
  return this.verified === true;
});

propertyOwnerSchema.virtual('daysAsOwner').get(function() {
  const now = new Date();
  const daysDiff = Math.floor((now - this.createdAt) / (1000 * 60 * 60 * 24));
  return daysDiff;
});

// ========================================================================
// HOOKS
// ========================================================================

// Update the updatedAt field on save
propertyOwnerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Compute full name before save
propertyOwnerSchema.pre('save', function() {
  if (this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
});

// ========================================================================
// METHODS
// ========================================================================

/**
 * Get owner display name with all available contact info
 */
propertyOwnerSchema.methods.getContactInfo = function() {
  return {
    name: this.fullName,
    email: this.email,
    alternateEmail: this.alternateEmail,
    primaryPhone: this.primaryPhone,
    alternatePhone: this.alternatePhone,
    preferredContact: this.preferredContact
  };
};

/**
 * Check if owner data is complete for verification
 */
propertyOwnerSchema.methods.isDataComplete = function() {
  return !!(
    this.firstName &&
    this.lastName &&
    this.primaryPhone &&
    this.email &&
    (this.idNumber || this.companyRegistration)
  );
};

/**
 * Verify owner by document
 */
propertyOwnerSchema.methods.verifyByDocument = function() {
  if (this.idNumber) {
    this.verified = true;
    this.verificationDate = new Date();
    this.verificationMethod = 'document_scan';
    return true;
  }
  return false;
};

/**
 * Archive the owner (soft delete)
 */
propertyOwnerSchema.methods.archive = function() {
  this.status = 'archived';
  this.updatedAt = new Date();
  return this.save();
};

// ========================================================================
// STATICS
// ========================================================================

/**
 * Find owner by phone number
 */
propertyOwnerSchema.statics.findByPhone = function(phone) {
  return this.findOne({
    $or: [
      { primaryPhone: phone },
      { alternatePhone: phone }
    ]
  });
};

/**
 * Find owner by email
 */
propertyOwnerSchema.statics.findByEmail = function(email) {
  return this.findOne({
    $or: [
      { email: email.toLowerCase() },
      { alternateEmail: email.toLowerCase() }
    ]
  });
};

/**
 * Find owner by ID number
 */
propertyOwnerSchema.statics.findByIdNumber = function(idNumber) {
  return this.findOne({ idNumber: idNumber.trim() });
};

/**
 * Get verified owners
 */
propertyOwnerSchema.statics.findVerified = function() {
  return this.find({ verified: true, status: 'active' });
};

/**
 * Get active owners
 */
propertyOwnerSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

/**
 * Get summary statistics
 */
propertyOwnerSchema.statics.getStatistics = function() {
  return Promise.all([
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ verified: true }),
    this.countDocuments(),
    this.find({ status: 'active' }).select('linkedPropertyIds').lean()
  ]).then(([active, verified, total, ownersWithProps]) => {
    const totalProperties = ownersWithProps.reduce((sum, owner) => sum + (owner.linkedPropertyIds?.length || 0), 0);
    return {
      totalOwners: total,
      activeOwners: active,
      verifiedOwners: verified,
      archivedOwners: total - active,
      totalPropertiesLinked: totalProperties,
      averagePropertiesPerOwner: total > 0 ? Math.round(totalProperties / total * 100) / 100 : 0
    };
  });
};

// ========================================================================
// MODEL EXPORT
// ========================================================================

export default mongoose.model('PropertyOwner', propertyOwnerSchema);
