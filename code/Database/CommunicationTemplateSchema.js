import mongoose from 'mongoose';

/**
 * CommunicationTemplate Collection
 * PURPOSE: Store reusable message templates for tenant/owner communications
 * COLLECTION: communicationtemplates
 * PHASE: 5 Feature 1 - Advanced Tenant Communication
 * 
 * Supports:
 * - Variable interpolation ({tenantName}, {propertyName}, etc.)
 * - Bilingual templates (English/Arabic)
 * - Category-based organization
 * - Usage tracking & analytics
 * - Approval workflows
 */

const VariableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Variable key used in template, e.g. tenantName'
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    description: 'Human-readable label, e.g. Tenant Name'
  },
  required: {
    type: Boolean,
    default: true
  },
  defaultValue: {
    type: String,
    default: '',
    description: 'Fallback value when variable is not provided'
  },
  example: {
    type: String,
    description: 'Example value for preview, e.g. Ahmed Ali'
  }
}, { _id: false });

const CommunicationTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique template identifier, format: TMPL-YYYYMMDD-XXXXX'
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
      description: 'Template display name'
    },
    category: {
      type: String,
      required: true,
      enum: [
        'greeting',
        'inquiry_response',
        'maintenance',
        'payment_reminder',
        'lease_renewal',
        'issue_escalation',
        'notification',
        'feedback_request',
        'welcome',
        'farewell',
        'emergency',
        'custom'
      ],
      index: true,
      description: 'Template category for organization'
    },
    content: {
      type: String,
      required: true,
      maxlength: 4096,
      description: 'Template body with {variable} placeholders'
    },
    contentArabic: {
      type: String,
      maxlength: 4096,
      description: 'Arabic version of the template'
    },
    variables: {
      type: [VariableSchema],
      default: [],
      description: 'Variables that can be interpolated into the template'
    },
    language: {
      type: String,
      enum: ['en', 'ar', 'both'],
      default: 'en',
      description: 'Primary language of the template'
    },
    tags: {
      type: [String],
      default: [],
      description: 'Tags for quick filtering, e.g. ["urgent", "rent", "damac"]'
    },

    // Approval workflow
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'archived'],
      default: 'draft',
      index: true,
      description: 'Template lifecycle status'
    },
    approvalRequired: {
      type: Boolean,
      default: false,
      description: 'Whether template needs approval before use'
    },
    approvedBy: {
      type: String,
      description: 'PersonId of the approver'
    },
    approvedAt: {
      type: Date,
      description: 'When template was approved'
    },

    // Scheduling config
    scheduling: {
      enabled: { type: Boolean, default: false },
      preferredTime: { type: String, description: 'Preferred send time, e.g. 09:00' },
      timezone: { type: String, default: 'Asia/Dubai' },
      frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly', 'custom'],
        default: 'once'
      }
    },

    // Usage analytics
    usage: {
      totalSent: { type: Number, default: 0, min: 0 },
      totalDelivered: { type: Number, default: 0, min: 0 },
      totalFailed: { type: Number, default: 0, min: 0 },
      lastUsedAt: { type: Date },
      averageDeliveryTime: { type: Number, default: 0, description: 'Average delivery time in ms' }
    },

    // Metadata
    createdBy: {
      type: String,
      required: true,
      description: 'PersonId or system identifier of creator'
    },
    updatedBy: {
      type: String,
      description: 'PersonId of last updater'
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
      description: 'Template version for edit history'
    }
  },
  {
    timestamps: true,
    collection: 'communicationtemplates'
  }
);

// ============================================
// INDEXES
// ============================================
CommunicationTemplateSchema.index({ category: 1, status: 1 });
CommunicationTemplateSchema.index({ tags: 1 });
CommunicationTemplateSchema.index({ createdAt: -1 });
CommunicationTemplateSchema.index({ 'usage.totalSent': -1 });
CommunicationTemplateSchema.index({ name: 'text', content: 'text' });

// ============================================
// VIRTUALS
// ============================================
CommunicationTemplateSchema.virtual('deliveryRate').get(function () {
  if (this.usage.totalSent === 0) return 0;
  return ((this.usage.totalDelivered / this.usage.totalSent) * 100).toFixed(1);
});

CommunicationTemplateSchema.virtual('variableNames').get(function () {
  return this.variables.map(v => v.name);
});

// ============================================
// METHODS
// ============================================

/**
 * Render template with provided variables
 * @param {Object} vars - Key-value pairs for variable replacement
 * @param {string} lang - Language ('en' or 'ar')
 * @returns {string} Rendered message content
 */
CommunicationTemplateSchema.methods.render = function (vars = {}, lang = 'en') {
  let text = lang === 'ar' && this.contentArabic ? this.contentArabic : this.content;

  for (const variable of this.variables) {
    const value = vars[variable.name] || variable.defaultValue || `{${variable.name}}`;
    const pattern = new RegExp(`\\{${variable.name}\\}`, 'g');
    text = text.replace(pattern, value);
  }

  return text;
};

/**
 * Validate that all required variables are provided
 * @param {Object} vars - Variables to check
 * @returns {{ valid: boolean, missing: string[] }}
 */
CommunicationTemplateSchema.methods.validateVariables = function (vars = {}) {
  const missing = this.variables
    .filter(v => v.required && !vars[v.name] && !v.defaultValue)
    .map(v => v.name);

  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Preview template with example values
 * @param {string} lang - Language
 * @returns {string} Preview text
 */
CommunicationTemplateSchema.methods.preview = function (lang = 'en') {
  const exampleVars = {};
  for (const variable of this.variables) {
    exampleVars[variable.name] = variable.example || `[${variable.displayName}]`;
  }
  return this.render(exampleVars, lang);
};

// ============================================
// STATICS
// ============================================

CommunicationTemplateSchema.statics.findByCategory = function (category) {
  return this.find({ category, status: 'active' }).sort({ 'usage.totalSent': -1 });
};

CommunicationTemplateSchema.statics.findActive = function () {
  return this.find({ status: 'active' }).sort({ name: 1 });
};

CommunicationTemplateSchema.statics.findMostUsed = function (limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'usage.totalSent': -1 })
    .limit(limit);
};

CommunicationTemplateSchema.statics.searchTemplates = function (query) {
  return this.find(
    { $text: { $search: query }, status: { $in: ['active', 'draft'] } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

CommunicationTemplateSchema.statics.generateTemplateId = function () {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TMPL-${date}-${random}`;
};

// ============================================
// HOOKS
// ============================================
CommunicationTemplateSchema.pre('save', async function () {
  if (!this.isNew && (this.isModified('content') || this.isModified('contentArabic'))) {
    this.version += 1;
  }
});

// Ensure virtual fields are included in JSON output
CommunicationTemplateSchema.set('toJSON', { virtuals: true });
CommunicationTemplateSchema.set('toObject', { virtuals: true });

const CommunicationTemplate = mongoose.model('CommunicationTemplate', CommunicationTemplateSchema);

export default CommunicationTemplate;
