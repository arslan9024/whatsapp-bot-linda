/**
 * DAMAC Bot Command Router
 * Routes WhatsApp messages to appropriate handlers
 */

import DamacApiClient from './DamacApiClient.js';

class CommandRouter {
  constructor(apiUrl = 'http://localhost:3000/api') {
    this.api = new DamacApiClient(apiUrl);
    this.commands = {
      'property': this.handlePropertyCommand.bind(this),
      'properties': this.handlePropertyCommand.bind(this),
      'tenancy': this.handleTenancyCommand.bind(this),
      'tenant': this.handleTenancyCommand.bind(this),
      'buying': this.handleBuyingCommand.bind(this),
      'buy': this.handleBuyingCommand.bind(this),
      'owner': this.handleOwnershipCommand.bind(this),
      'ownership': this.handleOwnershipCommand.bind(this),
      'agent': this.handleAgentCommand.bind(this),
      'help': this.handleHelp.bind(this),
      'status': this.handleStatus.bind(this)
    };
  }

  /**
   * Register a custom command at runtime
   * @param {string} command
   * @param {Function} handler
   */
  async registerCommand(command, handler) {
    if (!command || typeof command !== 'string') {
      throw new Error('Command name is required');
    }
    if (typeof handler !== 'function') {
      throw new Error('Command handler must be a function');
    }
    this.commands[command.toLowerCase()] = async (...args) => handler(...args);
    return true;
  }

  /**
   * Main router - parses message and routes to handler
   */
  async route(message) {
    try {
      const tokens = message.toLowerCase().trim().split(/\s+/);
      const command = tokens[0];
      const action = tokens[1];
      const args = tokens.slice(2);

      if (this.commands[command]) {
        return await this.commands[command](action, args);
      }

      return this.getHelp();
    } catch (error) {
      console.error('Router error:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  // ==================== PROPERTY COMMANDS ====================

  async handlePropertyCommand(action, args) {
    switch ((action || '').toLowerCase()) {
      case 'list':
      case 'all':
        return await this.listProperties(args);

      case 'search':
      case 'find':
        return await this.searchProperty(args);

      case 'get':
      case 'show':
        return await this.getProperty(args);

      case 'cluster':
        return await this.getPropertiesByCluster(args);

      case 'available':
        return await this.getAvailableProperties();

      case 'rented':
        return await this.getRentedProperties();

      case 'create':
        return '📋 Create property: Provide details in WhatsApp';

      default:
        return `
🏠 Property Commands:
/property list - List all properties
/property search [cluster] - Search by cluster
/property get [id] - Get property details
/property available - Show available units
/property rented - Show rented units
        `;
    }
  }

  async listProperties(args) {
    try {
      const limit = args[0] ? parseInt(args[0]) : 10;
      const result = await this.api.getProperties({ limit });

      if (result.data.length === 0) {
        return '📭 No properties found';
      }

      let message = `🏠 Properties (${result.pagination.total} total)\n━━━━━━━━━━━━━━━━━━━━\n`;
      result.data.slice(0, limit).forEach((p, i) => {
        message += `${i + 1}. ${p.unitNumber} (${p.bedrooms}BR)\n   AED ${p.priceAED} • ${p.availabilityStatus}\n`;
      });

      if (result.pagination.total > limit) {
        message += `\n📄 Showing ${limit} of ${result.pagination.total}`;
      }

      return message;
    } catch (error) {
      return `❌ Error fetching properties: ${error.message}`;
    }
  }

  async searchProperty(args) {
    if (args.length === 0) {
      return '📍 Usage: /property search [cluster name]';
    }

    try {
      const cluster = args.join(' ');
      const result = await this.api.getPropertiesByCluster(cluster);

      let message = `🏢 Properties in ${cluster}\n━━━━━━━━━━━━━━━━━━━━\n`;
      result.data.slice(0, 5).forEach((p, i) => {
        message += `${i + 1}. ${p.unitNumber} - AED ${p.priceAED}\n`;
      });

      return message;
    } catch (error) {
      return `❌ Cluster not found: ${args.join(' ')}`;
    }
  }

  async getProperty(args) {
    if (args.length === 0) {
      return '📍 Usage: /property get [unit number]';
    }

    try {
      const unitNumber = args.join(' ');
      const result = await this.api.getProperties();
      const property = result.data.find(p => p.unitNumber?.toLowerCase() === unitNumber.toLowerCase());

      if (!property) {
        return `❌ Property ${unitNumber} not found`;
      }

      return this.formatPropertyDetails(property);
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async getPropertiesByCluster(args) {
    if (args.length === 0) {
      return '📍 Usage: /property cluster [cluster name]';
    }

    try {
      const cluster = args.join(' ');
      const result = await this.api.getPropertiesByCluster(cluster);

      if (result.data.length === 0) {
        return `No properties in ${cluster}`;
      }

      let message = `🏢 ${cluster} - ${result.data.length} properties\n━━━━━━━━━━━━━━━━━━━━\n`;
      result.data.slice(0, 5).forEach((p, i) => {
        message += `${i + 1}. ${p.unitNumber} (${p.bedrooms}BR) - AED ${p.priceAED}\n`;
      });

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async getAvailableProperties() {
    try {
      const result = await this.api.getProperties({ status: 'available' });

      if (result.data.length === 0) {
        return '✅ No available properties (all rented!)';
      }

      let message = `✅ Available Properties (${result.pagination.total})\n━━━━━━━━━━━━━━━━━━━━\n`;
      result.data.slice(0, 5).forEach((p, i) => {
        message += `${i + 1}. ${p.unitNumber} (${p.bedrooms}BR) - AED ${p.priceAED}\n`;
      });

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async getRentedProperties() {
    try {
      const result = await this.api.getProperties({ status: 'rented' });

      if (result.data.length === 0) {
        return '🚫 No rented properties';
      }

      let message = `🔑 Rented Properties (${result.pagination.total})\n━━━━━━━━━━━━━━━━━━━━\n`;
      result.data.slice(0, 5).forEach((p, i) => {
        message += `${i + 1}. ${p.unitNumber} (${p.bedrooms}BR) - AED ${p.priceAED}\n`;
      });

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  formatPropertyDetails(property) {
    return `
🏠 Property: ${property.unitNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Cluster: ${property.cluster}
🏢 Building: ${property.buildingNumber}
🔑 Type: ${property.propertyType}

💰 Price: AED ${property.priceAED}
📐 Area: ${property.builtUpArea} sqft
🛏️ Bedrooms: ${property.bedrooms}
🚿 Bathrooms: ${property.bathrooms}
🚗 Parking: ${property.parking}

🛋️ Furnishing: ${property.furnishing}
🔄 Status: ${property.availabilityStatus}
💳 Service Charge: AED ${property.serviceCharge || 'N/A'}/month
    `;
  }

  // ==================== TENANCY COMMANDS ====================

  async handleTenancyCommand(action, args) {
    switch ((action || '').toLowerCase()) {
      case 'list':
      case 'all':
        return await this.listTenancies();

      case 'active':
        return await this.getActiveTenancies();

      case 'summary':
        return await this.getTenancySummary();

      default:
        return `
📋 Tenancy Commands:
/tenancy list - List all tenancies
/tenancy active - Show active tenancies
/tenancy summary - Get tenancy summary
        `;
    }
  }

  async listTenancies() {
    try {
      const result = await this.api.getTenancies({ status: 'active', limit: 5 });

      if (result.data.length === 0) {
        return '📭 No active tenancies';
      }

      let message = `📋 Active Tenancies (${result.pagination.total})\n━━━━━━━━━━━━━━━━━━━━\n`;
      result.data.forEach((t, i) => {
        const endDate = new Date(t.contractExpiryDate).toLocaleDateString();
        message += `${i + 1}. Unit: ${t.propertyId?.substring(0, 8)}...\n   Rent: AED ${t.rentPerMonth} • Ends: ${endDate}\n`;
      });

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async getActiveTenancies() {
    try {
      const result = await this.api.getTenancies({ status: 'active' });
      let message = `🔑 Active Tenancies: ${result.pagination.total}\n━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Total Monthly Rent: AED ${result.data.reduce((sum, t) => sum + (t.rentPerMonth || 0), 0)}\n`;
      message += `Contracts Ending Soon: ${result.data.filter(t => {
        const daysLeft = Math.ceil((new Date(t.contractExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft < 90 && daysLeft > 0;
      }).length}`;

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async getTenancySummary() {
    try {
      const result = await this.api.getTenancies({ limit: 100 });

      const totalRent = result.data.reduce((sum, t) => sum + (t.rentPerMonth || 0), 0);
      const active = result.data.filter(t => t.status === 'active').length;
      const totalCheques = result.data.reduce((sum, t) => sum + (t.chequeDetails?.length || 0), 0);

      return `
📊 Tenancy Summary
━━━━━━━━━━━━━━━━━━━━
Total Contracts: ${result.pagination.total}
Active Tenancies: ${active}
Monthly Revenue: AED ${totalRent}
Cheques Pending: ${totalCheques}

Next Actions:
• Check expiring contracts
• Collect cheques
• Update occupancy status
      `;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  // ==================== BUYING COMMANDS ====================

  async handleBuyingCommand(action, args) {
    switch ((action || '').toLowerCase()) {
      case 'inquiries':
      case 'list':
        return await this.listBuyingInquiries();

      case 'interested':
        return await this.getInterestedBuyers();

      default:
        return `
🛒 Buying Commands:
/buying inquiries - List all inquiries
/buying interested - Show interested buyers
        `;
    }
  }

  async listBuyingInquiries() {
    try {
      const result = await this.api.getBuying({ limit: 10 });

      if (result.data.length === 0) {
        return '📭 No buying inquiries';
      }

      let message = `🛒 Buying Inquiries (${result.pagination.total})\n━━━━━━━━━━━━━━━━━━━━\n`;
      result.data.slice(0, 5).forEach((b, i) => {
        message += `${i + 1}. Status: ${b.status} • Offer: AED ${b.offeredPrice}\n`;
      });

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async getInterestedBuyers() {
    try {
      const result = await this.api.getBuying({ status: 'interested' });

      return `
👥 Interested Buyers: ${result.data.length}
━━━━━━━━━━━━━━━━━━━━
Total Offers: AED ${result.data.reduce((sum, b) => sum + (b.offeredPrice || 0), 0).toLocaleString()}
Average Offer: AED ${Math.round(result.data.reduce((sum, b) => sum + (b.offeredPrice || 0), 0) / (result.data.length || 1)).toLocaleString()}
      `;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  // ==================== OWNERSHIP COMMANDS ====================

  async handleOwnershipCommand(action, args) {
    switch ((action || '').toLowerCase()) {
      case 'list':
      case 'all':
        return await this.listOwnerships();

      default:
        return `
👤 Ownership Commands:
/owner list - List all ownerships
        `;
    }
  }

  async listOwnerships() {
    try {
      const result = await this.api.getOwnerships({ limit: 10 });

      if (result.data.length === 0) {
        return '📭 No ownerships';
      }

      let message = `👤 Property Ownerships (${result.pagination.total})\n━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Total Properties: ${result.pagination.total}`;

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  // ==================== AGENT COMMANDS ====================

  async handleAgentCommand(action, args) {
    switch ((action || '').toLowerCase()) {
      case 'list':
        return await this.listAgents();

      case 'assignments':
        return await this.getAgentAssignments();

      default:
        return `
🤝 Agent Commands:
/agent list - List agents
/agent assignments - View assignments
        `;
    }
  }

  async listAgents() {
    try {
      const result = await this.api.getAgents({ limit: 10 });

      if (result.data.length === 0) {
        return '📭 No agent assignments';
      }

      let message = `🤝 Agent Assignments (${result.pagination.total})\n━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Total Assignments: ${result.pagination.total}`;

      return message;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async getAgentAssignments() {
    try {
      const result = await this.api.getAgents({ limit: 5 });

      return `
🤝 Agent Assignment Summary
━━━━━━━━━━━━━━━━━━━━
Total Agents: ${result.pagination.total}
Commission Average: ${result.data.length > 0 ? (result.data.reduce((sum, a) => sum + (a.commissionPercentage || 0), 0) / result.data.length).toFixed(2) : 0}%
      `;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  // ==================== SYSTEM COMMANDS ====================

  async handleStatus(action, args) {
    try {
      const isHealthy = await this.api.healthCheck();
      return isHealthy ? '✅ API is online and responsive' : '❌ API is offline';
    } catch (error) {
      return `❌ API Status: Offline`;
    }
  }

  async handleHelp(action, args) {
    return this.getHelp();
  }

  getHelp() {
    return `
📱 DAMAC Bot - Command Reference
════════════════════════════════════

🏠 PROPERTIES
/property list [limit] - Show all properties
/property get [unit] - Get property details
/property cluster [name] - Search by cluster
/property available - Show available units
/property rented - Show rented units

📋 TENANCIES
/tenancy list - List all tenancies
/tenancy active - Show active contracts
/tenancy summary - Get summary stats

🛒 BUYING
/buying inquiries - List inquiries
/buying interested - Show interested buyers

👤 OWNERSHIP
/owner list - List ownerships

🤝 AGENTS
/agent list - List agent assignments
/agent assignments - View assignments

⚙️ SYSTEM
/status - API health check
/help - Show this help message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━~~~~~~~~~~~~~~~~
v1.0 • Ready for Production
    `;
  }
}

export default CommandRouter;
