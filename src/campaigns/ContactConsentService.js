import ContactConsent from '../database/schemas/ContactConsentSchema.js';

function normalizePhone(phoneNumber) {
  return typeof phoneNumber === 'string' ? phoneNumber.replace(/\D/g, '') : '';
}

class ContactConsentService {
  static async getConsent(phoneNumber) {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) return null;
    return ContactConsent.findOne({ phoneNumber: normalized }).lean();
  }

  static async hasConsent(phoneNumber) {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) return false;
    const consent = await ContactConsent.findOne({ phoneNumber: normalized }).lean();
    return consent?.status === 'granted';
  }

  static async setConsent(phoneNumber, { granted, source, evidence, updatedBy } = {}) {
    const normalized = normalizePhone(phoneNumber);
    if (normalized.length < 7 || normalized.length > 15) {
      throw new Error('A valid phone number is required.');
    }
    if (typeof granted !== 'boolean') {
      throw new Error('granted must be a boolean.');
    }
    if (typeof source !== 'string' || !source.trim()) {
      throw new Error('A consent source is required.');
    }
    if (granted && (typeof evidence !== 'string' || !evidence.trim())) {
      throw new Error('Evidence is required when granting messaging consent.');
    }

    return ContactConsent.findOneAndUpdate(
      { phoneNumber: normalized },
      {
        $set: {
          status: granted ? 'granted' : 'revoked',
          source: source.trim().slice(0, 100),
          evidence: typeof evidence === 'string' ? evidence.slice(0, 500) : undefined,
          updatedBy: typeof updatedBy === 'string' ? updatedBy.slice(0, 100) : undefined,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  }
}

export default ContactConsentService;
