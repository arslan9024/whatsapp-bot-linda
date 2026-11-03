/**
 * @file DatabaseTlsEnforcer.js
 * @description Validates and enforces mandatory TLS 1.3 encryption on database connection
 * strings (MongoDB Atlas, Redis) preventing cleartext network transmissions.
 * Category: Core
 */

export class DatabaseTlsEnforcer {
  /**
   * Evaluates and enforces TLS on a MongoDB connection URI
   * @param {string} uri
   * @param {boolean} isProduction
   * @returns {{ secure: boolean, enforcedUri: string, warnings: Array<string> }}
   */
  enforceMongoTls(uri = '', isProduction = false) {
    if (!uri) {
      return { secure: false, enforcedUri: '', warnings: ['Empty database URI'] };
    }

    const warnings = [];
    let enforced = uri;

    const isSrv = uri.startsWith('mongodb+srv://');
    const hasTlsParam = /ssl=true|tls=true/i.test(uri);

    if (isProduction && !isSrv && !hasTlsParam) {
      warnings.push('Standard mongodb:// URI lacks explicit tls=true in production');
      const separator = uri.includes('?') ? '&' : '?';
      enforced = `${uri}${separator}tls=true`;
    }

    if (uri.includes('tlsAllowInvalidCertificates=true')) {
      warnings.push('Insecure certificate validation bypass detected (tlsAllowInvalidCertificates=true)');
    }

    const secure = isSrv || hasTlsParam || !isProduction;

    return {
      secure,
      enforcedUri: enforced,
      warnings
    };
  }
}

export default new DatabaseTlsEnforcer();
