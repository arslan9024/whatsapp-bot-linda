/**
 * OffPlanHandoverTracker.js
 * 
 * Single responsibility: Track off-plan project construction milestones and anticipated completion quarters.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class OffPlanHandoverTracker {
  constructor() {
    /** @type {Map<string, Object>} */
    this.projects = new Map();
  }

  registerProject(projectName, { developer, completionQuarter = 'Q4 2026', constructionPercent = 0, escrowBank = 'ENBD' } = {}) {
    if (!projectName) throw new Error('projectName is required');
    const project = {
      projectName,
      developer,
      completionQuarter,
      constructionPercent: Math.max(0, Math.min(100, constructionPercent)),
      escrowBank,
      isUnderConstruction: constructionPercent < 100,
      updatedAt: Date.now(),
    };
    this.projects.set(projectName.toLowerCase(), project);
    return project;
  }

  getProject(projectName) {
    if (!projectName) return null;
    return this.projects.get(projectName.toLowerCase()) || null;
  }

  isDelayed(projectName, targetQuarter = 'Q4 2026') {
    const proj = this.getProject(projectName);
    if (!proj) return false;
    return proj.completionQuarter > targetQuarter;
  }
}

export default new OffPlanHandoverTracker();
