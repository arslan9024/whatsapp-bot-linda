import mongoose from 'mongoose';

/**
 * FurnishingStatus Reference Collection
 * PURPOSE: Enum reference table for property furnishing status
 * COLLECTION: furnishingstatuses
 */

const FurnishingStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['furnished', 'unfurnished', 'semi-furnished'],
      lowercase: true,
      description: 'Furnishing status of property'
    },
    description: {
      type: String,
      optional: true,
      max: 200,
      description: 'Human-readable description'
    }
  },
  {
    collection: 'furnishingstatuses',
    timestamps: false
  }
);

// Indexes
FurnishingStatusSchema.index({ status: 1 });

/**
 * STATICS
 */

FurnishingStatusSchema.statics.findByStatus = function (status) {
  return this.findOne({ status: status.toLowerCase() });
};

FurnishingStatusSchema.statics.getAllStatuses = function () {
  return this.find({}).sort({ status: 1 });
};

/**
 * VIRTUALS
 */

FurnishingStatusSchema.virtual('displayName').get(function () {
  return this.status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});

const FurnishingStatus = mongoose.model('FurnishingStatus', FurnishingStatusSchema);

export default FurnishingStatus;
