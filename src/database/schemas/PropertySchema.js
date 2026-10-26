import mongoose from 'mongoose';

/**
 * Property Collection (CORE ENTITY)
 * PURPOSE: Physical property information
 * COLLECTION: properties
 * KEY CONCEPT: Composite key (clusterId + unitNumber) for uniqueness and relationship management
 * AVAILABILITY: Can have MULTIPLE simultaneous statuses (e.g., available_for_rent AND available_for_sale)
 */

const PropertySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique property identifier, format: PROP-YYYYMMDD-XXXXX'
    },
    // COMPOSITE KEY COMPONENTS
    clusterId: {
      type: String,
      required: true,
      indexed: true,
      description: 'FK to Cluster - part of composite key'
    },
    unitNumber: {
      type: String,
      required: true,
      description: 'Unit number within cluster - part of composite key'
    },

    // PHYSICAL ATTRIBUTES
    builtUpArea: {
      type: Number,
      required: true,
      min: 0,
      description: 'Built-up area in square feet'
    },
    plotArea: {
      type: Number,
      required: true,
      min: 0,
      description: 'Plot area in square feet'
    },
    hasParking: {
      type: Boolean,
      required: true,
      default: false,
      description: 'Whether property has parking'
    },
    parkingSpaces: {
      type: Number,
      optional: true,
      min: 0,
      description: 'Number of parking spaces'
    },

    // STATUS REFERENCES (ENUMS)
    furnishingStatusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FurnishingStatus',
      indexed: true,
      description: 'FK to FurnishingStatus (furnished/unfurnished/semi-furnished)'
    },
    occupancyStatusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OccupancyStatus',
      indexed: true,
      description: 'FK to OccupancyStatus (owner/tenant/vacant)'
    },
    availabilityStatusIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'AvailabilityStatus',
      indexed: true,
      description: 'Array FK to AvailabilityStatus - SUPPORTS MULTIPLE (rent + sale simultaneously)'
    },

    // CURRENT TENANCY (CONVENIENCE FIELDS)
    // These are denormalized for quick access; source of truth is PropertyTenancy collection
    currentTenancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PropertyTenancy',
      sparse: true,
      indexed: true,
      description: 'FK to active PropertyTenancy'
    },
    currentTenantPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      sparse: true,
      description: 'FK to Person who is currently renting (denormalized)'
    },

    // MULTIMEDIA
    imageUrls: {
      type: [String],
      optional: true,
      description: 'Array of image folder URLs'
    },
    floorPlanUrl: {
      type: String,
      optional: true,
      description: 'Floor plan URL'
    },

    // FINANCIAL
    serviceCharges: {
      type: Number,
      optional: true,
      min: 0,
      description: 'Monthly/annual service charges'
    },
    serviceChargesCurrency: {
      type: String,
      enum: ['AED', 'USD', 'EUR'],
      default: 'AED',
      description: 'Currency for service charges'
    },

    // STATUS & METADATA
    status: {
      type: String,
      enum: ['active', 'inactive', 'sold', 'archived'],
      default: 'active',
      indexed: true,
      description: 'Property status'
    },
    notes: {
      type: String,
      optional: true,
      max: 500,
      description: 'Additional notes'
    }
  },
  {
    collection: 'properties',
    timestamps: true
  }
);

// COMPOSITE UNIQUE INDEX - Essential for relationship management
PropertySchema.index({ clusterId: 1, unitNumber: 1 }, { unique: true });

// Other indexes
PropertySchema.index({ propertyId: 1 });
PropertySchema.index({ clusterId: 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ furnishingStatusId: 1 });
PropertySchema.index({ occupancyStatusId: 1 });
PropertySchema.index({ availabilityStatusIds: 1 });
PropertySchema.index({ currentTenancyId: 1 });
PropertySchema.index({ builtUpArea: 1 });

/**
 * STATICS
 */

PropertySchema.statics.findByPropertyId = function (propertyId) {
  return this.findOne({ propertyId });
};

PropertySchema.statics.findByCompositeKey = function (clusterId, unitNumber) {
  return this.findOne({ clusterId, unitNumber });
};

PropertySchema.statics.findByCluster = function (clusterId) {
  return this.find({ clusterId }).sort({ unitNumber: 1 });
};

PropertySchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

PropertySchema.statics.findByFurnishingStatus = function (furnishingStatusId) {
  return this.find({ furnishingStatusId });
};

PropertySchema.statics.findByOccupancyStatus = function (occupancyStatusId) {
  return this.find({ occupancyStatusId });
};

PropertySchema.statics.findByAvailabilityStatus = function (availabilityStatusId) {
  return this.find({ availabilityStatusIds: availabilityStatusId });
};

PropertySchema.statics.findOccupiedProperties = function () {
  // Properties occupied by owner or tenant
  return this.find({
    occupancyStatusId: { $in: ['occupied_by_owner', 'occupied_by_tenant'] }
  });
};

PropertySchema.statics.findVacantProperties = function () {
  return this.find({ occupancyStatusId: 'vacant' });
};

PropertySchema.statics.findWithActiveTenancy = function () {
  return this.find({ currentTenancyId: { $ne: null } });
};

/**
 * VIRTUALS
 */

PropertySchema.virtual('displayName').get(function () {
  return `${this.clusterId}-${this.unitNumber}`;
});

PropertySchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

PropertySchema.virtual('isSold').get(function () {
  return this.status === 'sold';
});

PropertySchema.virtual('isOccupied').get(function () {
  return this.currentTenancyId !== null;
});

PropertySchema.virtual('totalArea').get(function () {
  return this.builtUpArea + this.plotArea;
});

/**
 * METHODS
 */

PropertySchema.methods.getPropertyInfo = function () {
  return {
    propertyId: this.propertyId,
    clusterId: this.clusterId,
    unitNumber: this.unitNumber,
    builtUpArea: this.builtUpArea,
    plotArea: this.plotArea,
    hasParking: this.hasParking,
    status: this.status
  };
};

PropertySchema.methods.markAsSold = async function () {
  this.status = 'sold';
  this.currentTenancyId = null;
  this.currentTenantPersonId = null;
  return this.save();
};

PropertySchema.methods.setCurrentTenancy = async function (tenancyId, tenantPersonId) {
  this.currentTenancyId = tenancyId;
  this.currentTenantPersonId = tenantPersonId;
  return this.save();
};

PropertySchema.methods.clearCurrentTenancy = async function () {
  this.currentTenancyId = null;
  this.currentTenantPersonId = null;
  return this.save();
};

/**
 * HOOKS
 */

PropertySchema.pre('save', function (next) {
  // Validate composite key not changing
  if (this.isModified('clusterId') || this.isModified('unitNumber')) {
    // In a real scenario, prevent changes to compositional keys
  }
  next();
});

const Property = mongoose.model('Property', PropertySchema);

export default Property;
