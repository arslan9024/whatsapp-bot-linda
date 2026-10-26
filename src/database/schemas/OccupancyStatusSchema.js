import mongoose from 'mongoose';

/**
 * OccupancyStatus Reference Collection
 * PURPOSE: Enum reference table for property occupancy status
 * COLLECTION: occupancystatuses
 */

const OccupancyStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['occupied_by_owner', 'occupied_by_tenant', 'vacant'],
      lowercase: true,
      description: 'Current occupancy status of property'
    },
    description: {
      type: String,
      optional: true,
      max: 200,
      description: 'Human-readable description'
    }
  },
  {
    collection: 'occupancystatuses',
    timestamps: false
  }
);

// Indexes
OccupancyStatusSchema.index({ status: 1 });

/**
 * STATICS
 */

OccupancyStatusSchema.statics.findByStatus = function (status) {
  return this.findOne({ status: status.toLowerCase() });
};

OccupancyStatusSchema.statics.getAllStatuses = function () {
  return this.find({}).sort({ status: 1 });
};

/**
 * VIRTUALS
 */

OccupancyStatusSchema.virtual('displayName').get(function () {
  return this.status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});

const OccupancyStatus = mongoose.model('OccupancyStatus', OccupancyStatusSchema);

export default OccupancyStatus;
