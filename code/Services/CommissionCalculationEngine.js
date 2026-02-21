/**
 * ========================================================================
 * COMMISSION CALCULATION ENGINE
 * Phase 5: Feature 2 - Commission Tracking System Enhancement
 * ========================================================================
 * 
 * The brain of the commission system. This engine:
 * 1. Finds applicable rules for a transaction
 * 2. Calculates commissions based on rule type
 * 3. Handles tiered calculations (marginal & flat)
 * 4. Manages revenue share splits
 * 5. Supports batch calculations
 * 6. Manages approval workflows
 * 7. Generates detailed breakdowns
 * 
 * @module CommissionCalculationEngine
 * @since Phase 5 - February 2026
 */

import { CommissionRule, CalculationRecord } from '../Database/CommissionRuleSchema.js';
import { Commission } from '../Database/CommissionSchema.js';

class CommissionCalculationEngine {

  // ====================================================================
  // RULE MANAGEMENT
  // ====================================================================

  /**
   * Create a new commission rule
   * @param {Object} ruleData - Rule configuration
   * @returns {Promise<Object>} Created rule
   */
  async createRule(ruleData) {
    try {
      const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const rule = new CommissionRule({
        ruleId,
        ...ruleData
      });

      await rule.save();

      return {
        success: true,
        rule: rule.toObject(),
        message: `Commission rule "${ruleData.name}" created successfully`
      };
    } catch (error) {
      console.error('CalculationEngine: createRule error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all rules (with optional filters)
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} Rules list
   */
  async getRules(filters = {}) {
    try {
      const query = {};

      if (filters.active !== undefined) query.active = filters.active;
      if (filters.type) query.type = filters.type;
      if (filters.propertyType) query.appliesToPropertyTypes = filters.propertyType;
      if (filters.transactionType) query.appliesToTransactionTypes = filters.transactionType;

      return await CommissionRule.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(filters.limit || 100);
    } catch (error) {
      console.error('CalculationEngine: getRules error:', error.message);
      return [];
    }
  }

  /**
   * Get a single rule by ID
   * @param {String} ruleId - Rule ID
   * @returns {Promise<Object|null>} Rule
   */
  async getRuleById(ruleId) {
    try {
      return await CommissionRule.findOne({ ruleId });
    } catch (error) {
      console.error('CalculationEngine: getRuleById error:', error.message);
      return null;
    }
  }

  /**
   * Update a commission rule
   * @param {String} ruleId - Rule ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated rule
   */
  async updateRule(ruleId, updates) {
    try {
      const rule = await CommissionRule.findOneAndUpdate(
        { ruleId },
        { ...updates, updatedAt: new Date() },
        { returnDocument: 'after', runValidators: true }
      );

      return {
        success: !!rule,
        rule: rule?.toObject(),
        message: rule ? 'Rule updated successfully' : 'Rule not found'
      };
    } catch (error) {
      console.error('CalculationEngine: updateRule error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate a rule (soft delete)
   * @param {String} ruleId - Rule ID
   * @returns {Promise<Object>} Result
   */
  async deactivateRule(ruleId) {
    return this.updateRule(ruleId, { active: false });
  }

  /**
   * Delete a rule permanently
   * @param {String} ruleId - Rule ID
   * @returns {Promise<Object>} Result
   */
  async deleteRule(ruleId) {
    try {
      const result = await CommissionRule.findOneAndDelete({ ruleId });
      return {
        success: !!result,
        message: result ? 'Rule deleted' : 'Rule not found'
      };
    } catch (error) {
      console.error('CalculationEngine: deleteRule error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // RULE MATCHING
  // ====================================================================

  /**
   * Find all applicable rules for a transaction
   * Rules are filtered by: active status, date range, scope, and priority
   * 
   * @param {Object} transaction - Transaction details
   * @param {String} transaction.propertyType - Property type
   * @param {String} transaction.transactionType - Transaction type (sale, lease_signup, etc.)
   * @param {Number} transaction.transactionValue - Transaction value
   * @param {String} transaction.agentPhone - Agent phone
   * @param {String} transaction.project - Project name
   * @returns {Promise<Array>} Matching rules sorted by priority (highest first)
   */
  async findApplicableRules(transaction) {
    try {
      const now = new Date();

      // Get all active rules within date range
      const allRules = await CommissionRule.find({
        active: true,
        $or: [
          { startDate: { $lte: now }, endDate: { $gte: now } },
          { startDate: { $lte: now }, endDate: null },
          { startDate: { $lte: now }, endDate: { $exists: false } }
        ]
      }).sort({ priority: -1 });

      // Filter by scope using instance method
      const matchingRules = allRules.filter(rule => rule.appliesTo(transaction));

      return matchingRules;
    } catch (error) {
      console.error('CalculationEngine: findApplicableRules error:', error.message);
      return [];
    }
  }

  /**
   * Find the BEST matching rule (highest priority)
   * @param {Object} transaction - Transaction details
   * @returns {Promise<Object|null>} Best matching rule
   */
  async findBestRule(transaction) {
    const rules = await this.findApplicableRules(transaction);
    return rules.length > 0 ? rules[0] : null;
  }

  // ====================================================================
  // COMMISSION CALCULATION
  // ====================================================================

  /**
   * Calculate commission for a transaction using the best matching rule
   * 
   * @param {Object} transaction - Transaction details
   * @param {Number} transaction.transactionValue - Sale/lease value
   * @param {String} transaction.propertyType - Property type
   * @param {String} transaction.transactionType - sale, lease_signup, etc.
   * @param {String} transaction.agentPhone - Agent phone number
   * @param {String} [transaction.agentName] - Agent name
   * @param {String} [transaction.propertyId] - Property ID
   * @param {String} [transaction.propertyAddress] - Property address
   * @param {String} [transaction.project] - Project name
   * @param {Object} [options] - Calculation options
   * @param {String} [options.ruleId] - Force a specific rule
   * @param {Boolean} [options.createRecord] - Create CalculationRecord (default: true)
   * @param {String} [options.calculatedBy] - Who triggered the calculation
   * @returns {Promise<Object>} Calculation result with breakdown
   */
  async calculate(transaction, options = {}) {
    try {
      // Validate required fields
      if (!transaction.transactionValue || transaction.transactionValue <= 0) {
        return { success: false, error: 'Transaction value must be positive' };
      }
      if (!transaction.agentPhone) {
        return { success: false, error: 'Agent phone is required' };
      }

      // Find the rule to apply
      let rule;
      if (options.ruleId) {
        rule = await this.getRuleById(options.ruleId);
        if (!rule) {
          return { success: false, error: `Rule ${options.ruleId} not found` };
        }
      } else {
        rule = await this.findBestRule(transaction);
        if (!rule) {
          return { success: false, error: 'No matching commission rule found for this transaction' };
        }
      }

      // Calculate based on rule type
      let result;
      switch (rule.type) {
        case 'percentage':
          result = this._calculatePercentage(transaction.transactionValue, rule);
          break;
        case 'fixed':
          result = this._calculateFixed(rule);
          break;
        case 'tiered':
          result = this._calculateTiered(transaction.transactionValue, rule);
          break;
        case 'revenue_share':
          result = this._calculateRevenueShare(transaction.transactionValue, rule);
          break;
        default:
          return { success: false, error: `Unknown rule type: ${rule.type}` };
      }

      // Determine approval requirements
      const requiresApproval = rule.approvalRequired &&
        (!rule.approvalThreshold || result.totalCommission > rule.approvalThreshold);

      const status = requiresApproval ? 'pending_approval' : 'calculated';

      // Create calculation record
      let calculationRecord = null;
      if (options.createRecord !== false) {
        const calcId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        calculationRecord = new CalculationRecord({
          calculationId: calcId,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          ruleType: rule.type,
          transaction: {
            type: transaction.transactionType || 'other',
            transactionValue: transaction.transactionValue,
            propertyType: transaction.propertyType,
            propertyId: transaction.propertyId,
            propertyAddress: transaction.propertyAddress,
            project: transaction.project,
            date: transaction.date || new Date()
          },
          agentPhone: transaction.agentPhone,
          agentName: transaction.agentName,
          result: {
            totalCommission: result.totalCommission,
            breakdown: result.breakdown,
            effectiveRate: result.effectiveRate,
            currency: result.currency || 'AED'
          },
          status,
          approvalInfo: {
            requiredApproval: requiresApproval
          },
          calculatedBy: options.calculatedBy || 'system'
        });

        await calculationRecord.save();
      }

      return {
        success: true,
        ruleApplied: {
          ruleId: rule.ruleId,
          name: rule.name,
          type: rule.type
        },
        transactionValue: transaction.transactionValue,
        totalCommission: result.totalCommission,
        effectiveRate: result.effectiveRate,
        breakdown: result.breakdown,
        currency: result.currency || 'AED',
        requiresApproval,
        status,
        calculationId: calculationRecord?.calculationId || null,
        message: requiresApproval
          ? `Commission of AED ${result.totalCommission.toLocaleString()} requires approval`
          : `Commission of AED ${result.totalCommission.toLocaleString()} calculated successfully`
      };
    } catch (error) {
      console.error('CalculationEngine: calculate error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // CALCULATION METHODS (PRIVATE)
  // ====================================================================

  /**
   * Calculate commission using percentage rate
   */
  _calculatePercentage(transactionValue, rule) {
    const rate = rule.percentageConfig?.rate || 0;
    const totalCommission = (transactionValue * rate) / 100;

    return {
      totalCommission: Math.round(totalCommission * 100) / 100,
      effectiveRate: rate,
      breakdown: [{
        party: 'agent',
        amount: Math.round(totalCommission * 100) / 100,
        percent: rate,
        label: `${rate}% of AED ${transactionValue.toLocaleString()}`
      }],
      currency: 'AED'
    };
  }

  /**
   * Calculate commission using fixed amount
   */
  _calculateFixed(rule) {
    const amount = rule.fixedConfig?.amount || 0;
    const currency = rule.fixedConfig?.currency || 'AED';

    return {
      totalCommission: amount,
      effectiveRate: 0,
      breakdown: [{
        party: 'agent',
        amount,
        percent: 0,
        label: `Fixed amount: ${currency} ${amount.toLocaleString()}`
      }],
      currency
    };
  }

  /**
   * Calculate commission using tiered rates
   * Supports both 'flat' and 'marginal' methods
   */
  _calculateTiered(transactionValue, rule) {
    const tiers = rule.tieredConfig?.tiers || [];
    const method = rule.tieredConfig?.method || 'flat';

    if (tiers.length === 0) {
      return { totalCommission: 0, effectiveRate: 0, breakdown: [], currency: 'AED' };
    }

    let totalCommission = 0;
    const breakdown = [];

    if (method === 'flat') {
      // Flat: Find the tier that matches and apply that rate to the FULL amount
      let matchedTier = tiers[0]; // default to first tier
      for (const tier of tiers) {
        if (transactionValue >= tier.minValue) {
          if (!tier.maxValue || transactionValue <= tier.maxValue) {
            matchedTier = tier;
          }
        }
      }

      totalCommission = (transactionValue * matchedTier.rate) / 100;
      breakdown.push({
        party: 'agent',
        amount: Math.round(totalCommission * 100) / 100,
        percent: matchedTier.rate,
        label: matchedTier.label || `Flat ${matchedTier.rate}% (tier: AED ${matchedTier.minValue.toLocaleString()}${matchedTier.maxValue ? ' - ' + matchedTier.maxValue.toLocaleString() : '+'})`
      });
    } else {
      // Marginal: Apply each tier's rate only to the amount within that bracket
      let remaining = transactionValue;

      for (const tier of tiers) {
        if (remaining <= 0) break;

        const bracketMax = tier.maxValue ? (tier.maxValue - tier.minValue) : remaining;
        const amountInBracket = Math.min(remaining, bracketMax);
        const tierCommission = (amountInBracket * tier.rate) / 100;

        totalCommission += tierCommission;
        breakdown.push({
          party: 'agent',
          amount: Math.round(tierCommission * 100) / 100,
          percent: tier.rate,
          label: tier.label || `${tier.rate}% on AED ${amountInBracket.toLocaleString()} (bracket: ${tier.minValue.toLocaleString()}${tier.maxValue ? ' - ' + tier.maxValue.toLocaleString() : '+'})`
        });

        remaining -= amountInBracket;
      }
    }

    const effectiveRate = transactionValue > 0
      ? Math.round((totalCommission / transactionValue) * 10000) / 100
      : 0;

    return {
      totalCommission: Math.round(totalCommission * 100) / 100,
      effectiveRate,
      breakdown,
      currency: 'AED'
    };
  }

  /**
   * Calculate commission using revenue share split
   */
  _calculateRevenueShare(transactionValue, rule) {
    const baseRate = rule.revenueShareConfig?.baseRate || 0;
    const splits = rule.revenueShareConfig?.splits || [];
    const totalCommission = (transactionValue * baseRate) / 100;

    const breakdown = splits.map(split => ({
      party: split.party,
      amount: Math.round((totalCommission * split.percent) / 100 * 100) / 100,
      percent: Math.round((baseRate * split.percent) / 100 * 100) / 100,
      label: `${split.party}: ${split.percent}% of commission (AED ${Math.round((totalCommission * split.percent) / 100).toLocaleString()})`
    }));

    return {
      totalCommission: Math.round(totalCommission * 100) / 100,
      effectiveRate: baseRate,
      breakdown,
      currency: 'AED'
    };
  }

  // ====================================================================
  // BATCH CALCULATION
  // ====================================================================

  /**
   * Calculate commissions for multiple transactions at once
   * @param {Array<Object>} transactions - Array of transaction objects
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Batch result with summary
   */
  async batchCalculate(transactions, options = {}) {
    try {
      const results = [];
      let totalCommission = 0;
      let successCount = 0;
      let failCount = 0;

      for (const transaction of transactions) {
        const result = await this.calculate(transaction, options);
        results.push({
          transaction,
          result
        });

        if (result.success) {
          totalCommission += result.totalCommission;
          successCount++;
        } else {
          failCount++;
        }
      }

      return {
        success: true,
        summary: {
          totalTransactions: transactions.length,
          successful: successCount,
          failed: failCount,
          totalCommission: Math.round(totalCommission * 100) / 100,
          currency: 'AED'
        },
        results
      };
    } catch (error) {
      console.error('CalculationEngine: batchCalculate error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // APPROVAL WORKFLOW
  // ====================================================================

  /**
   * Approve a pending calculation
   * @param {String} calculationId - Calculation record ID
   * @param {String} approvedBy - Who approved
   * @param {Boolean} createCommission - Whether to create commission record
   * @returns {Promise<Object>} Result
   */
  async approveCalculation(calculationId, approvedBy, createCommission = true) {
    try {
      const record = await CalculationRecord.findOne({ calculationId });
      if (!record) {
        return { success: false, error: 'Calculation record not found' };
      }

      if (record.status !== 'pending_approval') {
        return { success: false, error: `Cannot approve: status is "${record.status}"` };
      }

      record.status = 'approved';
      record.approvalInfo.approvedBy = approvedBy;
      record.approvalInfo.approvedAt = new Date();
      record.updatedAt = new Date();

      // Optionally create commission record from approved calculation
      if (createCommission) {
        const commissionId = `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const commission = new Commission({
          commissionId,
          agentPhone: record.agentPhone,
          agentName: record.agentName,
          dealId: record.transaction?.propertyId,
          propertyAddress: record.transaction?.propertyAddress,
          propertyType: record.transaction?.propertyType,
          salePrice: record.transaction?.transactionValue,
          commissionPercent: record.result?.effectiveRate || 0,
          commissionAmount: record.result?.totalCommission,
          status: 'earned',
          earnedDate: new Date(),
          notes: `Auto-generated from calculation ${calculationId}, rule: ${record.ruleName}`
        });

        await commission.save();
        record.commissionId = commissionId;
      }

      await record.save();

      return {
        success: true,
        calculationId,
        status: 'approved',
        commissionId: record.commissionId,
        message: `Calculation approved${createCommission ? ' and commission record created' : ''}`
      };
    } catch (error) {
      console.error('CalculationEngine: approveCalculation error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a pending calculation
   * @param {String} calculationId - Calculation record ID
   * @param {String} rejectedBy - Who rejected
   * @param {String} reason - Rejection reason
   * @returns {Promise<Object>} Result
   */
  async rejectCalculation(calculationId, rejectedBy, reason = '') {
    try {
      const record = await CalculationRecord.findOneAndUpdate(
        { calculationId, status: 'pending_approval' },
        {
          status: 'rejected',
          'approvalInfo.rejectedBy': rejectedBy,
          'approvalInfo.rejectedAt': new Date(),
          'approvalInfo.rejectionReason': reason,
          updatedAt: new Date()
        },
        { returnDocument: 'after' }
      );

      if (!record) {
        return { success: false, error: 'Calculation not found or not pending approval' };
      }

      return {
        success: true,
        calculationId,
        status: 'rejected',
        reason,
        message: 'Calculation rejected'
      };
    } catch (error) {
      console.error('CalculationEngine: rejectCalculation error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all pending approvals
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Pending calculations
   */
  async getPendingApprovals(options = {}) {
    try {
      return await CalculationRecord.find({ status: 'pending_approval' })
        .sort({ createdAt: -1 })
        .limit(options.limit || 50);
    } catch (error) {
      console.error('CalculationEngine: getPendingApprovals error:', error.message);
      return [];
    }
  }

  // ====================================================================
  // CALCULATION HISTORY & REPORTS
  // ====================================================================

  /**
   * Get calculation history for an agent
   * @param {String} agentPhone - Agent phone
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Calculation records
   */
  async getCalculationHistory(agentPhone, options = {}) {
    try {
      const query = { agentPhone };

      if (options.status) query.status = options.status;
      if (options.ruleId) query.ruleId = options.ruleId;

      if (options.dateRange) {
        query.createdAt = {
          $gte: new Date(options.dateRange.start),
          $lte: new Date(options.dateRange.end)
        };
      }

      return await CalculationRecord.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100);
    } catch (error) {
      console.error('CalculationEngine: getCalculationHistory error:', error.message);
      return [];
    }
  }

  /**
   * Get calculation record by ID
   * @param {String} calculationId - Calculation ID
   * @returns {Promise<Object|null>}
   */
  async getCalculationById(calculationId) {
    try {
      return await CalculationRecord.findOne({ calculationId });
    } catch (error) {
      console.error('CalculationEngine: getCalculationById error:', error.message);
      return null;
    }
  }

  /**
   * Generate earnings report for an agent using calculation records
   * @param {String} agentPhone - Agent phone
   * @param {Object} dateRange - Date range
   * @returns {Promise<Object>} Earnings report
   */
  async generateEarningsReport(agentPhone, dateRange = {}) {
    try {
      const startDate = new Date(dateRange.start || '2026-01-01');
      const endDate = new Date(dateRange.end || new Date());

      const records = await CalculationRecord.find({
        agentPhone,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['calculated', 'approved', 'paid'] }
      }).sort({ createdAt: -1 });

      const summary = {
        totalCalculations: records.length,
        totalCommission: 0,
        approvedAmount: 0,
        pendingApprovalAmount: 0,
        paidAmount: 0,
        byRuleType: {},
        byTransactionType: {},
        byPropertyType: {}
      };

      for (const record of records) {
        const amount = record.result?.totalCommission || 0;
        summary.totalCommission += amount;

        if (record.status === 'approved') summary.approvedAmount += amount;
        if (record.status === 'paid') summary.paidAmount += amount;

        // By rule type
        const ruleType = record.ruleType || 'unknown';
        summary.byRuleType[ruleType] = (summary.byRuleType[ruleType] || 0) + amount;

        // By transaction type
        const txType = record.transaction?.type || 'unknown';
        summary.byTransactionType[txType] = (summary.byTransactionType[txType] || 0) + amount;

        // By property type
        const propType = record.transaction?.propertyType || 'unknown';
        summary.byPropertyType[propType] = (summary.byPropertyType[propType] || 0) + amount;
      }

      // Round all amounts
      summary.totalCommission = Math.round(summary.totalCommission * 100) / 100;
      summary.approvedAmount = Math.round(summary.approvedAmount * 100) / 100;
      summary.paidAmount = Math.round(summary.paidAmount * 100) / 100;

      // Get pending approvals count
      const pendingCount = await CalculationRecord.countDocuments({
        agentPhone,
        status: 'pending_approval'
      });

      return {
        success: true,
        agentPhone,
        period: { startDate, endDate },
        summary: {
          ...summary,
          pendingApprovalCount: pendingCount
        },
        records,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('CalculationEngine: generateEarningsReport error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get rule performance statistics
   * @param {String} ruleId - Rule ID
   * @returns {Promise<Object>} Rule stats
   */
  async getRuleStats(ruleId) {
    try {
      const stats = await CalculationRecord.aggregate([
        { $match: { ruleId } },
        {
          $group: {
            _id: null,
            totalCalculations: { $sum: 1 },
            totalCommission: { $sum: '$result.totalCommission' },
            avgCommission: { $avg: '$result.totalCommission' },
            maxCommission: { $max: '$result.totalCommission' },
            minCommission: { $min: '$result.totalCommission' },
            avgTransactionValue: { $avg: '$transaction.transactionValue' }
          }
        }
      ]);

      const statusCounts = await CalculationRecord.aggregate([
        { $match: { ruleId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      return {
        success: true,
        ruleId,
        stats: stats[0] || {},
        statusBreakdown: statusCounts.reduce((acc, s) => {
          acc[s._id] = s.count;
          return acc;
        }, {}),
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('CalculationEngine: getRuleStats error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // QUICK CALCULATE (PREVIEW WITHOUT SAVING)
  // ====================================================================

  /**
   * Preview commission calculation without saving to database
   * Useful for "what-if" scenarios and estimates
   * 
   * @param {Object} transaction - Transaction details
   * @param {String} [ruleId] - Specific rule to use
   * @returns {Promise<Object>} Preview result
   */
  async preview(transaction, ruleId = null) {
    return this.calculate(transaction, {
      ruleId,
      createRecord: false,
      calculatedBy: 'preview'
    });
  }

  // ====================================================================
  // SEED DEFAULT RULES
  // ====================================================================

  /**
   * Create default commission rules for common scenarios
   * Used for initial setup
   * @returns {Promise<Object>} Seed results
   */
  async seedDefaultRules() {
    const defaultRules = [
      {
        name: 'Standard Sale Commission',
        description: 'Default 2% commission on property sales',
        type: 'percentage',
        percentageConfig: { rate: 2 },
        appliesToTransactionTypes: ['sale'],
        priority: 1,
        active: true
      },
      {
        name: 'Premium Villa Commission',
        description: '2.5% commission on villa sales above AED 5M',
        type: 'percentage',
        percentageConfig: { rate: 2.5 },
        appliesToPropertyTypes: ['villa'],
        appliesToTransactionTypes: ['sale'],
        minTransactionValue: 5000000,
        priority: 10,
        active: true
      },
      {
        name: 'Lease Commission (Fixed)',
        description: 'Fixed AED 5,000 per lease signup',
        type: 'fixed',
        fixedConfig: { amount: 5000, currency: 'AED' },
        appliesToTransactionTypes: ['lease_signup'],
        priority: 1,
        active: true
      },
      {
        name: 'Tiered Sale Commission',
        description: 'Tiered rates: 1.5% up to 2M, 2% up to 5M, 2.5% above 5M',
        type: 'tiered',
        tieredConfig: {
          tiers: [
            { minValue: 0, maxValue: 2000000, rate: 1.5, label: 'Standard tier' },
            { minValue: 2000001, maxValue: 5000000, rate: 2, label: 'Mid tier' },
            { minValue: 5000001, maxValue: null, rate: 2.5, label: 'Premium tier' }
          ],
          method: 'flat'
        },
        appliesToTransactionTypes: ['sale'],
        priority: 5,
        active: false  // inactive by default - enable to use instead of Standard
      },
      {
        name: 'Team Revenue Share',
        description: '3% total commission split: 60% agent, 25% broker, 15% company',
        type: 'revenue_share',
        revenueShareConfig: {
          baseRate: 3,
          splits: [
            { party: 'agent', percent: 60 },
            { party: 'broker', percent: 25 },
            { party: 'company', percent: 15 }
          ]
        },
        appliesToTransactionTypes: ['sale'],
        priority: 3,
        active: false  // activate to use team-based commission
      }
    ];

    const results = [];
    for (const ruleData of defaultRules) {
      const result = await this.createRule(ruleData);
      results.push({
        name: ruleData.name,
        success: result.success,
        ruleId: result.rule?.ruleId
      });
    }

    return {
      success: true,
      rulesCreated: results.filter(r => r.success).length,
      total: defaultRules.length,
      results
    };
  }
}

export default new CommissionCalculationEngine();
