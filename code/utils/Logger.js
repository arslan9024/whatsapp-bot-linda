/**
 * Simple Logger Utility
 * Provides colored console logging for different log levels
 */

class Logger {
  constructor(name = 'App') {
    this.name = name;
  }

  info(message) {
    console.log(`[${this.name}] ℹ️  ${message}`);
  }

  success(message) {
    console.log(`[${this.name}] ✅ ${message}`);
  }

  warn(message) {
    console.log(`[${this.name}] ⚠️  ${message}`);
  }

  error(message) {
    console.error(`[${this.name}] ❌ ${message}`);
  }

  debug(message) {
    console.log(`[${this.name}] 🐛 ${message}`);
  }
}

export { Logger };
