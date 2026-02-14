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
 *   - has() for explicit checks.
 *   - Backward-compat: the `Lion0` / `Linda` aliases continue to work
 *     via `services.get('Lion0')`.
 *
 * @since Phase 11 – February 14, 2026
 */

class ServiceRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this._services = new Map();
  }

  /**
   * Register a service. Overwrites silently if key already exists.
   * @param {string} name
   * @param {any}    instance
   * @returns {this}  for chaining
   */
  register(name, instance) {
    this._services.set(name, instance);
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
    return this._services.delete(name);
  }

  /**
   * Remove all registered services.
   */
  clear() {
    this._services.clear();
  }

  /**
   * Return a plain list of all registered service names (for diagnostics).
   * @returns {string[]}
   */
  list() {
    return [...this._services.keys()];
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
