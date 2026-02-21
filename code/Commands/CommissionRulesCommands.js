/**
 * ========================================================================
 * COMMISSION RULES COMMANDS HANDLER
 * Phase 5: Feature 2 - Commission Tracking System Enhancement
 * ========================================================================
 * 
 * WhatsApp bot commands for commission rules and calculation engine:
 * - Rule management (create, list, update)
 * - Smart commission calculation
 * - Approval workflow
 * - Calculation history
 * 
 * @module CommissionRulesCommands
 * @since Phase 5 - February 2026
 */

import CommissionCalculationEngine from '../Services/CommissionCalculationEngine.js';

class CommissionRulesCommands {

  /**
   * Get all available commission rules commands
   */
  static getCommands() {
    return {
      '!calc-commission': 'Calculate commission for a transaction',
      '!preview-commission': 'Preview commission (no save)',
      '!list-rules': 'List active commission rules',
      '!rule-info': 'Get details about a specific rule',
      '!create-rule': 'Create a new commission rule',
      '!pending-approvals': 'View pending commission approvals',
      '!approve-commission': 'Approve a pending calculation',
      '!reject-commission': 'Reject a pending calculation',
      '!calc-history': 'View your calculation history',
      '!seed-rules': 'Seed default commission rules'
    };
  }

  /**
   * Calculate commission for a transaction
   * !calc-commission value=2000000|type=sale|property=villa|project=DAMAC Hills 2
   */
  static async handleCalcCommission(args, context) {
    try {
      const params = CommissionRulesCommands.parseParams(args);

      if (!params.value) {
        return '❌ Usage: !calc-commission value=2000000|type=sale|property=villa\n\n' +
          'Parameters:\n• value (required) - Transaction value\n• type - sale, lease_signup, lease_renewal\n• property - villa, apartment, townhouse, etc.\n• project - Project name\n• rule - Specific rule ID to use';
      }

      const transaction = {
        transactionValue: parseFloat(params.value),
        transactionType: params.type || 'sale',
        propertyType: params.property || undefined,
        agentPhone: context.from,
        agentName: context.fromName || 'Agent',
        project: params.project || undefined
      };

      const options = {
        ruleId: params.rule || undefined,
        createRecord: true,
        calculatedBy: context.from
      };

      const result = await CommissionCalculationEngine.calculate(transaction, options);

      if (!result.success) {
        return `❌ Calculation failed: ${result.error}`;
      }

      let response = `✅ Commission Calculated!\n\n`;
      response += `📊 Transaction: AED ${parseFloat(params.value).toLocaleString()}\n`;
      response += `📋 Rule: ${result.ruleApplied.name}\n`;
      response += `📐 Type: ${result.ruleApplied.type}\n`;
      response += `💰 Commission: AED ${result.totalCommission.toLocaleString()}\n`;
      response += `📈 Effective Rate: ${result.effectiveRate}%\n\n`;

      if (result.breakdown && result.breakdown.length > 0) {
        response += `📝 Breakdown:\n`;
        for (const item of result.breakdown) {
          response += `  • ${item.label}\n`;
        }
      }

      if (result.requiresApproval) {
        response += `\n⏳ Status: Pending Approval`;
      }

      if (result.calculationId) {
        response += `\n🔗 Calc ID: ${result.calculationId}`;
      }

      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Preview commission without saving
   * !preview-commission value=1500000|type=sale|property=apartment
   */
  static async handlePreviewCommission(args, context) {
    try {
      const params = CommissionRulesCommands.parseParams(args);

      if (!params.value) {
        return '❌ Usage: !preview-commission value=1500000|type=sale|property=apartment';
      }

      const transaction = {
        transactionValue: parseFloat(params.value),
        transactionType: params.type || 'sale',
        propertyType: params.property || undefined,
        agentPhone: context.from,
        project: params.project || undefined
      };

      const result = await CommissionCalculationEngine.preview(transaction, params.rule);

      if (!result.success) {
        return `❌ Preview failed: ${result.error}`;
      }

      let response = `🔍 Commission Preview (not saved)\n\n`;
      response += `Transaction: AED ${parseFloat(params.value).toLocaleString()}\n`;
      response += `Rule: ${result.ruleApplied.name} (${result.ruleApplied.type})\n`;
      response += `Commission: AED ${result.totalCommission.toLocaleString()}\n`;
      response += `Effective Rate: ${result.effectiveRate}%\n`;

      if (result.breakdown && result.breakdown.length > 1) {
        response += `\nBreakdown:\n`;
        for (const item of result.breakdown) {
          response += `  • ${item.party}: AED ${item.amount.toLocaleString()}\n`;
        }
      }

      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * List active commission rules
   * !list-rules [type]
   */
  static async handleListRules(args, context) {
    try {
      const filters = { active: true };
      if (args?.trim()) {
        filters.type = args.trim();
      }

      const rules = await CommissionCalculationEngine.getRules(filters);

      if (rules.length === 0) {
        return '📋 No active commission rules found.\n\nUse !seed-rules to create default rules.';
      }

      let response = `📋 Active Commission Rules (${rules.length}):\n\n`;

      for (const rule of rules) {
        const p = rule.priority || 0;
        let rateInfo = '';

        switch (rule.type) {
          case 'percentage':
            rateInfo = `${rule.percentageConfig?.rate || 0}%`;
            break;
          case 'fixed':
            rateInfo = `AED ${(rule.fixedConfig?.amount || 0).toLocaleString()}`;
            break;
          case 'tiered':
            rateInfo = `${rule.tieredConfig?.tiers?.length || 0} tiers`;
            break;
          case 'revenue_share':
            rateInfo = `${rule.revenueShareConfig?.baseRate || 0}% split`;
            break;
        }

        response += `${p > 5 ? '⭐' : '📌'} ${rule.name}\n`;
        response += `   Type: ${rule.type} | Rate: ${rateInfo} | Priority: ${p}\n`;

        if (rule.appliesToPropertyTypes?.length) {
          response += `   Properties: ${rule.appliesToPropertyTypes.join(', ')}\n`;
        }
        if (rule.appliesToTransactionTypes?.length) {
          response += `   Transactions: ${rule.appliesToTransactionTypes.join(', ')}\n`;
        }

        response += `   ID: ${rule.ruleId}\n\n`;
      }

      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Get rule details
   * !rule-info rule-123456789
   */
  static async handleRuleInfo(args, context) {
    try {
      if (!args?.trim()) {
        return '❌ Usage: !rule-info <rule-id>';
      }

      const ruleId = args.trim().split(' ')[0];
      const rule = await CommissionCalculationEngine.getRuleById(ruleId);

      if (!rule) {
        return `❌ Rule "${ruleId}" not found.`;
      }

      let response = `📋 Rule Details\n\n`;
      response += `Name: ${rule.name}\n`;
      response += `ID: ${rule.ruleId}\n`;
      response += `Type: ${rule.type}\n`;
      response += `Active: ${rule.active ? '✅ Yes' : '❌ No'}\n`;
      response += `Priority: ${rule.priority}\n`;

      if (rule.description) {
        response += `Description: ${rule.description}\n`;
      }

      response += `\n📐 Configuration:\n`;

      switch (rule.type) {
        case 'percentage':
          response += `Rate: ${rule.percentageConfig?.rate}%\n`;
          break;
        case 'fixed':
          response += `Amount: ${rule.fixedConfig?.currency || 'AED'} ${rule.fixedConfig?.amount?.toLocaleString()}\n`;
          break;
        case 'tiered':
          response += `Method: ${rule.tieredConfig?.method || 'flat'}\n`;
          for (const tier of (rule.tieredConfig?.tiers || [])) {
            response += `  ${tier.label || 'Tier'}: ${tier.rate}% (AED ${tier.minValue?.toLocaleString()} - ${tier.maxValue ? tier.maxValue.toLocaleString() : '∞'})\n`;
          }
          break;
        case 'revenue_share':
          response += `Base Rate: ${rule.revenueShareConfig?.baseRate}%\n`;
          for (const split of (rule.revenueShareConfig?.splits || [])) {
            response += `  ${split.party}: ${split.percent}%\n`;
          }
          break;
      }

      if (rule.appliesToPropertyTypes?.length) {
        response += `\n🏠 Properties: ${rule.appliesToPropertyTypes.join(', ')}`;
      }
      if (rule.appliesToTransactionTypes?.length) {
        response += `\n💼 Transactions: ${rule.appliesToTransactionTypes.join(', ')}`;
      }
      if (rule.minTransactionValue) {
        response += `\n📊 Min Value: AED ${rule.minTransactionValue.toLocaleString()}`;
      }
      if (rule.maxTransactionValue) {
        response += `\n📊 Max Value: AED ${rule.maxTransactionValue.toLocaleString()}`;
      }

      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Create a quick rule
   * !create-rule name=Premium Sale|type=percentage|rate=3|transactions=sale|properties=villa
   */
  static async handleCreateRule(args, context) {
    try {
      const params = CommissionRulesCommands.parseParams(args);

      if (!params.name || !params.type) {
        return '❌ Usage: !create-rule name=Rule Name|type=percentage|rate=2.5|transactions=sale|properties=villa\n\n' +
          'Types: percentage, fixed, tiered, revenue_share\n' +
          'For percentage: rate=2.5\n' +
          'For fixed: amount=5000\n' +
          'Properties/transactions: comma-separated values';
      }

      const ruleData = {
        name: params.name,
        type: params.type,
        description: params.description || `Created via bot by ${context.from}`,
        active: true,
        createdBy: context.from
      };

      // Configure based on type
      switch (params.type) {
        case 'percentage':
          ruleData.percentageConfig = { rate: parseFloat(params.rate) || 2 };
          break;
        case 'fixed':
          ruleData.fixedConfig = {
            amount: parseFloat(params.amount) || 0,
            currency: params.currency || 'AED'
          };
          break;
        default:
          return `⚠️ For '${params.type}' type rules, please use the API or dashboard for full configuration.`;
      }

      // Scope
      if (params.properties) {
        ruleData.appliesToPropertyTypes = params.properties.split(',').map(s => s.trim());
      }
      if (params.transactions) {
        ruleData.appliesToTransactionTypes = params.transactions.split(',').map(s => s.trim());
      }
      if (params.priority) {
        ruleData.priority = parseInt(params.priority);
      }

      const result = await CommissionCalculationEngine.createRule(ruleData);

      if (!result.success) {
        return `❌ Failed: ${result.error}`;
      }

      return `✅ Rule Created!\n\n📋 ${result.rule.name}\nType: ${result.rule.type}\nID: ${result.rule.ruleId}\nActive: ✅`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * View pending approvals
   * !pending-approvals
   */
  static async handlePendingApprovals(args, context) {
    try {
      const pending = await CommissionCalculationEngine.getPendingApprovals({ limit: 10 });

      if (pending.length === 0) {
        return '✅ No pending commission approvals.';
      }

      let response = `⏳ Pending Approvals (${pending.length}):\n\n`;

      for (const calc of pending) {
        response += `🔸 ${calc.calculationId}\n`;
        response += `   Agent: ${calc.agentName || calc.agentPhone}\n`;
        response += `   Amount: AED ${calc.result?.totalCommission?.toLocaleString()}\n`;
        response += `   Rule: ${calc.ruleName}\n`;
        response += `   Date: ${calc.createdAt?.toLocaleDateString()}\n\n`;
      }

      response += `Use !approve-commission <id> or !reject-commission <id> to process.`;

      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Approve a pending calculation
   * !approve-commission calc-123456789
   */
  static async handleApproveCommission(args, context) {
    try {
      if (!args?.trim()) {
        return '❌ Usage: !approve-commission <calculation-id>';
      }

      const calculationId = args.trim().split(' ')[0];
      const result = await CommissionCalculationEngine.approveCalculation(
        calculationId,
        context.from,
        true
      );

      if (!result.success) {
        return `❌ ${result.error}`;
      }

      return `✅ Commission Approved!\n\nCalc ID: ${calculationId}\nCommission ID: ${result.commissionId}\nStatus: Approved ✅`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Reject a pending calculation
   * !reject-commission calc-123456789 reason text here
   */
  static async handleRejectCommission(args, context) {
    try {
      if (!args?.trim()) {
        return '❌ Usage: !reject-commission <calculation-id> [reason]';
      }

      const parts = args.trim().split(' ');
      const calculationId = parts[0];
      const reason = parts.slice(1).join(' ') || 'Rejected via bot';

      const result = await CommissionCalculationEngine.rejectCalculation(
        calculationId,
        context.from,
        reason
      );

      if (!result.success) {
        return `❌ ${result.error}`;
      }

      return `❌ Commission Rejected\n\nCalc ID: ${calculationId}\nReason: ${reason}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * View calculation history
   * !calc-history [count]
   */
  static async handleCalcHistory(args, context) {
    try {
      const limit = parseInt(args?.trim()) || 5;
      const records = await CommissionCalculationEngine.getCalculationHistory(
        context.from,
        { limit }
      );

      if (records.length === 0) {
        return '📋 No calculation history found.\n\nUse !calc-commission to calculate your first commission!';
      }

      let response = `📋 Calculation History (${records.length}):\n\n`;

      for (const record of records) {
        const statusIcon = {
          calculated: '🟢',
          pending_approval: '🟡',
          approved: '✅',
          rejected: '❌',
          paid: '💰',
          voided: '⚫'
        }[record.status] || '⚪';

        response += `${statusIcon} AED ${record.result?.totalCommission?.toLocaleString()}\n`;
        response += `   Rule: ${record.ruleName} (${record.ruleType})\n`;
        response += `   Transaction: AED ${record.transaction?.transactionValue?.toLocaleString()}\n`;
        response += `   Status: ${record.status}\n`;
        response += `   Date: ${record.createdAt?.toLocaleDateString()}\n`;
        response += `   ID: ${record.calculationId}\n\n`;
      }

      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Seed default rules
   * !seed-rules
   */
  static async handleSeedRules(args, context) {
    try {
      const result = await CommissionCalculationEngine.seedDefaultRules();

      if (!result.success) {
        return `❌ Failed to seed rules: ${result.error}`;
      }

      let response = `✅ Default Rules Seeded!\n\n`;
      response += `Created: ${result.rulesCreated}/${result.total}\n\n`;

      for (const r of result.results) {
        response += `${r.success ? '✅' : '❌'} ${r.name}\n`;
        if (r.ruleId) response += `   ID: ${r.ruleId}\n`;
      }

      response += `\nUse !list-rules to see all rules.`;

      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  /**
   * Parse command parameters (format: key=value|key=value)
   */
  static parseParams(str) {
    const params = {};
    if (!str) return params;

    str.split('|').forEach(pair => {
      const [key, ...valueParts] = pair.split('=');
      const value = valueParts.join('=');
      if (key?.trim() && value?.trim()) {
        params[key.trim().toLowerCase()] = value.trim();
      }
    });

    return params;
  }

  /**
   * Process commission rules command
   * @param {String} command - Command name
   * @param {String} args - Arguments
   * @param {Object} context - Message context
   * @returns {Promise<String>} Response text
   */
  static async processCommand(command, args, context) {
    const handlers = {
      '!calc-commission': CommissionRulesCommands.handleCalcCommission,
      '!preview-commission': CommissionRulesCommands.handlePreviewCommission,
      '!list-rules': CommissionRulesCommands.handleListRules,
      '!rule-info': CommissionRulesCommands.handleRuleInfo,
      '!create-rule': CommissionRulesCommands.handleCreateRule,
      '!pending-approvals': CommissionRulesCommands.handlePendingApprovals,
      '!approve-commission': CommissionRulesCommands.handleApproveCommission,
      '!reject-commission': CommissionRulesCommands.handleRejectCommission,
      '!calc-history': CommissionRulesCommands.handleCalcHistory,
      '!seed-rules': CommissionRulesCommands.handleSeedRules
    };

    const handler = handlers[command];

    if (!handler) {
      return `❌ Unknown command. Available commission rules commands:\n${Object.entries(handlers).map(([k, _]) => `  ${k}`).join('\n')}`;
    }

    return await handler.call(null, args, context);
  }
}

export default CommissionRulesCommands;
