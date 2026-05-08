/**
 * ====================================================================
 * SERVICE REGISTRY (Phase 11 — Global Pollution Elimination)
 * ====================================================================
 * Centralised service locator that replaces all `global.XXX` assignments.
 *
 * Usage:
 *   import services from './code/utils/ServiceRegistry.js';
 *
 *   // Register (index.js, during init)
 *   services.register('accountConfigManager', myInstance);
 *
 *   // Consume (any module)
 *   const cfg = services.get('accountConfigManager');
 *
 * Design decisions:
 *   - Singleton (default export) so every import points to the same Map.
 *   - get() returns null for unregistered keys (no throw), matching the
 *     existing `global.XXX?.method()` optional-chaining pattern.
 *   - getOrThrow() for mandatory dependencies — throws clearly if missing.
 *   - has() for explicit checks.
 *   - snapshot() returns a human-readable registry dump for `npm run doctor`.
 *   - Backward-compat: the `Lion0` / `Linda` aliases continue to work
 *     via `services.get('Lion0')`.
 *
 * @since Phase 11 – February 14, 2026
 * @upgraded May 2026 – getOrThrow, snapshot, registeredAt tracking
 */

class ServiceRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this._services = new Map();
    /** @type {Map<string, Date>} */
    this._registeredAt = new Map();
    /** @type {Date} */
    this._createdAt = new Date();
  }

  /**
   * Register a service. Overwrites silently if key already exists.
   * @param {string} name
   * @param {any}    instance
   * @returns {this}  for chaining
   */
  register(name, instance) {
    this._services.set(name, instance);
    this._registeredAt.set(name, new Date());
    return this;
  }

  /**
   * Retrieve a service by name.
   * @param {string} name
   * @returns {any|null}  The service instance, or null if not registered.
   */
  get(name) {
    return this._services.get(name) ?? null;
  }

  /**
   * Retrieve a required service.  Throws a descriptive error when missing,
   * so callers get an actionable message instead of a silent null.
   *
   * @param {string} name
   * @returns {any}
   * @throws {Error}  if the service has not been registered
   */
  getOrThrow(name) {
    const svc = this._services.get(name);
    if (svc === undefined) {
      const registered = this.list().join(', ') || '(none)';
      throw new Error(
        `[ServiceRegistry] Required service "${name}" is not registered.\n` +
        `Currently registered: ${registered}`
      );
    }
    return svc;
  }

  /**
   * Check whether a service is registered.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._services.has(name);
  }

  /**
   * Remove a service (useful during shutdown / tests).
   * @param {string} name
   * @returns {boolean}  true if the service existed and was removed.
   */
  unregister(name) {
    this._registeredAt.delete(name);
    return this._services.delete(name);
  }

  /**
   * Remove all registered services.
   */
  clear() {
    this._services.clear();
    this._registeredAt.clear();
  }

  /**
   * Return a plain list of all registered service names (for diagnostics).
   * @returns {string[]}
   */
  list() {
    return [...this._services.keys()];
  }

  /**
   * Return a structured snapshot of the registry — useful for `npm run doctor`
   * and runtime diagnostics.
   *
   * @returns {{
   *   createdAt: string,
   *   count: number,
   *   services: Array<{ name: string, type: string, registeredAt: string }>
   * }}
   */
  snapshot() {
    const services = [];
    for (const [name, instance] of this._services) {
      services.push({
        name,
        type: instance?.constructor?.name ?? typeof instance,
        registeredAt: (this._registeredAt.get(name) ?? new Date()).toISOString(),
      });
    }
    return {
      createdAt: this._createdAt.toISOString(),
      count: services.length,
      services,
    };
  }

  /**
   * Return count of registered services.
   * @returns {number}
   */
  get size() {
    return this._services.size;
  }
}

/** Singleton instance – every `import services from '…/ServiceRegistry.js'` gets the same object. */
const services = new ServiceRegistry();
export default services;
