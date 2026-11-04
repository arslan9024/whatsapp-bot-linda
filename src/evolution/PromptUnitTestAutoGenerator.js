/**
 * @file PromptUnitTestAutoGenerator.js
 * @description Generates standardized Jest unit test fixtures automatically whenever a broker modifies an active prompt template, enforcing non-regression gates.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class PromptUnitTestAutoGenerator {
  /**
   * Generates Jest test specification string for a given prompt template.
   * @param {Object} template
   * @param {string} template.templateId
   * @param {string} template.rawPrompt
   * @param {Array<string>} template.requiredOutputTokens
   * @returns {string} Jest test code snippet
   */
  generateJestTestFixture(template) {
    const assertions = template.requiredOutputTokens.map(t =>
      `    expect(result).toContain('${t}');`
    ).join('\n');

    return [
      `// Auto-generated prompt regression test for ${template.templateId}`,
      `describe('Prompt Regression: ${template.templateId}', () => {`,
      `  it('should satisfy statutory output token requirements', () => {`,
      `    const result = executePrompt('${template.templateId}', { client: 'Test' });`,
      assertions,
      `  });`,
      `});`
    ].join('\n');
  }
}

export default new PromptUnitTestAutoGenerator();
