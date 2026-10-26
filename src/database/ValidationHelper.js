/**
 * ValidationHelper.js
 * PURPOSE: Validate data integrity and business rules before saving to database
 * USAGE: Import and use static methods to validate operations
 */

class ValidationHelper {
  /**
   * Validate composite key uniqueness before insert/update
   */
  static async validateCompositeKey(Property, clusterId, unitNumber, excludeId = null) {
    const query = { clusterId, unitNumber };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await Property.findOne(query);
    if (existing) {
      return {
        valid: false,
        error: `Property with cluster ${clusterId} and unit ${unitNumber} already exists`
      };
    }

    return { valid: true };
  }

  /**
   * Validate PropertyTenancy data before save
   * - Cheques sum must equal contract amount
   * - Start date must be before expiry date
   * - All tenant and landlord personIds must exist
   * - Property must exist
   */
  static async validatePropertyTenancy(PropertyTenancy, tenancyData, Person, Property) {
    const errors = [];

    // Validate tenant
    if (tenancyData.tenantPersonId) {
      const tenant = await Person.findOne({ _id: tenancyData.tenantPersonId });
      if (!tenant) {
        errors.push('Tenant person does not exist');
      }
    }

    // Validate landlords
    if (Array.isArray(tenancyData.landlordPersonIds) && tenancyData.landlordPersonIds.length > 0) {
      for (const landlordId of tenancyData.landlordPersonIds) {
        const landlord = await Person.findOne({ _id: landlordId });
        if (!landlord) {
          errors.push(`Landlord person ${landlordId} does not exist`);
        }
      }
    } else {
      errors.push('At least one landlord must be specified');
    }

    // Validate property exists
    if (tenancyData.propertyId) {
      const property = await Property.findOne({ _id: tenancyData.propertyId });
      if (!property) {
        errors.push('Property does not exist');
      }
    }

    // Validate dates
    if (tenancyData.contractStartDate && tenancyData.contractExpiryDate) {
      if (new Date(tenancyData.contractStartDate) >= new Date(tenancyData.contractExpiryDate)) {
        errors.push('Contract start date must be before expiry date');
      }
    }

    // Validate cheques sum equals contract amount
    if (tenancyData.paymentSchedule && tenancyData.paymentSchedule.cheques) {
      const totalChequeAmount = tenancyData.paymentSchedule.cheques.reduce(
        (sum, cheque) => sum + cheque.chequeAmount,
        0
      );

      if (Math.abs(totalChequeAmount - tenancyData.contractAmount) > 0.01) {
        errors.push(
          `Total cheque amount (${totalChequeAmount}) does not match contract amount (${tenancyData.contractAmount})`
        );
      }
    }

    // Validate contract amount is positive
    if (tenancyData.contractAmount <= 0) {
      errors.push('Contract amount must be greater than 0');
    }

    // Validate cheques
    if (tenancyData.paymentSchedule && tenancyData.paymentSchedule.cheques) {
      if (tenancyData.paymentSchedule.cheques.length !== tenancyData.paymentSchedule.totalCheques) {
        errors.push(
          `Number of cheques (${tenancyData.paymentSchedule.cheques.length}) does not match totalCheques (${tenancyData.paymentSchedule.totalCheques})`
        );
      }

      for (let i = 0; i < tenancyData.paymentSchedule.cheques.length; i++) {
        const cheque = tenancyData.paymentSchedule.cheques[i];
        if (cheque.chequeAmount <= 0) {
          errors.push(`Cheque ${i + 1} amount must be greater than 0`);
        }
        if (!cheque.chequeDueDate) {
          errors.push(`Cheque ${i + 1} must have a due date`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate PropertyOwnership before save
   * - Person must exist
   * - Property must exist
   * - Check no duplicate ownership link
   * - Ownership percentage valid (0-100)
   */
  static async validatePropertyOwnership(PropertyOwnership, ownershipData, Person, Property) {
    const errors = [];

    // Validate person
    if (ownershipData.personId) {
      const person = await Person.findOne({ _id: ownershipData.personId });
      if (!person) {
        errors.push('Person does not exist');
      }
    }

    // Validate property
    if (ownershipData.propertyId) {
      const property = await Property.findOne({ _id: ownershipData.propertyId });
      if (!property) {
        errors.push('Property does not exist');
      }
    }

    // Check for duplicate ownership link
    if (ownershipData.personId && ownershipData.propertyId) {
      const existing = await PropertyOwnership.findOne({
        personId: ownershipData.personId,
        propertyId: ownershipData.propertyId
      });

      if (existing) {
        errors.push('This person already owns this property');
      }
    }

    // Validate acquisition date is provided
    if (!ownershipData.acquisitionDate) {
      errors.push('Acquisition date is required');
    }

    // Validate dates if disposal is being set
    if (ownershipData.disposalDate && ownershipData.acquisitionDate) {
      if (new Date(ownershipData.disposalDate) < new Date(ownershipData.acquisitionDate)) {
        errors.push('Disposal date cannot be before acquisition date');
      }
    }

    // Validate ownership percentage (if provided)
    if (ownershipData.ownershipPercentage !== undefined) {
      if (ownershipData.ownershipPercentage < 0 || ownershipData.ownershipPercentage > 100) {
        errors.push('Ownership percentage must be between 0 and 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate all landlords own the property
   */
  static async validateLandlordsOwnProperty(landlordIds, propertyId, PropertyOwnership) {
    const errors = [];

    for (const landlordId of landlordIds) {
      const ownership = await PropertyOwnership.findOne({
        personId: landlordId,
        propertyId: propertyId,
        status: 'active'
      });

      if (!ownership) {
        errors.push(`Landlord with ID ${landlordId} does not own this property`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate availability status combinations
   * - Sold cannot be combined with active statuses
   * - Rent + Sale + Both should not all coexist
   */
  static async validateAvailabilityStatuses(statusIds, AvailabilityStatus) {
    const errors = [];
    const statuses = [];

    // Fetch status details
    for (const statusId of statusIds) {
      const status = await AvailabilityStatus.findOne({ _id: statusId });
      if (status) {
        statuses.push(status.status);
      }
    }

    // Check for conflicting statuses
    const hasAvailable = statuses.some(s => s === 'available_for_rent' || s === 'available_for_sale' || s === 'available_for_both');
    const hasNotAvailable = statuses.includes('not_available');
    const hasSold = statuses.includes('sold');

    if (hasAvailable && hasNotAvailable) {
      errors.push('Cannot combine available and not_available statuses');
    }

    if ((hasAvailable || hasNotAvailable) && hasSold) {
      errors.push('Cannot combine sold status with any other status');
    }

    if (statuses.includes('available_for_both') && 
        (statuses.includes('available_for_rent') || statuses.includes('available_for_sale'))) {
      errors.push('available_for_both already includes rent and sale, do not combine with individual statuses');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Check for overlapping tenancies
   * - Prevent a property from having two active tenancies at same time
   */
  static async checkTenancyConflict(PropertyTenancy, propertyId, newTenancy) {
    // Check for overlapping active tenancies
    const overlapping = await PropertyTenancy.findOne({
      propertyId,
      status: 'active',
      $expr: {
        $and: [
          { $lte: ['$contractStartDate', newTenancy.contractExpiryDate] },
          { $gte: ['$contractExpiryDate', newTenancy.contractStartDate] }
        ]
      },
      _id: { $ne: newTenancy._id } // Exclude self if updating
    });

    if (overlapping) {
      return {
        valid: false,
        error: `Property already has an active tenancy from ${overlapping.contractStartDate.toDateString()} to ${overlapping.contractExpiryDate.toDateString()}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate person can have multiple roles
   * (A person cannot be both owner and tenant of SAME property, but can have different roles in different properties)
   */
  static async validatePersonRoles(personId, propertyId, PropertyOwnership, PropertyTenancy) {
    const isOwner = await PropertyOwnership.findOne({
      personId,
      propertyId,
      status: 'active'
    });

    const isTenant = await PropertyTenancy.findOne({
      tenantPersonId: personId,
      propertyId,
      status: 'active'
    });

    if (isOwner && isTenant) {
      return {
        valid: false,
        error: 'Person cannot be both owner and tenant of the same property'
      };
    }

    return { valid: true };
  }

  /**
   * Validate duplicate person detection
   * Check if person with same firstName + lastName + mobile exists
   */
  static async checkPersonDuplicates(Person, firstName, lastName, mobile, excludeId = null) {
    const query = {
      firstName: new RegExp(`^${firstName}$`, 'i'),
      lastName: new RegExp(`^${lastName}$`, 'i'),
      mobile
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const duplicates = await Person.find(query);

    return {
      hasDuplicates: duplicates.length > 0,
      duplicateCount: duplicates.length,
      duplicates: duplicates
    };
  }

  /**
   * Validate property composite key
   */
  static async validatePropertyCompositeKey(clusterId, unitNumber) {
    if (!clusterId || !unitNumber) {
      return {
        valid: false,
        error: 'Both clusterId and unitNumber are required for composite key'
      };
    }

    return { valid: true };
  }
}

export default ValidationHelper;
