/**
 * QueryHelper.js
 * PURPOSE: Pre-built queries and helper methods for common database operations
 * USAGE: Import and use static methods for complex multi-collection queries
 */

class QueryHelper {
  /**
   * Find a person with all their roles across properties
   * Returns: person + all properties they own, rent, buy, or sell
   */
  static async findPersonWithAllRoles(Person, personId) {
    const PropertyOwnership = require('./PropertyOwnershipSchema.js').default;
    const PropertyTenancy = require('./PropertyTenancySchema.js').default;
    const PropertyBuying = require('./PropertyBuyingSchema.js').default;
    const PropertyAgent = require('./PropertyAgentSchema.js').default;

    const person = await Person.findOne({ _id: personId });
    if (!person) return null;

    const [ownedProperties, tenancies, buying, agencies] = await Promise.all([
      PropertyOwnership.find({ personId })
        .populate('propertyId'),
      PropertyTenancy.find({ tenantPersonId: personId })
        .populate('propertyId'),
      PropertyBuying.find({ personId }),
      PropertyAgent.find({ personId })
        .populate('propertyId')
    ]);

    return {
      person,
      roles: {
        owner: ownedProperties.map(p => ({ property: p.propertyId, percentage: p.ownershipPercentage })),
        tenant: tenancies.map(t => ({ property: t.propertyId, startDate: t.contractStartDate, endDate: t.contractExpiryDate })),
        buying: buying,
        agent: agencies
      }
    };
  }

  /**
   * Find a property with all connected people
   * Returns: property + all owners, current tenant, agents, buyers, sellers
   */
  static async findPropertyWithAllPeople(Property, propertyId) {
    const PropertyOwnership = require('./PropertyOwnershipSchema.js').default;
    const PropertyTenancy = require('./PropertyTenancySchema.js').default;
    const PropertyBuying = require('./PropertyBuyingSchema.js').default;
    const PropertyAgent = require('./PropertyAgentSchema.js').default;

    const property = await Property.findOne({ _id: propertyId })
      .populate('furnishingStatusId')
      .populate('occupancyStatusId')
      .populate('availabilityStatusIds');

    if (!property) return null;

    const [owners, currentTenancy, buying, agents] = await Promise.all([
      PropertyOwnership.find({ propertyId })
        .populate('personId'),
      PropertyTenancy.findOne({ propertyId, status: 'active' })
        .populate('tenantPersonId')
        .populate('landlordPersonIds'),
      PropertyBuying.find({ propertyId }),
      PropertyAgent.find({ propertyId })
        .populate('personId')
    ]);

    return {
      property,
      people: {
        owners: owners.map(o => ({ person: o.personId, percentage: o.ownershipPercentage, acquisitionDate: o.acquisitionDate })),
        currentTenant: currentTenancy ? { person: currentTenancy.tenantPersonId, startDate: currentTenancy.contractStartDate, endDate: currentTenancy.contractExpiryDate } : null,
        landlords: currentTenancy ? currentTenancy.landlordPersonIds : [],
        buying: buying,
        agents: agents
      }
    };
  }

  /**
   * Find all properties in a cluster
   */
  static async findPropertiesByCluster(Property, clusterId) {
    return Property.find({ clusterId })
      .populate('furnishingStatusId')
      .populate('occupancyStatusId')
      .populate('availabilityStatusIds')
      .sort({ unitNumber: 1 });
  }

  /**
   * Find properties available for rent
   */
  static async findPropertiesAvailableForRent(Property, AvailabilityStatus) {
    const rentStatus = await AvailabilityStatus.findOne({ status: 'available_for_rent' });
    if (!rentStatus) return [];

    return Property.find({ availabilityStatusIds: rentStatus._id })
      .populate('furnishingStatusId')
      .populate('occupancyStatusId');
  }

  /**
   * Find properties available for sale
   */
  static async findPropertiesAvailableForSale(Property, AvailabilityStatus) {
    const saleStatus = await AvailabilityStatus.findOne({ status: 'available_for_sale' });
    if (!saleStatus) return [];

    return Property.find({ availabilityStatusIds: saleStatus._id })
      .populate('furnishingStatusId')
      .populate('occupancyStatusId');
  }

  /**
   * Find properties available for both rent and sale
   */
  static async findPropertiesAvailableForBoth(Property, AvailabilityStatus) {
    const bothStatus = await AvailabilityStatus.findOne({ status: 'available_for_both' });
    if (!bothStatus) return [];

    return Property.find({ availabilityStatusIds: bothStatus._id })
      .populate('furnishingStatusId')
      .populate('occupancyStatusId');
  }

  /**
   * Find current/active tenancy for a property
   */
  static async findActiveTenancy(PropertyTenancy, propertyId) {
    return PropertyTenancy.findOne({ propertyId, status: 'active' })
      .populate('tenantPersonId')
      .populate('landlordPersonIds');
  }

  /**
   * Find all owners of a property
   */
  static async findAllOwners(PropertyOwnership, propertyId) {
    return PropertyOwnership.find({ propertyId, status: 'active' })
      .populate('personId')
      .sort({ ownershipPercentage: -1 });
  }

  /**
   * Find overdue cheques across all active tenancies
   */
  static async findOverdueCheques(PropertyTenancy) {
    return PropertyTenancy.find({
      'paymentSchedule.cheques': {
        $elemMatch: { isPaid: false, chequeDueDate: { $lt: new Date() } }
      },
      status: 'active'
    }).populate('propertyId').populate('tenantPersonId');
  }

  /**
   * Find upcoming cheques due within N days
   */
  static async findUpcomingCheques(PropertyTenancy, daysAhead = 7) {
    const today = new Date();
    const future = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return PropertyTenancy.find({
      'paymentSchedule.cheques': {
        $elemMatch: { isPaid: false, chequeDueDate: { $gte: today, $lte: future } }
      },
      status: 'active'
    }).populate('propertyId').populate('tenantPersonId');
  }

  /**
   * Get portfolio statistics for an owner
   */
  static async getOwnerPortfolioStats(PropertyOwnership, personId) {
    const properties = await PropertyOwnership.find({ personId, status: 'active' });
    
    return {
      totalProperties: properties.length,
      totalOwnershipPercentage: properties.reduce((sum, p) => sum + p.ownershipPercentage, 0),
      totalAcquisitionValue: properties.reduce((sum, p) => sum + (p.acquisitionPrice || 0), 0),
      totalCurrentValue: properties.reduce((sum, p) => sum + (p.currentEstimatedValue || 0), 0),
      properties: properties
    };
  }

  /**
   * Get all tenancies for a property (past + current)
   */
  static async getPropertyTenancyHistory(PropertyTenancy, propertyId) {
    return PropertyTenancy.find({ propertyId })
      .populate('tenantPersonId')
      .populate('landlordPersonIds')
      .sort({ contractStartDate: -1 });
  }

  /**
   * Get all co-owners of a property
   */
  static async getPropertyCoOwners(PropertyOwnership, propertyId) {
    return PropertyOwnership.find({ propertyId, status: 'active' })
      .populate('personId')
      .select('personId ownershipPercentage ownershipType');
  }

  /**
   * Get all agents working on a property
   */
  static async getPropertyAgents(PropertyAgent, propertyId) {
    return PropertyAgent.find({ propertyId, status: 'active' })
      .populate('personId')
      .sort({ agentRole: 1 });
  }

  /**
   * Get all transactions (buying/selling) for a property
   */
  static async getPropertyTransactions(PropertyBuying, propertyId) {
    return PropertyBuying.find({ propertyId })
      .populate('personId')
      .sort({ offerDate: -1 });
  }

  /**
   * Get payment summary for a tenancy
   */
  static async getTenancyPaymentSummary(PropertyTenancy, tenancyId) {
    const tenancy = await PropertyTenancy.findOne({ tenancyId });
    if (!tenancy) return null;

    return tenancy.getPaymentStatus();
  }

  /**
   * Get upcoming contract expirations (N days)
   */
  static async getUpcomingExpirations(PropertyTenancy, daysAhead = 30) {
    const today = new Date();
    const future = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return PropertyTenancy.find({
      contractExpiryDate: { $gte: today, $lte: future },
      status: 'active'
    }).populate('propertyId').populate('tenantPersonId');
  }

  /**
   * Get all expired contracts still marked active
   */
  static async getExpiredContracts(PropertyTenancy) {
    const today = new Date();
    return PropertyTenancy.find({
      contractExpiryDate: { $lt: today },
      status: 'active'
    }).populate('propertyId').populate('tenantPersonId');
  }
}

export default QueryHelper;
