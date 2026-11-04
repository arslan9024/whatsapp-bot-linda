/**
 * @file RbacPermissionsGuard.js
 * @description Enforces Role-Based Access Control (RBAC) across Web UI routes and API
 * endpoints, differentiating Admin, Supervisor, and Agent operational privileges.
 * Category: Domain / Feature (Security)
 */

export class RbacPermissionsGuard {
  constructor() {
    this.rolePermissions = {
      ADMIN: new Set([
        'VIEW_ALL_LEADS',
        'DISPATCH_BROADCAST',
        'RUN_DIAGNOSTICS',
        'EDIT_SYSTEM_CONFIG',
        'MANAGE_BROKERS',
        'VIEW_AUDIT_LOGS'
      ]),
      SUPERVISOR: new Set([
        'VIEW_ALL_LEADS',
        'DISPATCH_BROADCAST',
        'REASSIGN_LEADS',
        'VIEW_AUDIT_LOGS'
      ]),
      AGENT: new Set([
        'VIEW_ASSIGNED_LEADS',
        'SEND_DIRECT_MESSAGE',
        'UPDATE_DEAL_STAGE'
      ])
    };
  }

  /**
   * Evaluates if a role has permission for an action
   * @param {string} role - 'ADMIN' | 'SUPERVISOR' | 'AGENT'
   * @param {string} permission
   * @returns {boolean}
   */
  hasPermission(role, permission) {
    if (!role) return false;
    const permissions = this.rolePermissions[role.toUpperCase()];
    return Boolean(permissions && permissions.has(permission));
  }

  /**
   * Express middleware factory asserting a required permission
   * @param {string} requiredPermission
   */
  requirePermission(requiredPermission) {
    return (req, res, next) => {
      const userRole = req.user?.role || 'AGENT';
      if (!this.hasPermission(userRole, requiredPermission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Role "${userRole}" lacks required permission "${requiredPermission}"`
        });
      }
      next();
    };
  }
}

export default new RbacPermissionsGuard();

