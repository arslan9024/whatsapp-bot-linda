/**
 * @file DockerContainerConfigValidator.js
 * @description Validates Dockerfile and container runtime arguments for headless Chromium
 * execution, verifying mandatory security flags (--no-sandbox, --disable-dev-shm-usage).
 * Category: Dev-ops / Tools
 */

export class DockerContainerConfigValidator {
  constructor() {
    this.requiredChromiumFlags = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ];
  }

  /**
   * Validates Puppeteer launch arguments for containerized Linux
   * @param {Array<string>} args
   * @returns {{ valid: boolean, missingFlags: Array<string> }}
   */
  validateLaunchArgs(args = []) {
    const missing = [];
    for (const flag of this.requiredChromiumFlags) {
      if (!args.includes(flag)) {
        missing.push(flag);
      }
    }

    return {
      valid: missing.length === 0,
      missingFlags: missing
    };
  }
}

export default new DockerContainerConfigValidator();
