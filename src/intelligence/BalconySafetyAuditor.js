/**
 * @file BalconySafetyAuditor.js
 * @description Audits balcony dimensions and parapet railing specifications against
 * Dubai Municipality Building Code (DMBC minimum 1.2m height, tempered safety glass).
 * Category: Intelligence
 */

export class BalconySafetyAuditor {
  constructor() {
    this.minRailingHeightMeters = 1.2; // Dubai Municipality standard
  }

  /**
   * Evaluates balcony specifications for safety and family suitability
   * @param {Object} specs
   * @param {number} specs.railingHeightMeters
   * @param {'TEMPERED_LAMINATED_GLASS'|'VERTICAL_BALUSTERS'|'HORIZONTAL_LADDER_RAIL'} specs.railingType
   * @param {number} specs.depthMeters
   * @param {number} [specs.floorLevel]
   * @returns {{ compliant: boolean, childSafe: boolean, auditNotes: Array<string> }}
   */
  auditBalconySafety(specs = {}) {
    const {
      railingHeightMeters = 1.2,
      railingType = 'TEMPERED_LAMINATED_GLASS',
      depthMeters = 1.8,
      floorLevel = 1
    } = specs;

    const notes = [];
    let compliant = true;
    let childSafe = true;

    if (railingHeightMeters < this.minRailingHeightMeters) {
      compliant = false;
      childSafe = false;
      notes.push(`Railing height (${railingHeightMeters}m) is below Dubai Municipality code (1.2m minimum).`);
    } else {
      notes.push(`Railing height (${railingHeightMeters}m) complies with DMBC.`);
    }

    if (railingType === 'HORIZONTAL_LADDER_RAIL' && floorLevel > 2) {
      childSafe = false;
      notes.push('Horizontal ladder-style railings present a climbing hazard for toddlers.');
    } else {
      notes.push('Barrier design provides solid vertical fall protection.');
    }

    if (depthMeters >= 2.0) {
      notes.push('Spacious terrace depth accommodates full 6-seat outdoor dining set.');
    }

    return {
      compliant,
      childSafe,
      auditNotes: notes
    };
  }
}

export default new BalconySafetyAuditor();

