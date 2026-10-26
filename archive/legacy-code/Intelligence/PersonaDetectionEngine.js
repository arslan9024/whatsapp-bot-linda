/**
 * Persona Detection Engine
 * Identifies user roles: buyer, seller, tenant, landlord, agent, security_guard
 * 
 * Features:
 * - Auto-detect from message keywords and behavior patterns
 * - Detect security guards from Google Contacts (via SecurityGuardContactMapper)
 * - Manual role declaration support
 * - Track confidence scores for each detected role
 * - Learn from conversation history
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PersonaDetectionEngine {
  constructor(config = {}) {
    this.personas = new Map();  // phone → persona object
    this.detectionKeywords = {
      buyer: [
        'looking for', 'want to buy', 'can you find', 'budget', 'interested in',
        'search for', 'find me', 'show me', 'price', 'how much', 'afford'
      ],
      seller: [
        'selling', 'for sale', 'asking price', 'sell', 'motivated seller',
        'property for sale', 'own property', 'owner', 'price negotiable'
      ],
      tenant: [
        'looking to rent', 'need apartment', 'lease', 'monthly budget', 'move in',
        'rent apartment', 'flat wanted', 'accommodation', 'renting', 'tenant'
      ],
      landlord: [
        'renting out', 'leasing', 'tenant wanted', 'monthly rent', 'furnished',
        'landlord', 'property to lease', 'lease term', 'tenant search'
      ],
      agent: [
        'agent', 'real estate', 'represent', 'deal with me', 'commission',
        'exclusive', 'broker', 'agency', 'listing', 'facilitate', 'realtor'
      ],
      security_guard: [
        'security', 'guard', 'patrol', 'site security', 'building security',
        'security officer', 'watch', 'protect', 'surveillance', 'access control'
      ]
    };
    
    this.configPath = config.personaRolesPath || './code/Data/persona-roles.json';
    this.intelligenceConfig = config.intelligenceConfig || {};
  }

  /**
   * Initialize engine - load personas from file
   */
  async initialize() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        data.personas.forEach(p => this.personas.set(p.phone, p));
        logger.info(`✅ Persona Detection Engine initialized with ${data.personas.length} personas`);
      } else {
        logger.warn(`⚠️ Persona file not found at ${this.configPath}, starting fresh`);
      }
    } catch (error) {
      logger.error(`❌ Failed to initialize PersonaDetectionEngine: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect persona from message content
   * @param {Object} msg - WhatsApp message object
   * @param {string} phoneNumber - User's WhatsApp phone number
   * @returns {Object} Detected persona with role and confidence
   */
  async detectPersona(msg, phoneNumber) {
    try {
      const messageBody = msg.body.toLowerCase();
      const scores = {
        buyer: this._scoreKeywords(messageBody, this.detectionKeywords.buyer),
        seller: this._scoreKeywords(messageBody, this.detectionKeywords.seller),
        tenant: this._scoreKeywords(messageBody, this.detectionKeywords.tenant),
        landlord: this._scoreKeywords(messageBody, this.detectionKeywords.landlord),
        agent: this._scoreKeywords(messageBody, this.detectionKeywords.agent),
        security_guard: this._scoreKeywords(messageBody, this.detectionKeywords.security_guard),
      };

      // Find highest scoring role
      const detectedRole = Object.keys(scores).reduce((a, b) => 
        scores[a] > scores[b] ? a : b
      );
      
      const confidence = scores[detectedRole];

      // Check if user already has a persona
      let persona = this.personas.get(phoneNumber);
      
      if (!persona) {
        // Create new persona
        persona = {
          id: `persona-${Date.now()}`,
          phone: phoneNumber,
          name: msg.contact?.name || 'Unknown',
          primaryRole: confidence > 0.5 ? detectedRole : null,
          detectedAt: new Date().toISOString(),
          roles: {}
        };
      }

      // Update role detection
      if (!persona.roles[detectedRole]) {
        persona.roles[detectedRole] = {
          confidence: confidence,
          since: new Date().toISOString(),
          mentions: 0
        };
      } else {
        persona.roles[detectedRole].confidence = 
          (persona.roles[detectedRole].confidence + confidence) / 2;
        persona.roles[detectedRole].mentions += 1;
      }

      // Update primary role if confidence is high
      if (confidence > 0.75) {
        persona.primaryRole = detectedRole;
      }

      // Save updated persona
      this.personas.set(phoneNumber, persona);
      await this._persistPersonas();

      return {
        phone: phoneNumber,
        detectedRole: detectedRole,
        confidence: confidence,
        allRoles: persona.roles,
        persona: persona
      };

    } catch (error) {
      logger.error(`❌ Error detecting persona: ${error.message}`);
      return null;
    }
  }

  /**
   * Manually set persona role
   * @param {string} phoneNumber - User's WhatsApp phone
   * @param {string} role - Role to assign (buyer, seller, tenant, landlord, agent, security_guard)
   * @param {Object} details - Additional details (agency, budget, location, company, etc.)
   */
  async setPersonaRole(phoneNumber, role, details = {}) {
    try {
      let persona = this.personas.get(phoneNumber);
      
      if (!persona) {
        persona = {
          id: `persona-${Date.now()}`,
          phone: phoneNumber,
          name: details.name || 'Unknown',
          primaryRole: role,
          detectedAt: new Date().toISOString(),
          roles: {}
        };
      }

      persona.primaryRole = role;
      persona.roles[role] = {
        confidence: 1.0,
        since: new Date().toISOString(),
        manuallySet: true
      };

      // Add extra details
      if (details.agency) persona.agency = details.agency;
      if (details.commission) persona.commission = details.commission;
      if (details.budget) persona.budget = details.budget;
      if (details.preferences) persona.preferences = details.preferences;
      if (details.location) persona.location = details.location;
      if (details.company) persona.company = details.company;
      if (details.companyId) persona.companyId = details.companyId;

      this.personas.set(phoneNumber, persona);
      await this._persistPersonas();

      logger.info(`✅ Persona set: ${phoneNumber} → ${role}`);
      return persona;

    } catch (error) {
      logger.error(`❌ Error setting persona role: ${error.message}`);
      return null;
    }
  }

  /**
   * Get persona by phone
   */
  getPersona(phoneNumber) {
    return this.personas.get(phoneNumber);
  }

  /**
   * Get all personas
   */
  getAllPersonas() {
    return Array.from(this.personas.values());
  }

  /**
   * Get personas by role
   */
  getPersonasByRole(role) {
    return Array.from(this.personas.values()).filter(p => p.primaryRole === role);
  }

  /**
   * Detect security guard from Google Contacts using SecurityGuardContactMapper
   * @param {string} phoneNumber - WhatsApp phone number
   * @param {Object} googleContacts - Google Contacts data
   * @returns {Promise<Object|null>} Security guard persona or null
   */
  async detectSecurityGuardFromGoogleContacts(phoneNumber, googleContacts) {
    try {
      // Dynamically import SecurityGuardContactMapper if available
      let SecurityGuardContactMapper;
      try {
        const mapperPath = './code/Intelligence/SecurityGuardContactMapper.js';
        if (fs.existsSync(mapperPath)) {
          const mapperModule = await import(mapperPath);
          SecurityGuardContactMapper = mapperModule.default;
        }
      } catch (error) {
        logger.warn(`⚠️ SecurityGuardContactMapper not available: ${error.message}`);
        return null;
      }

      if (!SecurityGuardContactMapper || !googleContacts) {
        return null;
      }

      const mapper = new SecurityGuardContactMapper();
      const securityGuardMatch = mapper.identifySecurityGuardByPhone(phoneNumber, googleContacts);

      if (securityGuardMatch) {
        // Create or update security guard persona
        let persona = this.personas.get(phoneNumber);
        
        if (!persona) {
          persona = {
            id: `persona-${Date.now()}`,
            phone: phoneNumber,
            name: securityGuardMatch.name || 'Unknown',
            primaryRole: 'security_guard',
            detectedAt: new Date().toISOString(),
            roles: {},
            googleContactsSource: true
          };
        } else {
          persona.primaryRole = 'security_guard';
          persona.googleContactsSource = true;
        }

        persona.roles['security_guard'] = {
          confidence: 1.0,
          since: new Date().toISOString(),
          source: 'google_contacts',
          location: securityGuardMatch.location || null,
          company: securityGuardMatch.company || null,
          companyId: securityGuardMatch.companyId || null
        };

        this.personas.set(phoneNumber, persona);
        await this._persistPersonas();

        logger.info(`✅ Security Guard detected from Google Contacts: ${phoneNumber} → ${securityGuardMatch.name}`);
        return persona;
      }

      return null;
    } catch (error) {
      logger.error(`❌ Error detecting security guard from Google Contacts: ${error.message}`);
      return null;
    }
  }

  /**
   * Score keywords in message
   * @private
   */
  _scoreKeywords(message, keywords) {
    let score = 0;
    keywords.forEach(keyword => {
      if (message.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });
    return score > 0 ? Math.min(score / keywords.length, 1.0) : 0;
  }

  /**
   * Persist personas to file
   * @private
   */
  async _persistPersonas() {
    try {
      const data = {
        personas: Array.from(this.personas.values()),
        totalPersonas: this.personas.size,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };

      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`❌ Failed to persist personas: ${error.message}`);
    }
  }
}

export default PersonaDetectionEngine;
