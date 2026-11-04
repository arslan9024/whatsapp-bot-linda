/**
 * @file DefectSnaggingClassifier.js
 * @description Analyzes handover defect reports and vision tags, categorizing issues
 * across MEP, Paint, Joinery, and HVAC with severity scoring for developer snagging lists.
 * Category: Intelligence
 */

export class DefectSnaggingClassifier {
  constructor() {
    this.categoryRules = [
      { category: 'PLUMBING_WATER_LEAK', keywords: ['leak', 'damp', 'moisture', 'drainage', 'water stain'], severity: 'CRITICAL' },
      { category: 'HVAC_COOLING', keywords: ['ac not cooling', 'thermostat', 'chiller', 'air flow', 'condensation'], severity: 'HIGH' },
      { category: 'ELECTRICAL', keywords: ['socket', 'breaker', 'tripping', 'switch', 'wiring'], severity: 'HIGH' },
      { category: 'CIVIL_PAINT_FINISH', keywords: ['paint crack', 'scuff', 'grout', 'uneven tile', 'hairline'], severity: 'LOW' },
      { category: 'JOINERY_DOORS', keywords: ['door alignment', 'cabinet hinge', 'skirting', 'handle loose'], severity: 'MEDIUM' }
    ];
  }

  /**
   * Classifies defect description into category and urgency level
   * @param {string} defectText
   * @returns {{ category: string, severity: string, requiresImmediateDispatch: boolean }}
   */
  classifyDefect(defectText = '') {
    const lower = defectText.toLowerCase();

    for (const rule of this.categoryRules) {
      if (rule.keywords.some(kw => lower.includes(kw))) {
        return {
          category: rule.category,
          severity: rule.severity,
          requiresImmediateDispatch: rule.severity === 'CRITICAL' || rule.severity === 'HIGH'
        };
      }
    }

    return {
      category: 'GENERAL_MAINTENANCE',
      severity: 'MEDIUM',
      requiresImmediateDispatch: false
    };
  }
}

export default new DefectSnaggingClassifier();

