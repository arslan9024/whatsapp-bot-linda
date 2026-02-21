import mongoose from 'mongoose';

/**
 * PropertyOwnership Linking Table
 * PURPOSE: Defines ownership relationships - how many people own what percentage of a property
 * COLLECTION: propertyownerships
 * KEY RELATIONSHIP: Many persons can own one property (joint ownership), one person can own many properties
 * EXAMPLE: Property X is 50% owned by Person A, 50% owned by Person B
 */

const PropertyOwnershipSchema = new mongoose.Schema(
  {
    linkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique link identifier, format: OWNERSHIP-YYYYMMDD-XXXXX'
    },

    // FOREIGN KEYS
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      required: true,
      indexed: true,
      description: 'FK to Person - the owner'
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      indexed: true,
      description: 'FK to Property - the owned property'
    },

    // OWNERSHIP DETAILS
    ownershipPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      description: 'Ownership percentage (e.g., 50 for co-owner in joint ownership)'
    },
    ownershipType: {
      type: String,
      enum: ['sole', 'joint', 'co-ownership', 'trust', 'company'],
      optional: true,
      description: 'Type of ownership'
    },

    // ACQUISITION & DISPOSAL
    acquisitionDate: {
      type: Date,
      required: true,
      description: 'Date person acquired this property'
    },
    acquisitionPrice: {
      type: Number,
      optional: true,
      min: 0,
      description: 'Purchase price'
    },
    disposalDate: {
      type: Date,
      sparse: true,
      description: 'Date person sold/disposed their ownership'
    },
    disposalPrice: {
      type: Number,
      optional: true,
      sparse: true,
      min: 0,
      description: 'Sale price'
    },

    // CURRENT VALUATION
    currentEstimatedValue: {
      type: Number,
      optional: true,
      min: 0,
      description: 'Current estimated property value'
    },
    lastValuationDate: {
      type: Date,
      sparse: true,
      description: 'When property was last valued'
    },
    currency: {
      type: String,
      enum: ['AED', 'USD', 'EUR'],
      default: 'AED',
      description: 'Currency for prices and valuations'
    },

    // STATUS
    status: {
      type: String,
      enum: ['active', 'inactive', 'sold', 'archived'],
      default: 'active',
      indexed: true,
      description: 'Ownership status'
    },

    // METADATA
    notes: {
      type: String,
      optional: true,
      max: 500,
      description: 'Additional notes'
    }
  },
  {
    collection: 'propertyownerships',
    timestamps: true
  }
);

// COMPOSITE UNIQUE INDEX - Prevent duplicate ownership records for same person+property combo
PropertyOwnershipSchema.index({ personId: 1, propertyId: 1 }, { unique: true });

// Other indexes
PropertyOwnershipSchema.index({ linkId: 1 });
PropertyOwnershipSchema.index({ personId: 1 });
PropertyOwnershipSchema.index({ propertyId: 1 });
PropertyOwnershipSchema.index({ status: 1 });
PropertyOwnershipSchema.index({ acquisitionDate: -1 });
PropertyOwnershipSchema.index({ status: 1, acquisitionDate: -1 });

/**
 * STATICS
 */

PropertyOwnershipSchema.statics.findByLinkId = function (linkId) {
  return this.findOne({ linkId });
};

PropertyOwnershipSchema.statics.findByOwner = function (personId) {
  return this.find({ personId, status: 'active' })
    .populate('propertyId')
    .sort({ acquisitionDate: -1 });
};

PropertyOwnershipSchema.statics.findByProperty = function (propertyId) {
  return this.find({ propertyId, status: 'active' })
    .populate('personId')
    .sort({ ownershipPercentage: -1 });
};

PropertyOwnershipSchema.statics.findCoOwners = function (propertyId) {
  // Find all people who co-own a property
  return this.find({ propertyId, status: 'active' })
    .populate('personId', 'firstName lastName mobile email');
};

PropertyOwnershipSchema.statics.findOwnerPortfolio = function (personId) {
  // All properties owned by a person
  return this.find({ personId, status: 'active' })
    .populate('propertyId')
    .sort({ acquisitionDate: -1 });
};

PropertyOwnershipSchema.statics.findWithOutstandingValue = function (personId) {
  // Properties where owner still has value
  return this.find({ personId, status: 'active', disposalDate: null })
    .populate('propertyId');
};

PropertyOwnershipSchema.statics.findDisposedProperties = function (personId) {
  // Properties sold by person
  return this.find({ personId, disposalDate: { $ne: null } });
};

PropertyOwnershipSchema.statics.getPortfolioStats = function (personId) {
  return this.aggregate([
    { $match: { personId: mongoose.Types.ObjectId(personId), status: 'active' } },
    {
      $group: {
        _id: '$personId',
        totalProperties: { $sum: 1 },
        totalOwnershipPercentage: { $sum: '$ownershipPercentage' },
        totalAcquisitionValue: { $sum: '$acquisitionPrice' },
        totalCurrentValue: { $sum: '$currentEstimatedValue' }
      }
    }
  ]);
};

/**
 * VIRTUALS
 */

PropertyOwnershipSchema.virtual('appreciationAmount').get(function () {
  if (!this.acquisitionPrice || !this.currentEstimatedValue) return null;
  return this.currentEstimatedValue - this.acquisitionPrice;
});

PropertyOwnershipSchema.virtual('appreciationPercentage').get(function () {
  if (!this.acquisitionPrice) return null;
  return ((this.currentEstimatedValue - this.acquisitionPrice) / this.acquisitionPrice) * 100;
});

PropertyOwnershipSchema.virtual('ownershipYears').get(function () {
  const now = new Date();
  const years = (now - this.acquisitionDate) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.floor(years);
});

PropertyOwnershipSchema.virtual('isActive').get(function () {
  return this.status === 'active' && !this.disposalDate;
});

PropertyOwnershipSchema.virtual('isDisposed').get(function () {
  return !!this.disposalDate;
});

/**
 * METHODS
 */

PropertyOwnershipSchema.methods.getOwnershipSummary = function () {
  return {
    linkId: this.linkId,
    ownershipPercentage: this.ownershipPercentage,
    acquisitionDate: this.acquisitionDate,
    acquisitionPrice: this.acquisitionPrice,
    currentEstimatedValue: this.currentEstimatedValue,
    status: this.status
  };
};

PropertyOwnershipSchema.methods.markAsDisposed = async function (disposalDate, disposalPrice) {
  this.disposalDate = disposalDate;
  this.disposalPrice = disposalPrice;
  this.status = 'sold';
  return this.save();
};

PropertyOwnershipSchema.methods.updateValuation = async function (newValue, valuationDate) {
  this.currentEstimatedValue = newValue;
  this.lastValuationDate = valuationDate;
  return this.save();
};

/**
 * HOOKS
 */

// Validate total ownership percentage doesn't exceed 100%
PropertyOwnershipSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('ownershipPercentage')) {
    const totalOwnership = await this.constructor
      .findByProperty(this.propertyId)
      .then(docs => docs.reduce((sum, doc) => sum + doc.ownershipPercentage, 0));

    if (totalOwnership > 100) {
      throw new Error('Total ownership percentage cannot exceed 100%');
    }
  }
  next();
});

const PropertyOwnership = mongoose.model('PropertyOwnership', PropertyOwnershipSchema);

export default PropertyOwnership;
