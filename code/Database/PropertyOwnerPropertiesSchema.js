/**
 * ========================================================================
 * PROPERTY OWNER PROPERTIES SCHEMA - DAMAC HILLS 2
 * Phase 30: Advanced Property Management
 * ========================================================================
 * 
 * Linking table that establishes many-to-many relationship between:
 * - PropertyOwner (one owner can own multiple properties)
 * - PropertyInfo (one property can have multiple owners)
 * 
 * Supports:
 * - Joint ownership tracking
 * - Ownership percentage per property
 * - Acquisition & disposal dates
 * - Ownership relationship history
 * 
 * @module PropertyOwnerPropertiesSchema
 * @since Phase 30 - February 19, 2026
 */

import mongoose from 'mongoose';

// ========================================================================
// PROPERTY OWNER PROPERTIES SCHEMA (Linking Table)
// ========================================================================

const propertyOwnerPropertiesSchema = new mongoose.Schema({
  // ========================================================================
  // PRIMARY IDENTIFIER
  // ========================================================================
  linkId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    description: 'Unique identifier for the link (format: LINK-YYYYMMDD-XXXXX)'
  },

  // ========================================================================
  // FOREIGN KEYS
  // ========================================================================
  ownerId: {
    type: String,
    required: true,
    index: true,
    description: 'Reference to PropertyOwner document'
  },

  propertyId: {
    type: String,
    required: true,
    index: true,
    description: 'Reference to Property document'
  },

  // ========================================================================
  // OWNERSHIP DETAILS
  // ========================================================================
  ownershipPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    description: 'Ownership percentage for this property'
  },

  ownershipType: {
    type: String,
    enum: ['sole', 'joint', 'co-ownership', 'trust', 'company'],
    default: 'sole',
    description: 'Type of ownership relationship'
  },

  // ========================================================================
  // ACQUISITION & DISPOSAL
  // ========================================================================
  acquisitionDate: {
    type: Date,
    description: 'Date of property acquisition'
  },

  disposalDate: {
    type: Date,
    sparse: true,
    description: 'Date of property disposal (if applicable)'
  },

  // ========================================================================
  // OCCUPANCY & USAGE
  // ========================================================================
  occupancyStatus: {
    type: String,
    enum: ['owner_occupied', 'rented', 'vacant', 'commercial', 'mixed'],
    default: 'owner_occupied',
    description: 'Current occupancy status'
  },

  isRented: {
    type: Boolean,
    default: false,
    description: 'Whether property is currently rented'
  },

  rentalStartDate: {
    type: Date,
    sparse: true,
    description: 'Date rental started'
  },

  rentalEndDate: {
    type: Date,
    sparse: true,
    description: 'Date rental ended/will end'
  },

  rentalAmount: {
    type: Number,
    sparse: true,
    description: 'Monthly rental amount'
  },

  rentalCurrency: {
    type: String,
    enum: ['AED', 'USD', 'EUR', 'other'],
    default: 'AED',
    description: 'Currency of rental amount'
  },

  // ========================================================================
  // OWNERSHIP SHARE WITH CO-OWNERS
  // ========================================================================
  coOwnerDetails: [
    {
      coOwnerId: {
        type: String,
        description: 'Reference to co-owner PropertyOwner document'
      },
      coOwnerName: {
        type: String,
        description: 'Name of co-owner (cached)'
      },
      coOwnershipPercentage: {
        type: Number,
        min: 0,
        max: 100,
        description: 'Percentage owned by this co-owner'
      },
      relation: {
        type: String,
        enum: ['spouse', 'child', 'parent', 'sibling', 'other'],
        description: 'Relationship between owners'
      }
    }
  ],

  // ========================================================================
  // FINANCING & MORTGAGE
  // ========================================================================
  hasFinancing: {
    type: Boolean,
    default: false,
    description: 'Whether property is financed/mortgaged'
  },

  financingType: {
    type: String,
    enum: ['mortgage', 'loan', 'off_plan', 'cash', 'other'],
    sparse: true,
    description: 'Type of financing'
  },

  lenderName: {
    type: String,
    sparse: true,
    description: 'Name of lending institution'
  },

  loanAmount: {
    type: Number,
    sparse: true,
    description: 'Original loan amount'
  },

  outstandingBalance: {
    type: Number,
    sparse: true,
    description: 'Current outstanding loan balance'
  },

  mortgageEndDate: {
    type: Date,
    sparse: true,
    description: 'Date mortgage/loan ends'
  },

  // ========================================================================
  // PROPERTY VALUE & APPRECIATION
  // ========================================================================
  acquisitionPrice: {
    type: Number,
    sparse: true,
    description: 'Price at acquisition'
  },

  currentEstimatedValue: {
    type: Number,
    sparse: true,
    description: 'Current estimated property value'
  },

  currency: {
    type: String,
    enum: ['AED', 'USD', 'EUR', 'other'],
    default: 'AED',
    description: 'Currency for pricing'
  },

  lastValuationDate: {
    type: Date,
    sparse: true,
    description: 'Date of last property valuation'
  },

  // ========================================================================
  // DOCUMENTATION & LEGALS
  // ========================================================================
  titleDeedNumber: {
    type: String,
    sparse: true,
    trim: true,
    description: 'Property title deed number (if available)'
  },

  titleDeedDate: {
    type: Date,
    sparse: true,
    description: 'Date of title deed issuance'
  },

  registeredWithLandDept: {
    type: Boolean,
    default: false,
    description: 'Whether property is registered with land department'
  },

  // ========================================================================
  // LIABILITIES & ENCUMBRANCES
  // ========================================================================
  hasOutstandingDues: {
    type: Boolean,
    default: false,
    description: 'Whether property has outstanding dues'
  },

  outstandingDuesAmount: {
    type: Number,
    sparse: true,
    description: 'Amount of outstanding dues'
  },

  outstandingDuesType: {
    type: String,
    enum: ['property_tax', 'utilities', 'hoa_fees', 'maintenance', 'other'],
    sparse: true,
    description: 'Type of outstanding dues'
  },

  duesDueDate: {
    type: Date,
    sparse: true,
    description: 'Due date for outstanding dues'
  },

  // ========================================================================
  // MAINTENANCE & MANAGEMENT
  // ========================================================================
  propertyManager: {
    type: String,
    sparse: true,
    description: 'Name/ID of property manager'
  },

  maintenanceFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'annually', 'as_needed'],
    sparse: true,
    description: 'Frequency of maintenance'
  },

  lastMaintenanceDate: {
    type: Date,
    sparse: true,
    description: 'Date of last maintenance'
  },

  maintenanceBudget: {
    type: Number,
    sparse: true,
    description: 'Annual maintenance budget'
  },

  // ========================================================================
  // COMMUNICATION & PREFERENCES
  // ========================================================================
  ownerPreferredContact: {
    type: String,
    enum: ['email', 'phone', 'sms', 'whatsapp'],
    default: 'email',
    description: 'Owner preferred contact method for this property'
  },

  sendUpdates: {
    type: Boolean,
    default: true,
    description: 'Whether owner wants updates for this property'
  },

  updateFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    default: 'monthly',
    description: 'Frequency of updates'
  },

  // ========================================================================
  // STATUS & LIFECYCLE
  // ========================================================================
  status: {
    type: String,
    enum: ['active', 'inactive', 'sold', 'lease_ended', 'archived'],
    default: 'active',
    index: true,
    description: 'Status of ownership relationship'
  },

  // ========================================================================
  // METADATA & AUDIT
  // ========================================================================
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'Link creation timestamp'
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    description: 'Last update timestamp'
  },

  createdBy: {
    type: String,
    description: 'User/system that created this link'
  },

  updatedBy: {
    type: String,
    description: 'User/system that updated this link'
  },

  notes: {
    type: String,
    maxlength: 1000,
    description: 'Internal notes about this ownership'
  },

  // ========================================================================
  // SOURCE TRACKING
  // ========================================================================
  sourceSystem: {
    type: String,
    enum: ['google_sheets', 'direct_entry', 'import', 'sync'],
    default: 'google_sheets',
    description: 'Where the link data originated'
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
  }

}, {
  timestamps: true,
  strict: true,
  validateBeforeSave: true
});

// ========================================================================
// INDEXES FOR PERFORMANCE
// ========================================================================

// Foreign key indexes
propertyOwnerPropertiesSchema.index({ ownerId: 1, propertyId: 1 }, { unique: true });
propertyOwnerPropertiesSchema.index({ ownerId: 1 });
propertyOwnerPropertiesSchema.index({ propertyId: 1 });

// Status & filtering
propertyOwnerPropertiesSchema.index({ status: 1, acquisitionDate: -1 });
propertyOwnerPropertiesSchema.index({ status: 1, occupancyStatus: 1 });

// Ownership tracking
propertyOwnerPropertiesSchema.index({ isRented: 1, rentalStartDate: -1 });
propertyOwnerPropertiesSchema.index({ hasFinancing: 1, mortgageEndDate: 1 });

// Overdue tracking
propertyOwnerPropertiesSchema.index({ hasOutstandingDues: 1, duesDueDate: 1 });

// Source tracking
propertyOwnerPropertiesSchema.index({ sourceSystem: 1, externalId: 1 });
propertyOwnerPropertiesSchema.index({ lastSyncedAt: -1 });

// ========================================================================
// VIRTUALS
// ========================================================================

propertyOwnerPropertiesSchema.virtual('ownershipYears').get(function() {
  if (!this.acquisitionDate) return null;
  return Math.floor((new Date() - this.acquisitionDate) / (1000 * 60 * 60 * 24 * 365));
});

propertyOwnerPropertiesSchema.virtual('appreciationAmount').get(function() {
  if (this.acquisitionPrice && this.currentEstimatedValue) {
    return this.currentEstimatedValue - this.acquisitionPrice;
  }
  return null;
});

propertyOwnerPropertiesSchema.virtual('appreciationPercentage').get(function() {
  if (this.acquisitionPrice && this.currentEstimatedValue) {
    return Math.round(((this.currentEstimatedValue - this.acquisitionPrice) / this.acquisitionPrice) * 10000) / 100;
  }
  return null;
});

propertyOwnerPropertiesSchema.virtual('isLoanCleared').get(function() {
  return !this.hasFinancing || (this.mortgageEndDate && this.mortgageEndDate < new Date());
});

// ========================================================================
// HOOKS
// ========================================================================

propertyOwnerPropertiesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ========================================================================
// METHODS
// ========================================================================

/**
 * Get ownership summary for this property
 */
propertyOwnerPropertiesSchema.methods.getOwnershipSummary = function() {
  return {
    ownerId: this.ownerId,
    propertyId: this.propertyId,
    ownershipPercentage: this.ownershipPercentage,
    ownershipType: this.ownershipType,
    acquisitionDate: this.acquisitionDate,
    occupancyStatus: this.occupancyStatus,
    isRented: this.isRented,
    status: this.status
  };
};

/**
 * Get financial summary
 */
propertyOwnerPropertiesSchema.methods.getFinancialSummary = function() {
  return {
    acquisitionPrice: this.acquisitionPrice,
    currentEstimatedValue: this.currentEstimatedValue,
    appreciation: this.appreciationAmount,
    appreciationPercentage: this.appreciationPercentage,
    hasFinancing: this.hasFinancing,
    outstandingBalance: this.outstandingBalance,
    rentalAmount: this.rentalAmount,
    outstandingDuesAmount: this.outstandingDuesAmount
  };
};

/**
 * Check if ownership is current and active
 */
propertyOwnerPropertiesSchema.methods.isCurrentlyOwned = function() {
  return this.status === 'active' && !this.disposalDate;
};

/**
 * Mark property as rented
 */
propertyOwnerPropertiesSchema.methods.markAsRented = function(rentalAmount, startDate) {
  this.isRented = true;
  this.rentalAmount = rentalAmount;
  this.rentalStartDate = startDate || new Date();
  this.occupancyStatus = 'rented';
  return this.save();
};

/**
 * Mark rental as ended
 */
propertyOwnerPropertiesSchema.methods.endRental = function() {
  this.isRented = false;
  this.rentalEndDate = new Date();
  this.occupancyStatus = 'owner_occupied';
  return this.save();
};

/**
 * Sell/dispose the property
 */
propertyOwnerPropertiesSchema.methods.disposeProperty = function(disposalDate) {
  this.status = 'sold';
  this.disposalDate = disposalDate || new Date();
  return this.save();
};

// ========================================================================
// STATICS
// ========================================================================

/**
 * Get all properties for an owner
 */
propertyOwnerPropertiesSchema.statics.findByOwner = function(ownerId) {
  return this.find({ ownerId, status: 'active' });
};

/**
 * Get all owners for a property
 */
propertyOwnerPropertiesSchema.statics.findByProperty = function(propertyId) {
  return this.find({ propertyId, status: 'active' });
};

/**
 * Get rented properties
 */
propertyOwnerPropertiesSchema.statics.findRentedProperties = function(ownerId) {
  return this.find({ ownerId, isRented: true, status: 'active' });
};

/**
 * Get properties with outstanding dues
 */
propertyOwnerPropertiesSchema.statics.findWithOutstandingDues = function(ownerId) {
  return this.find({ 
    ownerId, 
    hasOutstandingDues: true, 
    status: 'active' 
  });
};

/**
 * Get financed properties (with mortgage)
 */
propertyOwnerPropertiesSchema.statics.findFinancedProperties = function(ownerId) {
  return this.find({ 
    ownerId, 
    hasFinancing: true, 
    status: 'active' 
  });
};

/**
 * Get portfolio statistics for owners
 */
propertyOwnerPropertiesSchema.statics.getPortfolioStats = function(ownerId) {
  return this.find({ ownerId, status: 'active' })
    .then(ownerships => {
      const stats = {
        totalProperties: ownerships.length,
        totalValue: 0,
        totalRental: 0,
        rentedProperties: 0,
        financedProperties: 0,
        outstandingDues: 0,
        ownershipYears: []
      };

      ownerships.forEach(ownership => {
        if (ownership.currentEstimatedValue) {
          stats.totalValue += ownership.currentEstimatedValue;
        }
        if (ownership.isRented && ownership.rentalAmount) {
          stats.totalRental += ownership.rentalAmount;
          stats.rentedProperties++;
        }
        if (ownership.hasFinancing) {
          stats.financedProperties++;
        }
        if (ownership.hasOutstandingDues && ownership.outstandingDuesAmount) {
          stats.outstandingDues += ownership.outstandingDuesAmount;
        }
        if (ownership.ownershipYears) {
          stats.ownershipYears.push(ownership.ownershipYears);
        }
      });

      stats.averageOwnershipYears = stats.ownershipYears.length > 0
        ? Math.round(stats.ownershipYears.reduce((a, b) => a + b) / stats.ownershipYears.length)
        : 0;

      return stats;
    });
};

// ========================================================================
// MODEL EXPORT
// ========================================================================

export default mongoose.model('PropertyOwnerProperties', propertyOwnerPropertiesSchema);
