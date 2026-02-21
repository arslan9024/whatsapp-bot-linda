/**
 * PersonService.js
 * PURPOSE: Service layer for Person operations
 * HANDLES: CRUD, deduplication, role tracking
 */

import Person from './PersonSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class PersonService {
  /**
   * Create a new person
   * Includes duplicate check
   */
  static async createPerson(personData) {
    try {
      // Check for duplicates
      const duplicates = await ValidationHelper.checkPersonDuplicates(
        Person,
        personData.firstName,
        personData.lastName,
        personData.mobile
      );

      if (duplicates.hasDuplicates) {
        return {
          success: false,
          error: `Person with similar details already exists (${duplicates.duplicateCount} found)`,
          duplicates: duplicates.duplicates.map(p => ({
            personId: p.personId,
            name: p.fullName,
            email: p.email
          }))
        };
      }

      // Generate personId
      const personId = `PERSON-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create person
      const person = new Person({
        personId,
        firstName: personData.firstName.trim(),
        lastName: personData.lastName.trim(),
        fullName: `${personData.firstName} ${personData.lastName}`,
        mobile: personData.mobile.trim(),
        email: personData.email ? personData.email.toLowerCase().trim() : undefined,
        status: personData.status || 'active',
        source: personData.source || 'direct',
        notes: personData.notes
      });

      await person.save();

      return {
        success: true,
        person: person.toObject(),
        message: `Person created: ${person.fullName}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find person by ID
   */
  static async findById(personId) {
    try {
      const person = await Person.findOne({ personId });
      return {
        success: !!person,
        person: person ? person.toObject() : null,
        error: person ? null : 'Person not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find person by mobile
   */
  static async findByMobile(mobile) {
    try {
      const person = await Person.findByMobile(mobile);
      return {
        success: !!person,
        person: person ? person.toObject() : null,
        error: person ? null : 'Person not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find person by email
   */
  static async findByEmail(email) {
    try {
      const person = await Person.findByEmail(email.toLowerCase());
      return {
        success: !!person,
        person: person ? person.toObject() : null,
        error: person ? null : 'Person not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find person by name
   */
  static async findByName(firstName, lastName) {
    try {
      const person = await Person.findByName(firstName, lastName);
      return {
        success: !!person,
        person: person ? person.toObject() : null,
        error: person ? null : 'Person not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all persons (active)
   */
  static async getActivePeople(limit = 100) {
    try {
      const people = await Person.getActive().limit(limit);
      return {
        success: true,
        count: people.length,
        people: people.map(p => p.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search persons by text
   */
  static async searchPersons(query) {
    try {
      const people = await Person.searchByText(query);
      return {
        success: true,
        count: people.length,
        people: people.map(p => p.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update person
   */
  static async updatePerson(personId, updateData) {
    try {
      const person = await Person.findOne({ personId });
      if (!person) {
        return { success: false, error: 'Person not found' };
      }

      // Update allowed fields
      if (updateData.email) person.email = updateData.email.toLowerCase();
      if (updateData.status) person.status = updateData.status;
      if (updateData.notes) person.notes = updateData.notes;

      await person.save();

      return {
        success: true,
        person: person.toObject(),
        message: 'Person updated successfully'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get person with all roles
   */
  static async getPersonWithRoles(personId) {
    try {
      const result = await QueryHelper.findPersonWithAllRoles(Person, personId);
      if (!result) {
        return { success: false, error: 'Person not found' };
      }

      return {
        success: true,
        personWithRoles: result
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for duplicate persons
   */
  static async findDuplicates() {
    try {
      const duplicates = await Person.findDuplicates();
      return {
        success: true,
        duplicateGroups: duplicates,
        count: duplicates.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark person as inactive
   */
  static async markInactive(personId) {
    try {
      const person = await Person.findOne({ personId });
      if (!person) {
        return { success: false, error: 'Person not found' };
      }

      await person.markInactive();
      return {
        success: true,
        person: person.toObject(),
        message: 'Person marked as inactive'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get statistics
   */
  static async getStatistics() {
    try {
      const [total, active, inactive, archived, bySource] = await Promise.all([
        Person.countDocuments(),
        Person.countDocuments({ status: 'active' }),
        Person.countDocuments({ status: 'inactive' }),
        Person.countDocuments({ status: 'archived' }),
        Person.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      return {
        success: true,
        stats: {
          total,
          active,
          inactive,
          archived,
          bySource: Object.fromEntries(bySource.map(s => [s._id, s.count]))
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default PersonService;
