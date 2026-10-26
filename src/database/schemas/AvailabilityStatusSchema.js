import mongoose from 'mongoose';

/**
 * AvailabilityStatus Reference Collection
 * PURPOSE: Enum reference table for property availability status
 * COLLECTION: availabilitystatuses
 * NOTE: Properties can have MULTIPLE availability statuses (e.g., available for rent AND for sale simultaneously)
 */

const AvailabilityStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['available_for_rent', 'available_for_sale', 'available_for_both', 'not_available', 'sold'],
      lowercase: true,
      description: 'Availability status of property'
    },
    description: {
      type: String,
      optional: true,
      max: 200,
      description: 'Human-readable description'
    },
    category: {
      type: String,
      enum: ['active', 'inactive', 'terminal'],
      description: 'Status category: active (rent/sale possibility), inactive (unavailable), terminal (sold)'
    }
  },
  {
    collection: 'availabilitystatuses',
    timestamps: false
  }
);

// Indexes
AvailabilityStatusSchema.index({ status: 1 });
AvailabilityStatusSchema.index({ category: 1 });

/**
 * STATICS
 */

AvailabilityStatusSchema.statics.findByStatus = function (status) {
  return this.findOne({ status: status.toLowerCase() });
};

AvailabilityStatusSchema.statics.getAllStatuses = function () {
  return this.find({}).sort({ status: 1 });
};

AvailabilityStatusSchema.statics.getActiveStatuses = function () {
  return this.find({ category: 'active' }).sort({ status: 1 });
};

AvailabilityStatusSchema.statics.getTerminalStatuses = function () {
  return this.find({ category: 'terminal' }).sort({ status: 1 });
};

/**
 * VIRTUALS
 */

AvailabilityStatusSchema.virtual('displayName').get(function () {
  return this.status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});

AvailabilityStatusSchema.virtual('isActive').get(function () {
  return this.category === 'active';
});

AvailabilityStatusSchema.virtual('isSold').get(function () {
  return this.status === 'sold';
});

const AvailabilityStatus = mongoose.model('AvailabilityStatus', AvailabilityStatusSchema);

export default AvailabilityStatus;
