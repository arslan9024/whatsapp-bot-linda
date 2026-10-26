import mongoose from 'mongoose';

/**
 * PropertyBuying Linking Table
 * PURPOSE: Track buy/sell transactions for properties
 * COLLECTION: propertybuying
 * KEY RELATIONSHIP: Tracks buyers and sellers in property transactions
 */

const PropertyBuyingSchema = new mongoose.Schema(
  {
    linkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique link identifier, format: BUYING-YYYYMMDD-XXXXX'
    },

    // FOREIGN KEYS
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      required: true,
      indexed: true,
      description: 'FK to Person - buyer or seller'
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      indexed: true,
      description: 'FK to Property'
    },

    // TRANSACTION DETAILS
    transactionType: {
      type: String,
      enum: ['buyer', 'seller'],
      required: true,
      description: 'Is this person the buyer or seller'
    },
    offerDate: {
      type: Date,
      required: true,
      description: 'Date offer was made'
    },
    completionDate: {
      type: Date,
      sparse: true,
      description: 'Date transaction completed (if completed)'
    },
    transactionPrice: {
      type: Number,
      required: true,
      min: 0,
      description: 'Agreed transaction price'
    },
    currency: {
      type: String,
      enum: ['AED', 'USD', 'EUR'],
      default: 'AED',
      description: 'Currency of transaction'
    },

    // STATUS
    status: {
      type: String,
      enum: ['offer', 'negotiating', 'agreed', 'completed', 'cancelled'],
      default: 'offer',
      indexed: true,
      description: 'Transaction status'
    },

    // METADATA
    notes: {
      type: String,
      optional: true,
      max: 500,
      description: 'Notes about transaction'
    }
  },
  {
    collection: 'propertybuying',
    timestamps: true
  }
);

// Indexes
PropertyBuyingSchema.index({ linkId: 1 });
PropertyBuyingSchema.index({ personId: 1 });
PropertyBuyingSchema.index({ propertyId: 1 });
PropertyBuyingSchema.index({ transactionType: 1 });
PropertyBuyingSchema.index({ status: 1 });
PropertyBuyingSchema.index({ offerDate: -1 });

/**
 * STATICS
 */

PropertyBuyingSchema.statics.findByBuyer = function (personId) {
  return this.find({ personId, transactionType: 'buyer' });
};

PropertyBuyingSchema.statics.findBySeller = function (personId) {
  return this.find({ personId, transactionType: 'seller' });
};

PropertyBuyingSchema.statics.findByProperty = function (propertyId) {
  return this.find({ propertyId });
};

PropertyBuyingSchema.statics.findPendingTransactions = function () {
  return this.find({
    status: { $in: ['offer', 'negotiating', 'agreed'] }
  });
};

PropertyBuyingSchema.statics.findCompletedTransactions = function () {
  return this.find({ status: 'completed' });
};

/**
 * VIRTUALS
 */

PropertyBuyingSchema.virtual('displayName').get(function () {
  return `${this.transactionType.toUpperCase()}: ${this.transactionPrice} ${this.currency}`;
});

PropertyBuyingSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

/**
 * METHODS
 */

PropertyBuyingSchema.methods.markAsAgreed = async function () {
  this.status = 'agreed';
  return this.save();
};

PropertyBuyingSchema.methods.completeTransaction = async function (completionDate = new Date()) {
  this.status = 'completed';
  this.completionDate = completionDate;
  return this.save();
};

PropertyBuyingSchema.methods.cancelTransaction = async function () {
  this.status = 'cancelled';
  return this.save();
};

const PropertyBuying = mongoose.model('PropertyBuying', PropertyBuyingSchema);

export default PropertyBuying;
