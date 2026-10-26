/**
 * Agent Dashboard
 * CLI display for agent performance metrics and commission tracking
 */

import { logger } from '../Integration/Google/utils/logger.js';
import chalk from 'chalk';

class AgentDashboard {
  constructor(config = {}) {
    this.agentDealManager = config.agentDealManager;
    this.dealLifecycleManager = config.dealLifecycleManager;
    this.propertyEngine = config.propertyEngine;
    this.clientEngine = config.clientEngine;
  }

  /**
   * Display agent dashboard
   */
  displayAgentDashboard(agentId) {
    try {
      const agent = this.agentDealManager.getAgent(agentId);
      if (!agent) {
        console.log(chalk.red(`❌ Agent not found: ${agentId}`));
        return;
      }

      const report = this.agentDealManager.generateAgentReport(agentId);

      console.log('\n');
      console.log(chalk.cyan('═'.repeat(70)));
      console.log(chalk.cyan('                      AGENT PERFORMANCE DASHBOARD'));
      console.log(chalk.cyan('═'.repeat(70)));
      
      // Agent info
      console.log(chalk.bold(`\n👤 Agent: ${agent.agentName}`));
      console.log(chalk.gray(`   Agency: ${agent.agency}`));
      console.log(chalk.gray(`   Commission Rate: ${agent.commissionRate}%`));
      console.log(chalk.gray(`   Registered: ${new Date(agent.registeredAt).toLocaleDateString()}`));

      // Performance metrics
      console.log(chalk.bold(`\n📊 PERFORMANCE METRICS:`));
      console.log(`   Active Deals: ${chalk.yellow(report.performanceMetrics.activeDeals)}`);
      console.log(`   Closed Deals: ${chalk.green(report.performanceMetrics.closedDeals)}`);
      console.log(`   Total Deals: ${report.performanceMetrics.totalDeals}`);
      console.log(`   Success Rate: ${chalk.green(report.performanceMetrics.successRate)}`);
      console.log(`   Properties Listed: ${report.performanceMetrics.propertiesListed}`);

      // Commission tracking
      console.log(chalk.bold(`\n💰 COMMISSION TRACKING:`));
      console.log(`   Total Earned (This Year): ${chalk.green(`${report.commissionMetrics.totalEarned} AED`)}`);
      console.log(`   Pending Commission: ${chalk.yellow(`${report.commissionMetrics.pendingCommission} AED`)}`);
      console.log(`   Paid Commission: ${chalk.green(`${report.commissionMetrics.paidCommission} AED`)}`);
      console.log(`   Avg Commission Rate: ${report.commissionMetrics.averageCommissionRate}%`);
      console.log(`   Total Transactions: ${report.commissionMetrics.totalCommissionTransactions}`);

      // Active deals
      if (report.activeDeals.length > 0) {
        console.log(chalk.bold(`\n🔄 ACTIVE DEALS (${report.activeDeals.length}):`));
        report.activeDeals.forEach((deal, idx) => {
          console.log(`\n   ${idx + 1}. ${deal.dealId}`);
          console.log(`      Property: ${deal.propertyId}`);
          console.log(`      Client: ${deal.clientName}`);
          console.log(`      Stage: ${chalk.cyan(deal.stage)}`);
          console.log(`      Added: ${new Date(deal.addedAt).toLocaleDateString()}`);
        });
      }

      // Pending commissions
      if (report.pendingCommissions.length > 0) {
        console.log(chalk.bold(`\n⏳ PENDING COMMISSIONS (${report.pendingCommissions.length}):`));
        report.pendingCommissions.forEach((comm, idx) => {
          console.log(`\n   ${idx + 1}. ${comm.commissionId}`);
          console.log(`      Deal: ${comm.dealId}`);
          console.log(`      Amount: ${chalk.yellow(comm.commissionAmount + ' AED')}`);
          console.log(`      Rate: ${comm.commissionRate}% of ${comm.finalPrice} AED`);
          console.log(`      Status: ${chalk.yellow(comm.status)}`);
        });
      }

      // Recent closed deals
      if (report.recentClosedDeals.length > 0) {
        console.log(chalk.bold(`\n✅ RECENT CLOSED DEALS (Last 5):`));
        report.recentClosedDeals.forEach((deal, idx) => {
          console.log(`   ${idx + 1}. ${deal.dealId} - ${deal.clientName}`);
        });
      }

      console.log('\n' + chalk.cyan('═'.repeat(70)) + '\n');

    } catch (error) {
      logger.error(`❌ Error displaying dashboard: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * Display agent summary (quick view)
   */
  displayAgentSummary(agentId) {
    try {
      const agent = this.agentDealManager.getAgent(agentId);
      if (!agent) {
        console.log(chalk.red(`❌ Agent not found: ${agentId}`));
        return;
      }

      console.log(`\n${chalk.bold(agent.agentName)} (${agent.agency})`);
      console.log(`  Active: ${agent.activeDeals.length} | Closed: ${agent.closedDeals.length} | Earned: ${chalk.green(agent.commissionTracking.totalEarnedThisYear + ' AED')}`);

    } catch (error) {
      logger.error(`❌ Error displaying summary: ${error.message}`);
    }
  }

  /**
   * Display all agents comparison
   */
  displayAllAgentsComparison() {
    try {
      const agents = this.agentDealManager.getAllAgents();
      
      if (agents.length === 0) {
        console.log(chalk.yellow('No agents registered yet.'));
        return;
      }

      console.log('\n');
      console.log(chalk.cyan('═'.repeat(90)));
      console.log(chalk.cyan('                         ALL AGENTS PERFORMANCE COMPARISON'));
      console.log(chalk.cyan('═'.repeat(90)));

      // Table header
      console.log(chalk.bold(
        '\nAgent Name          Agency              Active  Closed  Total Earned      Pending'
      ));
      console.log(chalk.gray('─'.repeat(90)));

      // Agents list
      agents
        .sort((a, b) => b.commissionTracking.totalEarnedThisYear - a.commissionTracking.totalEarnedThisYear)
        .forEach(agent => {
          const earned = agent.commissionTracking.totalEarnedThisYear;
          const pending = agent.commissionTracking.pendingCommission;
          
          console.log(
            `${agent.agentName.padEnd(20)} ` +
            `${(agent.agency || 'N/A').padEnd(20)} ` +
            `${String(agent.activeDeals.length).padEnd(7)} ` +
            `${String(agent.closedDeals.length).padEnd(7)} ` +
            `${chalk.green(String(earned + ' AED').padEnd(17))} ` +
            `${chalk.yellow(pending + ' AED')}`
          );
        });

      console.log('\n' + chalk.cyan('═'.repeat(90)) + '\n');

    } catch (error) {
      logger.error(`❌ Error displaying all agents: ${error.message}`);
    }
  }

  /**
   * Display commission payment schedule
   */
  displayCommissionPaymentSchedule(agentId) {
    try {
      const agent = this.agentDealManager.getAgent(agentId);
      if (!agent) {
        console.log(chalk.red(`❌ Agent not found: ${agentId}`));
        return;
      }

      console.log('\n');
      console.log(chalk.cyan('═'.repeat(70)));
      console.log(chalk.cyan(`         COMMISSION PAYMENT SCHEDULE - ${agent.agentName}`));
      console.log(chalk.cyan('═'.repeat(70)));

      const pending = agent.commissionTracking.commissions.filter(c => c.status === 'agreed');
      const paid = agent.commissionTracking.commissions.filter(c => c.status === 'paid');

      if (pending.length > 0) {
        console.log(chalk.yellow(`\n⏳ PENDING (${pending.length}):`));
        console.log(chalk.gray(
          '  Deal ID               Amount        Rate     Status'
        ));
        console.log(chalk.gray('─'.repeat(70)));
        
        pending.forEach(comm => {
          console.log(
            `  ${comm.dealId.padEnd(22)} ` +
            `${chalk.yellow(String(comm.commissionAmount).padEnd(13))} AED ` +
            `${comm.commissionRate}% ` +
            `${chalk.yellow(comm.status.toUpperCase())}`
          );
        });

        console.log(chalk.yellow(`\n  Total Pending: ${chalk.bold(pending.reduce((sum, c) => sum + c.commissionAmount, 0) + ' AED')}`));
      }

      if (paid.length > 0) {
        console.log(chalk.green(`\n✅ PAID (${paid.length}):`));
        console.log(chalk.gray(
          '  Deal ID               Amount        Rate     Paid Date'
        ));
        console.log(chalk.gray('─'.repeat(70)));
        
        paid.forEach(comm => {
          const paidDate = comm.paidAt ? new Date(comm.paidAt).toLocaleDateString() : 'N/A';
          console.log(
            `  ${comm.dealId.padEnd(22)} ` +
            `${chalk.green(String(comm.commissionAmount).padEnd(13))} AED ` +
            `${comm.commissionRate}% ` +
            `${paidDate}`
          );
        });

        console.log(chalk.green(`\n  Total Paid: ${chalk.bold(paid.reduce((sum, c) => sum + c.commissionAmount, 0) + ' AED')}`));
      }

      console.log('\n' + chalk.cyan('═'.repeat(70)) + '\n');

    } catch (error) {
      logger.error(`❌ Error displaying payment schedule: ${error.message}`);
    }
  }
}

export default AgentDashboard;
