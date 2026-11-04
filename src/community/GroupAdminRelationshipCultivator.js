/**
 * @file GroupAdminRelationshipCultivator.js
 * @description Manages strategic relationships with WhatsApp broker group administrators, tracking rules, preferred listing formats, and personalized goodwill greetings.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class GroupAdminRelationshipCultivator {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.admins = new Map(); // phone -> { name, groupIds, rules, lastContactedMs }
  }

  /**
   * Registers or updates an admin profile.
   * @param {Object} adminData
   * @param {string} adminData.phone
   * @param {string} adminData.name
   * @param {string} adminData.groupName
   * @param {string} [adminData.specificRule='No spam, 1 post per day']
   */
  registerAdmin(adminData) {
    const existing = this.admins.get(adminData.phone) || {
      phone: adminData.phone,
      name: adminData.name,
      groups: [],
      rules: adminData.specificRule || 'Standard RERA co-broking only',
      lastContactedMs: 0
    };

    if (!existing.groups.includes(adminData.groupName)) {
      existing.groups.push(adminData.groupName);
    }
    this.admins.set(adminData.phone, existing);
  }

  /**
   * Generates courteous relationship maintenance message.
   * @param {string} adminPhone
   * @returns {Object}
   */
  generateGoodwillMessage(adminPhone) {
    const admin = this.admins.get(adminPhone) || { name: 'Admin', phone: adminPhone, groups: ['Broker Community'] };

    return {
      adminName: admin.name,
      adminPhone: admin.phone,
      managedGroups: admin.groups,
      courtesyMessage: `Hi ${admin.name}, hope you're having a productive week! Just touching base to thank you for managing ${admin.groups[0]}. If there are any specific guidelines you'd like our brokerage to adhere to this month, please let us know. Have a wonderful weekend! 🙏`
    };
  }
}

export default new GroupAdminRelationshipCultivator();
