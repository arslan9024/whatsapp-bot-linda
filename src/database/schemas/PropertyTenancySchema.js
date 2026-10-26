import mongoose from 'mongoose';

/**
 * PropertyTenancy Collection (RENTAL CONTRACT)
 * PURPOSE: Rental agreement/contract between tenant and landlord(s)
 * COLLECTION: propertytenancies
 * KEY RELATIONSHIP: One tenant, multiple landlords (if joint ownership), detailed payment schedule
 * EXAMPLE: Tenant John rents from Owners A & B (85,000 AED / 4 cheques from 2024-01-15 to 2026-01-14)
 */

const ChequeSchema = new mongoose.Schema(
  {
    chequeNumber: {
      type: String,
      required: true,
      description: 'Cheque number/identifier'
    },
    chequeAmount: {
      type: Number,
      required: true,
      min: 0,
      description: 'Amount of individual cheque'
    },
    chequeDueDate: {
      type: Date,
      required: true,
      description: 'Date cheque is due'
    },
    isPaid: {
      type: Boolean,
      default: false,
      description: 'Whether cheque has been paid'
    },
    paidDate: {
      type: Date,
      sparse: true,
      description: 'Date cheque was actually paid (if paid)'
    },
    remarks: {
      type: String,
      optional: true,
      max: 200,
      description: 'Notes about this cheque'
    }
  },
  { _id: false } // Don't create ObjectId for each cheque
);

const PropertyTenancySchema = new mongoose.Schema(
  {
    tenancyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique tenancy identifier, format: TENANCY-YYYYMMDD-XXXXX'
    },

    // PEOPLE INVOLVED
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      indexed: true,
      description: 'FK to Property being rented'
    },
    tenantPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      required: true,
      indexed: true,
      description: 'FK to Person - WHO IS RENTING'
    },
    landlordPersonIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Person',
      required: true,
      indexed: true,
      description: 'Array FK to Person(s) - ALL OWNERS RECEIVING RENT (supports joint ownership)'
    },

    // CONTRACT PERIOD
    contractStartDate: {
      type: Date,
      required: true,
      description: 'When tenancy begins (e.g., 2024-01-15)'
    },
    contractExpiryDate: {
      type: Date,
      required: true,
      description: 'When tenancy ends (e.g., 2026-01-14)'
    },

    // FINANCIAL TERMS
    contractAmount: {
      type: Number,
      required: true,
      min: 0,
      description: 'Total rental amount (e.g., 85,000 AED)'
    },
    contractCurrency: {
      type: String,
      enum: ['AED', 'USD', 'EUR'],
      default: 'AED',
      description: 'Currency of contract amount'
    },

    // PAYMENT SCHEDULE
    paymentSchedule: {
      totalCheques: {
        type: Number,
        required: true,
        min: 1,
        description: 'Total number of cheques (e.g., 4)'
      },
      cheques: {
        type: [ChequeSchema],
        required: true,
        description: 'Array of cheques with detailed schedule'
        // Each cheque has: chequeNumber, chequeAmount, chequeDueDate, isPaid, paidDate, remarks
      }
    },

    // LEASE TERMS (OPTIONAL)
    maintenanceResponsibility: {
      type: String,
      enum: ['landlord', 'tenant', 'shared'],
      optional: true,
      description: 'Who maintains the property'
    },
    utilitiesResponsibility: {
      type: String,
      enum: ['landlord', 'tenant', 'shared'],
      optional: true,
      description: 'Who pays utilities'
    },
    allowPets: {
      type: Boolean,
      optional: true,
      default: false,
      description: 'Are pets allowed'
    },
    allowSubletting: {
      type: Boolean,
      optional: true,
      default: false,
      description: 'Can tenant sublet property'
    },
    depositAmount: {
      type: Number,
      optional: true,
      min: 0,
      description: 'Security deposit amount'
    },

    // STATUS & TRACKING
    status: {
      type: String,
      enum: ['active', 'ended', 'expired', 'terminated', 'on_hold'],
      default: 'active',
      indexed: true,
      description: 'Current tenancy status'
    },
    reasonForTermination: {
      type: String,
      sparse: true,
      max: 300,
      description: 'If terminated early, reason why'
    },
    terminationDate: {
      type: Date,
      sparse: true,
      description: 'If terminated, when (can be before expiryDate)'
    },

    // METADATA
    notes: {
      type: String,
      optional: true,
      max: 1000,
      description: 'Internal notes about tenancy'
    }
  },
  {
    collection: 'propertytenancies',
    timestamps: true
  }
);

// Indexes
PropertyTenancySchema.index({ tenancyId: 1 });
PropertyTenancySchema.index({ propertyId: 1 });
PropertyTenancySchema.index({ tenantPersonId: 1 });
PropertyTenancySchema.index({ landlordPersonIds: 1 });
PropertyTenancySchema.index({ status: 1 });
PropertyTenancySchema.index({ contractStartDate: 1, contractExpiryDate: 1 });
PropertyTenancySchema.index({ status: 1, contractExpiryDate: 1 });
PropertyTenancySchema.index({
  propertyId: 1,
  status: 1,
  contractStartDate: -1
});

/**
 * STATICS
 */

PropertyTenancySchema.statics.findByTenancyId = function (tenancyId) {
  return this.findOne({ tenancyId });
};

PropertyTenancySchema.statics.findActiveByProperty = function (propertyId) {
  return this.findOne({ propertyId, status: 'active' })
    .populate('tenantPersonId')
    .populate('landlordPersonIds');
};

PropertyTenancySchema.statics.findByTenant = function (tenantPersonId) {
  return this.find({ tenantPersonId })
    .populate('propertyId')
    .populate('landlordPersonIds')
    .sort({ contractStartDate: -1 });
};

PropertyTenancySchema.statics.findByLandlord = function (landlordPersonId) {
  return this.find({ landlordPersonIds: landlordPersonId })
    .populate('propertyId')
    .populate('tenantPersonId')
    .sort({ contractStartDate: -1 });
};

PropertyTenancySchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

PropertyTenancySchema.statics.findExpiredContracts = function () {
  const today = new Date();
  return this.find({
    contractExpiryDate: { $lt: today },
    status: 'active' // Still marked active even though expired
  });
};

PropertyTenancySchema.statics.findUpcomingExpirations = function (daysAhead = 30) {
  const today = new Date();
  const future = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return this.find({
    contractExpiryDate: { $gte: today, $lte: future },
    status: 'active'
  });
};

PropertyTenancySchema.statics.findOverdueCheques = function () {
  const today = new Date();
  return this.find({
    'paymentSchedule.cheques': {
      $elemMatch: { isPaid: false, chequeDueDate: { $lt: today } }
    }
  });
};

PropertyTenancySchema.statics.findUpcomingCheques = function (daysAhead = 7) {
  const today = new Date();
  const future = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return this.find({
    'paymentSchedule.cheques': {
      $elemMatch: { isPaid: false, chequeDueDate: { $gte: today, $lte: future } }
    }
  });
};

/**
 * VIRTUALS
 */

PropertyTenancySchema.virtual('contractDurationMonths').get(function () {
  const start = new Date(this.contractStartDate);
  const end = new Date(this.contractExpiryDate);
  return (end - start) / (30 * 24 * 60 * 60 * 1000);
});

PropertyTenancySchema.virtual('contractDurationYears').get(function () {
  return this.contractDurationMonths / 12;
});

PropertyTenancySchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

PropertyTenancySchema.virtual('isExpired').get(function () {
  return new Date() > this.contractExpiryDate && this.status === 'active';
});

PropertyTenancySchema.virtual('totalChequesPaid').get(function () {
  if (!this.paymentSchedule || !this.paymentSchedule.cheques) return 0;
  return this.paymentSchedule.cheques.filter(c => c.isPaid).length;
});

PropertyTenancySchema.virtual('totalChequesUnpaid').get(function () {
  if (!this.paymentSchedule || !this.paymentSchedule.cheques) return 0;
  return this.paymentSchedule.cheques.filter(c => !c.isPaid).length;
});

PropertyTenancySchema.virtual('totalPaidAmount').get(function () {
  if (!this.paymentSchedule || !this.paymentSchedule.cheques) return 0;
  return this.paymentSchedule.cheques
    .filter(c => c.isPaid)
    .reduce((sum, c) => sum + c.chequeAmount, 0);
});

PropertyTenancySchema.virtual('totalUnpaidAmount').get(function () {
  if (!this.paymentSchedule || !this.paymentSchedule.cheques) return 0;
  return this.paymentSchedule.cheques
    .filter(c => !c.isPaid)
    .reduce((sum, c) => sum + c.chequeAmount, 0);
});

PropertyTenancySchema.virtual('paymentCompletionPercentage').get(function () {
  if (!this.contractAmount || this.contractAmount === 0) return 0;
  return (this.totalPaidAmount / this.contractAmount) * 100;
});

/**
 * METHODS
 */

PropertyTenancySchema.methods.getTenancyInfo = function () {
  return {
    tenancyId: this.tenancyId,
    contractPeriod: `${this.contractStartDate.toDateString()} - ${this.contractExpiryDate.toDateString()}`,
    contractAmount: this.contractAmount,
    contractCurrency: this.contractCurrency,
    status: this.status,
    totalCheques: this.paymentSchedule.totalCheques,
    chequesPaid: this.totalChequesPaid,
    paymentPercentage: this.paymentCompletionPercentage.toFixed(2)
  };
};

PropertyTenancySchema.methods.markChequeAsPaid = async function (chequeNumber, paidDate = new Date()) {
  const cheque = this.paymentSchedule.cheques.find(c => c.chequeNumber === chequeNumber);
  if (!cheque) throw new Error(`Cheque ${chequeNumber} not found`);
  
  cheque.isPaid = true;
  cheque.paidDate = paidDate;
  
  return this.save();
};

PropertyTenancySchema.methods.markChequeAsUnpaid = async function (chequeNumber) {
  const cheque = this.paymentSchedule.cheques.find(c => c.chequeNumber === chequeNumber);
  if (!cheque) throw new Error(`Cheque ${chequeNumber} not found`);
  
  cheque.isPaid = false;
  cheque.paidDate = null;
  
  return this.save();
};

PropertyTenancySchema.methods.endTenancy = async function (endDate = new Date(), reason = null) {
  this.status = 'ended';
  this.terminationDate = endDate;
  if (reason) this.reasonForTermination = reason;
  
  return this.save();
};

PropertyTenancySchema.methods.terminateTenancy = async function (terminationDate = new Date(), reason = null) {
  this.status = 'terminated';
  this.terminationDate = terminationDate;
  if (reason) this.reasonForTermination = reason;
  
  return this.save();
};

PropertyTenancySchema.methods.getPaymentStatus = function () {
  return {
    totalAmount: this.contractAmount,
    paidAmount: this.totalPaidAmount,
    unpaidAmount: this.totalUnpaidAmount,
    totalCheques: this.paymentSchedule.totalCheques,
    paidCheques: this.totalChequesPaid,
    unpaidCheques: this.totalChequesUnpaid,
    completionPercentage: this.paymentCompletionPercentage
  };
};

PropertyTenancySchema.methods.getOverdueCheques = function () {
  const today = new Date();
  return this.paymentSchedule.cheques.filter(
    c => !c.isPaid && c.chequeDueDate < today
  );
};

/**
 * HOOKS
 */

// Validate total cheque amounts equal contract amount
PropertyTenancySchema.pre('save', function (next) {
  if (this.paymentSchedule && this.paymentSchedule.cheques) {
    const totalChequeAmount = this.paymentSchedule.cheques.reduce(
      (sum, cheque) => sum + cheque.chequeAmount,
      0
    );

    if (Math.abs(totalChequeAmount - this.contractAmount) > 0.01) {
      throw new Error(
        `Total cheque amount (${totalChequeAmount}) does not match contract amount (${this.contractAmount})`
      );
    }
  }
  next();
});

const PropertyTenancy = mongoose.model('PropertyTenancy', PropertyTenancySchema);

export default PropertyTenancy;
