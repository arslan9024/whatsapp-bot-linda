/**
 * Dashboard CLI Interface
 * Command-line interface for agent dashboard and deal tracking
 */

import readline from 'readline';
import chalk from 'chalk';
import { logger } from '../Integration/Google/utils/logger.js';

class DashboardCLI {
  constructor(config = {}) {
    this.agentDealManager = config.agentDealManager;
    this.dealLifecycleManager = config.dealLifecycleManager;
    this.propertyEngine = config.propertyEngine;
    this.clientEngine = config.clientEngine;
    this.agentDashboard = config.agentDashboard;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('dashboa rd> ')
    });
  }

  /**
   * Start the dashboard CLI
   */
  start() {
    console.log('\n');
    console.log(chalk.cyan('╔' + '═'.repeat(68) + '╗'));
    console.log(chalk.cyan('║' + '                    LINDA AI - AGENT DASHBOARD'.padEnd(69) + '║'));
    console.log(chalk.cyan('║' + '                          v1.0.0'.padEnd(69) + '║'));
    console.log(chalk.cyan('╚' + '═'.repeat(68) + '╝'));
    
    console.log(chalk.gray('\nType "help" for available commands or "exit" to quit.\n'));
    
    this.rl.prompt();
    
    this.rl.on('line', (line) => {
      const input = line.trim().toLowerCase();
      
      if (!input) {
        this.rl.prompt();
        return;
      }

      if (input === 'exit' || input === 'quit') {
        console.log(chalk.yellow('\nGoodbye! 👋\n'));
        this.rl.close();
        process.exit(0);
      }

      this.handleCommand(input);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      process.exit(0);
    });
  }

  /**
   * Handle user commands
   */
  handleCommand(input) {
    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'help':
          this.showHelp();
          break;

        case 'agent':
          if (args[0] === 'dashboard' && args[1]) {
            this.agentDashboard.displayAgentDashboard(args[1]);
          } else if (args[0] === 'summary' && args[1]) {
            this.agentDashboard.displayAgentSummary(args[1]);
          } else if (args[0] === 'list') {
            this.agentDashboard.displayAllAgentsComparison();
          } else if (args[0] === 'payments' && args[1]) {
            this.agentDashboard.displayCommissionPaymentSchedule(args[1]);
          } else {
            console.log(chalk.yellow('Usage: agent [dashboard|summary|list|payments] [agentId]'));
          }
          break;

        case 'deal':
          if (args[0] === 'status' && args[1]) {
            this.showDealStatus(args[1]);
          } else if (args[0] === 'list') {
            if (args[1]) {
              this.showAgentDeals(args[1]);
            } else {
              console.log(chalk.yellow('Usage: deal list [agentId]'));
            }
          } else {
            console.log(chalk.yellow('Usage: deal [status|list] [dealId|agentId]'));
          }
          break;

        case 'property':
          if (args[0] === 'list') {
            this.listProperties(args[1]);
          } else if (args[0] === 'search' && args[1]) {
            this.searchProperty(args.join(' '));
          } else {
            console.log(chalk.yellow('Usage: property [list|search] [query]'));
          }
          break;

        case 'client':
          if (args[0] === 'list') {
            this.listClients();
          } else if (args[0] === 'search' && args[1]) {
            this.searchClient(args.join(' '));
          } else {
            console.log(chalk.yellow('Usage: client [list|search] [query]'));
          }
          break;

        case 'stats':
          this.showStatistics();
          break;

        case 'clear':
          console.clear();
          break;

        default:
          console.log(chalk.red(`Unknown command: ${command}. Type "help" for available commands.`));
      }
    } catch (error) {
      logger.error(`CLI error: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * Show help menu
   */
  showHelp() {
    console.log(`
${chalk.cyan('╔' + '═'.repeat(68) + '╗')}
${chalk.cyan('║' + ' AVAILABLE COMMANDS'.padEnd(69) + '║')}
${chalk.cyan('╚' + '═'.repeat(68) + '╝')}

${chalk.bold('AGENT COMMANDS:')}
  agent dashboard [agentId]    - Display agent dashboard and metrics
  agent summary [agentId]      - Quick summary of agent performance
  agent list                   - Compare all agents
  agent payments [agentId]     - Show commission payment schedule

${chalk.bold('DEAL COMMANDS:')}
  deal status [dealId]         - Show deal status and details
  deal list [agentId]          - List all deals for an agent

${chalk.bold('PROPERTY COMMANDS:')}
  property list [type]         - List all properties (optional: filter by type)
  property search [query]      - Search properties by location/features

${chalk.bold('CLIENT COMMANDS:')}
  client list                  - List all clients
  client search [query]        - Search clients by name/contact

${chalk.bold('OTHER COMMANDS:')}
  stats                        - Show system statistics
  clear                        - Clear screen
  help                         - Show this help menu
  exit                         - Exit the application

${chalk.gray('Examples:')}
  > agent dashboard agent001
  > deal list agent001
  > property search dubai marina
  > client search ahmed
    `);
  }

  /**
   * Show deal status
   */
  showDealStatus(dealId) {
    try {
      const deal = this.dealLifecycleManager.getDeal(dealId);
      if (!deal) {
        console.log(chalk.red(`❌ Deal not found: ${dealId}`));
        return;
      }

      console.log(`\n${chalk.cyan('Deal:').padEnd(20)} ${deal.dealId}`);
      console.log(`${chalk.cyan('Property:').padEnd(20)} ${deal.propertyId}`);
      console.log(`${chalk.cyan('Client:').padEnd(20)} ${deal.clientId}`);
      console.log(`${chalk.cyan('Stage:').padEnd(20)} ${chalk.yellow(deal.stage)}`);
      console.log(`${chalk.cyan('Status:').padEnd(20)} ${deal.status}`);
      console.log(`${chalk.cyan('Created:').padEnd(20)} ${new Date(deal.createdAt).toLocaleDateString()}`);
      if (deal.closedAt) {
        console.log(`${chalk.cyan('Closed:').padEnd(20)} ${new Date(deal.closedAt).toLocaleDateString()}`);
      }

    } catch (error) {
      logger.error(`Error fetching deal: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * Show agent deals
   */
  showAgentDeals(agentId) {
    try {
      const agent = this.agentDealManager.getAgent(agentId);
      if (!agent) {
        console.log(chalk.red(`❌ Agent not found: ${agentId}`));
        return;
      }

      console.log(`\n${chalk.bold(`Deals for ${agent.agentName}:`)}`);
      console.log(chalk.gray('Active Deals:'));
      
      if (agent.activeDeals.length === 0) {
        console.log('  (None)');
      } else {
        agent.activeDeals.forEach((dealId, idx) => {
          console.log(`  ${idx + 1}. ${dealId}`);
        });
      }

      console.log(chalk.gray('\nClosed Deals:'));
      if (agent.closedDeals.length === 0) {
        console.log('  (None)');
      } else {
        agent.closedDeals.slice(0, 5).forEach((dealId, idx) => {
          console.log(`  ${idx + 1}. ${dealId}`);
        });
        if (agent.closedDeals.length > 5) {
          console.log(`  ... and ${agent.closedDeals.length - 5} more`);
        }
      }

    } catch (error) {
      logger.error(`Error fetching deals: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * List properties
   */
  listProperties(type) {
    try {
      const properties = this.propertyEngine.getAllProperties();
      const filtered = type ? properties.filter(p => p.propertyType === type) : properties;

      if (filtered.length === 0) {
        console.log(chalk.yellow(`No ${type ? type + ' ' : ''}properties found.`));
        return;
      }

      console.log(`\n${chalk.bold(`Properties (${filtered.length}):`)}`);
      console.log(chalk.gray('  ID                Location              Type              Price'));
      console.log(chalk.gray('─'.repeat(70)));

      filtered.slice(0, 10).forEach(prop => {
        console.log(
          `  ${prop.propertyId.padEnd(20)} ` +
          `${(prop.location || 'N/A').padEnd(20)} ` +
          `${(prop.propertyType || 'N/A').padEnd(17)} ` +
          `${prop.price || 'N/A'}`
        );
      });

      if (filtered.length > 10) {
        console.log(`\n... and ${filtered.length - 10} more properties`);
      }

    } catch (error) {
      logger.error(`Error listing properties: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * Search property
   */
  searchProperty(query) {
    try {
      const properties = this.propertyEngine.searchProperties(query);

      if (properties.length === 0) {
        console.log(chalk.yellow(`No properties found matching "${query}"`));
        return;
      }

      console.log(`\n${chalk.bold(`Search Results (${properties.length}):`)}`);
      properties.slice(0, 5).forEach((prop, idx) => {
        console.log(`\n  ${idx + 1}. ${prop.propertyId}`);
        console.log(`     Location: ${prop.location}`);
        console.log(`     Type: ${prop.propertyType}`);
        console.log(`     Price: ${prop.price} AED`);
      });

      if (properties.length > 5) {
        console.log(`\n... and ${properties.length - 5} more results`);
      }

    } catch (error) {
      logger.error(`Error searching properties: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * List clients
   */
  listClients() {
    try {
      const clients = this.clientEngine.getAllClients();

      if (clients.length === 0) {
        console.log(chalk.yellow('No clients found.'));
        return;
      }

      console.log(`\n${chalk.bold(`Clients (${clients.length}):`)}`);
      console.log(chalk.gray('  ID                  Name                 Type              Contact'));
      console.log(chalk.gray('─'.repeat(70)));

      clients.slice(0, 10).forEach(client => {
        console.log(
          `  ${client.clientId.padEnd(20)} ` +
          `${(client.name || 'N/A').padEnd(20)} ` +
          `${(client.clientType || 'N/A').padEnd(17)} ` +
          `${client.contact || 'N/A'}`
        );
      });

      if (clients.length > 10) {
        console.log(`\n... and ${clients.length - 10} more clients`);
      }

    } catch (error) {
      logger.error(`Error listing clients: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * Search client
   */
  searchClient(query) {
    try {
      const clients = this.clientEngine.searchClients(query);

      if (clients.length === 0) {
        console.log(chalk.yellow(`No clients found matching "${query}"`));
        return;
      }

      console.log(`\n${chalk.bold(`Search Results (${clients.length}):`)}`);
      clients.slice(0, 5).forEach((client, idx) => {
        console.log(`\n  ${idx + 1}. ${client.clientId}`);
        console.log(`     Name: ${client.name}`);
        console.log(`     Type: ${client.clientType}`);
        console.log(`     Contact: ${client.contact}`);
      });

      if (clients.length > 5) {
        console.log(`\n... and ${clients.length - 5} more results`);
      }

    } catch (error) {
      logger.error(`Error searching clients: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  /**
   * Show statistics
   */
  showStatistics() {
    try {
      console.log('\n');
      console.log(chalk.cyan('═'.repeat(70)));
      console.log(chalk.cyan('                       SYSTEM STATISTICS'));
      console.log(chalk.cyan('═'.repeat(70)));

      const agents = this.agentDealManager.getAllAgents();
      const properties = this.propertyEngine.getAllProperties();
      const clients = this.clientEngine.getAllClients();

      console.log(chalk.bold('\n📊 OVERVIEW:'));
      console.log(`   Total Agents: ${agents.length}`);
      console.log(`   Total Properties: ${properties.length}`);
      console.log(`   Total Clients: ${clients.length}`);

      const totalDeals = agents.reduce((sum, a) => sum + a.activeDeals.length + a.closedDeals.length, 0);
      const totalEarned = agents.reduce((sum, a) => sum + a.commissionTracking.totalEarnedThisYear, 0);
      
      console.log(chalk.bold('\n💼 DEALS:'));
      console.log(`   Total Deals: ${totalDeals}`);
      console.log(`   Total Commission Earned: ${chalk.green(totalEarned + ' AED')}`);

      const activeDealsCount = agents.reduce((sum, a) => sum + a.activeDeals.length, 0);
      const closedDealsCount = agents.reduce((sum, a) => sum + a.closedDeals.length, 0);
      
      console.log(`   Active Deals: ${activeDealsCount}`);
      console.log(`   Closed Deals: ${closedDealsCount}`);

      console.log('\n' + chalk.cyan('═'.repeat(70)) + '\n');

    } catch (error) {
      logger.error(`Error getting statistics: ${error.message}`);
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}

export default DashboardCLI;
