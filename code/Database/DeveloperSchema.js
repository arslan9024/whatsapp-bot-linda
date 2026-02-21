import mongoose from 'mongoose';

/**
 * Developer Reference Collection
 * PURPOSE: Information about property developers/builders
 * COLLECTION: developers
 */

const DeveloperSchema = new mongoose.Schema(
  {
    developerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique developer identifier'
    },
    developerName: {
      type: String,
      required: true,
      trim: true,
      max: 200,
      indexed: true,
      description: 'Full name of developer'
    },
    contactEmail: {
      type: String,
      optional: true,
      lowercase: true,
      trim: true,
      sparse: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      description: 'Contact email address'
    },
    contactPhone: {
      type: String,
      optional: true,
      trim: true,
      sparse: true,
      match: /^\+?[0-9]{7,15}$/,
      description: 'Contact phone number'
    },
    website: {
      type: String,
      optional: true,
      trim: true,
      sparse: true,
      description: 'Developer website URL'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      indexed: true,
      description: 'Developer status'
    },
    notes: {
      type: String,
      optional: true,
      max: 1000,
      description: 'Additional notes'
    }
  },
  {
    collection: 'developers',
    timestamps: true
  }
);

// Indexes
DeveloperSchema.index({ developerId: 1 });
DeveloperSchema.index({ developerName: 1 });
DeveloperSchema.index({ status: 1 });
DeveloperSchema.index({ developerName: 'text', contactEmail: 'text' });

/**
 * STATICS
 */

DeveloperSchema.statics.findByName = function (name) {
  return this.findOne({ developerName: new RegExp(name, 'i') });
};

DeveloperSchema.statics.getActive = function () {
  return this.find({ status: 'active' }).sort({ developerName: 1 });
};

DeveloperSchema.statics.getSearchResults = function (query) {
  return this.find({ $text: { $search: query } }).limit(10);
};

/**
 * VIRTUALS
 */

DeveloperSchema.virtual('displayName').get(function () {
  return this.developerName;
});

DeveloperSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

const Developer = mongoose.model('Developer', DeveloperSchema);

export default Developer;
