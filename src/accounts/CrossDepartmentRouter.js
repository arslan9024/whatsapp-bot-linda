/**
 * @file CrossDepartmentRouter.js
 * @description Routes client inquiries across brokerage operating departments:
 * Sales, Leasing, Property Management (Maintenance & Ejari), and Mortgages.
 * Category: Accounts
 */

export class CrossDepartmentRouter {
  /**
   * Classifies an inquiry to determine the target department
   * @param {string} messageText
   * @returns {{ department: string, confidence: number }}
   */
  classifyDepartment(messageText = '') {
    const text = messageText.toLowerCase();

    // Property Management & Maintenance
    if (/maintenance|repair|leak|ac not cooling|ejari renewal|landlord notice|eviction|handover snag/i.test(text)) {
      return { department: 'PROPERTY_MANAGEMENT', confidence: 90 };
    }

    // Mortgage & Financing
    if (/mortgage|bank loan|pre-approval|interest rate|loan against property|financing/i.test(text)) {
      return { department: 'MORTGAGE_SERVICES', confidence: 85 };
    }

    // Leasing & Rentals
    if (/rent|tenant|lease|yearly rent|chqs|cheques|monthly rental/i.test(text)) {
      return { department: 'LEASING', confidence: 85 };
    }

    // Default to Sales & Investment
    return { department: 'SALES_INVESTMENT', confidence: 75 };
  }

  /**
   * Generates department routing notification for internal routing
   * @param {string} department
   * @param {Object} clientInfo
   * @returns {Object}
   */
  createRoutingTicket(department, clientInfo) {
    return {
      ticketId: `dept_${Date.now()}`,
      targetDepartment: department,
      clientName: clientInfo.name || 'Client',
      clientPhone: clientInfo.phone || '',
      routedAt: new Date().toISOString(),
      priority: department === 'PROPERTY_MANAGEMENT' ? 'HIGH' : 'NORMAL'
    };
  }
}

export default new CrossDepartmentRouter();

