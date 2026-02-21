/**
 * Enhanced DAMAC API Client for WhatsApp Bot
 * Production-ready with retry logic, error handling, and caching
 */

import fetch from 'node-fetch';

class DamacApiClient {
  constructor(baseUrl = 'http://localhost:3000/api', options = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 5000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.cache = new Map();
    this.cacheExpiry = options.cacheExpiry || 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Internal request method with retry logic
   */
  async request(method, endpoint, data = null, useCache = true) {
    const cacheKey = `${method}:${endpoint}`;

    // Check cache for GET requests
    if (method === 'GET' && useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log(`[Cache] ${method} ${endpoint}`);
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this._makeRequest(method, endpoint, data);

        // Cache successful GET requests
        if (method === 'GET' && useCache) {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }

        return result;
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`[Retry] Attempt ${attempt}/${this.maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Make actual HTTP request
   */
  async _makeRequest(method, endpoint, data = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: this.timeout
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
  }

  // ==================== PERSON ENDPOINTS ====================

  async getPeople(page = 1, limit = 20) {
    return this.request('GET', `/people?page=${page}&limit=${limit}`);
  }

  async getPerson(id) {
    return this.request('GET', `/people/${id}`);
  }

  async createPerson(data) {
    return this.request('POST', '/people', data, false);
  }

  async updatePerson(id, data) {
    return this.request('PUT', `/people/${id}`, data, false);
  }

  async deletePerson(id) {
    return this.request('DELETE', `/people/${id}`, null, false);
  }

  // ==================== PROPERTY ENDPOINTS ====================

  async getProperties(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/properties?${params}`);
  }

  async getProperty(id) {
    return this.request('GET', `/properties/${id}`);
  }

  async createProperty(data) {
    return this.request('POST', '/properties', data, false);
  }

  async updateProperty(id, data) {
    return this.request('PUT', `/properties/${id}`, data, false);
  }

  async deleteProperty(id) {
    return this.request('DELETE', `/properties/${id}`, null, false);
  }

  async getPropertiesByCluster(clusterName) {
    return this.request('GET', `/properties/cluster/${encodeURIComponent(clusterName)}`);
  }

  // ==================== TENANCY ENDPOINTS ====================

  async getTenancies(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/tenancies?${params}`);
  }

  async getTenancy(id) {
    return this.request('GET', `/tenancies/${id}`);
  }

  async createTenancy(data) {
    return this.request('POST', '/tenancies', data, false);
  }

  async updateTenancy(id, data) {
    return this.request('PUT', `/tenancies/${id}`, data, false);
  }

  async deleteTenancy(id) {
    return this.request('DELETE', `/tenancies/${id}`, null, false);
  }

  async getTenantProperties(tenantId) {
    return this.request('GET', `/tenancies/tenant/${tenantId}`);
  }

  async getLandlordProperties(landlordId) {
    return this.request('GET', `/tenancies/landlord/${landlordId}`);
  }

  // ==================== OWNERSHIP ENDPOINTS ====================

  async getOwnerships(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/ownerships?${params}`);
  }

  async getOwnership(id) {
    return this.request('GET', `/ownerships/${id}`);
  }

  async createOwnership(data) {
    return this.request('POST', '/ownerships', data, false);
  }

  async updateOwnership(id, data) {
    return this.request('PUT', `/ownerships/${id}`, data, false);
  }

  async deleteOwnership(id) {
    return this.request('DELETE', `/ownerships/${id}`, null, false);
  }

  async getOwnerProperties(ownerId) {
    return this.request('GET', `/ownerships/owner/${ownerId}`);
  }

  // ==================== BUYING ENDPOINTS ====================

  async getBuying(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/buying?${params}`);
  }

  async getBuyingInquiry(id) {
    return this.request('GET', `/buying/${id}`);
  }

  async createBuyingInquiry(data) {
    return this.request('POST', '/buying', data, false);
  }

  async updateBuyingInquiry(id, data) {
    return this.request('PUT', `/buying/${id}`, data, false);
  }

  async deleteBuyingInquiry(id) {
    return this.request('DELETE', `/buying/${id}`, null, false);
  }

  async getPropertyInquiries(propertyId) {
    return this.request('GET', `/buying/property/${propertyId}`);
  }

  // ==================== AGENT ENDPOINTS ====================

  async getAgents(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/agents?${params}`);
  }

  async getAgent(id) {
    return this.request('GET', `/agents/${id}`);
  }

  async createAgent(data) {
    return this.request('POST', '/agents', data, false);
  }

  async updateAgent(id, data) {
    return this.request('PUT', `/agents/${id}`, data, false);
  }

  async deleteAgent(id) {
    return this.request('DELETE', `/agents/${id}`, null, false);
  }

  async getPropertyAgents(propertyId) {
    return this.request('GET', `/agents/property/${propertyId}`);
  }

  async getAgentProperties(agentId) {
    return this.request('GET', `/agents/agent/${agentId}`);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear cache (useful before refreshing data)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`, {
        timeout: this.timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API info
   */
  async getApiInfo() {
    return this.request('GET', '');
  }
}

export default DamacApiClient;
