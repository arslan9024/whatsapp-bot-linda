import mongoose from 'mongoose';

const contactConsentSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  status: { type: String, enum: ['granted', 'revoked'], required: true },
  source: { type: String, required: true, maxlength: 100 },
  evidence: { type: String, maxlength: 500 },
  updatedBy: { type: String, maxlength: 100 },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'contact_consents', timestamps: true });

export default mongoose.models.ContactConsent ||
  mongoose.model('ContactConsent', contactConsentSchema);
