import mongoose from 'mongoose';

/**
 * PropertyAgent Linking Table
 * PURPOSE: Link agents/brokers to properties
 * COLLECTION: propertyagents
 * KEY RELATIONSHIP: Agents can work on multiple properties, properties can have multiple agents
 */

const PropertyAgentSchema = new mongoose.Schema(
  {
    linkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique link identifier, format: AGENT-YYYYMMDD-XXXXX'
    },

    // FOREIGN KEYS
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      required: true,
      indexed: true,
      description: 'FK to Person - the agent/broker'
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      indexed: true,
      description: 'FK to Property'
    },

    // AGENT DETAILS
    agentRole: {
      type: String,
      enum: ['selling_agent', 'buying_agent', 'rental_agent'],
      required: true,
      indexed: true,
      description: 'What role does agent play'
    },
    commissionPercentage: {
      type: Number,
      optional: true,
      min: 0,
      max: 100,
      description: 'Commission percentage for this agent'
    },

    // STATUS
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      indexed: true,
      description: 'Agent active status for this property'
    },

    // METADATA
    notes: {
      type: String,
      optional: true,
      max: 500,
      description: 'Notes about agent role on property'
    }
  },
  {
    collection: 'propertyagents',
    timestamps: true
  }
);

// Indexes
PropertyAgentSchema.index({ linkId: 1 });
PropertyAgentSchema.index({ personId: 1 });
PropertyAgentSchema.index({ propertyId: 1 });
PropertyAgentSchema.index({ agentRole: 1 });
PropertyAgentSchema.index({ status: 1 });
PropertyAgentSchema.index({ personId: 1, status: 1 });

/**
 * STATICS
 */

PropertyAgentSchema.statics.findByAgent = function (personId) {
  return this.find({ personId, status: 'active' })
    .populate('propertyId');
};

PropertyAgentSchema.statics.findByProperty = function (propertyId) {
  return this.find({ propertyId, status: 'active' })
    .populate('personId');
};

PropertyAgentSchema.statics.findByRole = function (role) {
  return this.find({ agentRole: role, status: 'active' });
};

PropertyAgentSchema.statics.findSellingAgents = function (propertyId) {
  return this.find({ propertyId, agentRole: 'selling_agent', status: 'active' })
    .populate('personId');
};

PropertyAgentSchema.statics.findBuyingAgents = function (propertyId) {
  return this.find({ propertyId, agentRole: 'buying_agent', status: 'active' })
    .populate('personId');
};

PropertyAgentSchema.statics.findRentalAgents = function (propertyId) {
  return this.find({ propertyId, agentRole: 'rental_agent', status: 'active' })
    .populate('personId');
};

/**
 * VIRTUALS
 */

PropertyAgentSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

PropertyAgentSchema.virtual('roleDisplayName').get(function () {
  return this.agentRole
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});

/**
 * METHODS
 */

PropertyAgentSchema.methods.markAsInactive = async function () {
  this.status = 'inactive';
  return this.save();
};

PropertyAgentSchema.methods.markAsActive = async function () {
  this.status = 'active';
  return this.save();
};

const PropertyAgent = mongoose.model('PropertyAgent', PropertyAgentSchema);

export default PropertyAgent;
