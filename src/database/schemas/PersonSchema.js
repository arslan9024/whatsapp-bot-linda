import mongoose from 'mongoose';

/**
 * Person Collection (CORE ENTITY)
 * PURPOSE: Central repository for all people (can be tenant, owner, agent, buyer, seller)
 * COLLECTION: people
 * KEY CONCEPT: One person with firstName + lastName + mobile can play multiple roles in different properties
 * PREVENTS: Data duplication, ensures single source of truth for person contact details
 */

const PersonSchema = new mongoose.Schema(
  {
    personId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique person identifier, format: PERSON-YYYYMMDD-XXXXX'
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      max: 50,
      indexed: true,
      description: 'First name of person'
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      max: 50,
      indexed: true,
      description: 'Last name of person'
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      max: 100,
      description: 'Full name (computed from firstName + lastName)'
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      match: /^\+?[0-9]{7,15}$/,
      indexed: true,
      description: 'Mobile phone number (from online leads platform)'
    },
    email: {
      type: String,
      optional: true,
      lowercase: true,
      trim: true,
      sparse: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      description: 'Email address'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      indexed: true,
      description: 'Person status'
    },
    source: {
      type: String,
      enum: ['online_leads_platform', 'direct', 'import', 'integration'],
      optional: true,
      description: 'Source where person data originated'
    },
    notes: {
      type: String,
      optional: true,
      max: 500,
      description: 'Internal notes about this person'
    }
  },
  {
    collection: 'people',
    timestamps: true
  }
);

// Indexes
PersonSchema.index({ personId: 1 });
PersonSchema.index({ firstName: 1, lastName: 1 });
PersonSchema.index({ mobile: 1 });
PersonSchema.index({ email: 1 });
PersonSchema.index({ status: 1 });
PersonSchema.index({ firstName: 'text', lastName: 'text', mobile: 'text', email: 'text' });

/**
 * STATICS
 */

PersonSchema.statics.findByPersonId = function (personId) {
  return this.findOne({ personId });
};

PersonSchema.statics.findByMobile = function (mobile) {
  return this.findOne({ mobile });
};

PersonSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

PersonSchema.statics.findByName = function (firstName, lastName) {
  return this.findOne({
    firstName: new RegExp(firstName, 'i'),
    lastName: new RegExp(lastName, 'i')
  });
};

PersonSchema.statics.getActive = function () {
  return this.find({ status: 'active' }).sort({ lastName: 1, firstName: 1 });
};

PersonSchema.statics.searchByText = function (query) {
  return this.find({ $text: { $search: query } }).limit(20);
};

PersonSchema.statics.findDuplicates = function () {
  // Find people with same firstName + lastName + mobile
  return this.aggregate([
    {
      $group: {
        _id: { firstName: '$firstName', lastName: '$lastName', mobile: '$mobile' },
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    {
      $match: { count: { $gt: 1 } }
    }
  ]);
};

/**
 * VIRTUALS
 */

PersonSchema.virtual('displayName').get(function () {
  return this.fullName;
});

PersonSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

/**
 * METHODS
 */

PersonSchema.methods.getContactInfo = function () {
  return {
    firstName: this.firstName,
    lastName: this.lastName,
    mobile: this.mobile,
    email: this.email,
    displayName: this.fullName
  };
};

PersonSchema.methods.markActive = async function () {
  this.status = 'active';
  return this.save();
};

PersonSchema.methods.markInactive = async function () {
  this.status = 'inactive';
  return this.save();
};

PersonSchema.methods.archive = async function () {
  this.status = 'archived';
  return this.save();
};

/**
 * HOOKS
 */

PersonSchema.pre('save', function (next) {
  if (!this.fullName || this.isModified('firstName') || this.isModified('lastName')) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
  next();
});

const Person = mongoose.model('Person', PersonSchema);

export default Person;
