/**
 * MongoDB Schemas for DAMAC Hills 2
 * Defines data models for projects, clusters, properties, and pricing
 */

import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// ============================================
// PROJECT SCHEMA
// ============================================
const projectSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  alternateName: String,
  location: {
    emirate: String,
    area: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    nearbyLandmarks: [String],
  },
  developer: {
    name: String,
    founded: Number,
    headquarters: String,
    website: String,
  },
  projectStatus: String,
  launchYear: Number,
  handoverYear: Number,
  projectType: [String],
  totalUnits: Number,
  totalArea: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'projects' });

// ============================================
// CLUSTER SCHEMA
// ============================================
const clusterSchema = new Schema({
  clusterId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  unitCount: Number,
  unitTypes: [String],
  amenities: [String],
  amenitiesDetailed: {
    sports: [String],
    recreation: [String],
    community: [String],
    family: [String],
  },
  layoutCode: String,
  status: {
    type: String,
    enum: ['Available', 'Sold Out', 'Under Construction'],
    default: 'Available'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'clusters' });

// ============================================
// PROPERTY SCHEMA
// ============================================
const propertySchema = new Schema({
  propertyCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  clusterId: {
    type: Schema.Types.ObjectId,
    ref: 'Cluster'
  },
  clusterName: String,
  unitNumber: String,
  propertyType: {
    type: String,
    enum: ['Apartment', 'Townhouse', 'Villa', 'Penthouse'],
    required: true,
    index: true
  },
  bedrooms: {
    type: Number,
    required: true,
    index: true
  },
  bathrooms: Number,
  size: {
    sqft: Number,
    sqm: Number,
  },
  price: {
    aed: {
      type: Number,
      index: true
    },
    usd: Number,
    eur: Number,
  },
  rentalYield: {
    perYear: Number,
    percentage: Number,
  },
  status: {
    type: String,
    enum: ['Available', 'Sold', 'Rented', 'Under Offer', 'Pending'],
    default: 'Available',
    index: true
  },
  features: {
    parking: Number,
    balcony: Boolean,
    garden: Boolean,
    maidRoom: Boolean,
    laundryRoom: Boolean,
    storage: Boolean,
  },
  floor: Number,
  facingDirection: String,
  amenitiesAccess: [String],
  handoverYear: Number,
  paymentPlan: {
    downPayment: Number,
    installments: Number,
    installmentAmount: Number,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastModified: Date,
}, { collection: 'properties' });

// ============================================
// AMENITY SCHEMA
// ============================================
const amenitySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  category: {
    type: String,
    enum: ['Sports', 'Recreation', 'Community', 'Family', 'Wellness', 'Retail', 'Dining'],
    index: true
  },
  description: String,
  location: {
    cluster: String,
    community: Boolean, // true if community-wide
  },
  availableAt: [String], // cluster IDs where this amenity exists
  createdAt: { type: Date, default: Date.now },
}, { collection: 'amenities' });

// ============================================
// PRICING SCHEMA
// ============================================
const pricingSchema = new Schema({
  bedroomType: {
    type: String,
    required: true,
    index: true
  },
  propertyType: {
    type: String,
    enum: ['Apartment', 'Townhouse', 'Villa'],
    index: true
  },
  avgPrice: {
    aed: Number,
    usd: Number,
  },
  avgSize: {
    sqft: Number,
    sqm: Number,
  },
  minPrice: {
    aed: Number,
    usd: Number,
  },
  maxPrice: {
    aed: Number,
    usd: Number,
  },
  count: Number,
  rentalRange: {
    min: Number,
    max: Number,
    currency: String,
    period: String,
  },
  rentalYield: Number,
  pricePerSqft: {
    aed: Number,
    usd: Number,
  },
  trend: String,
  historicalData: [{
    year: Number,
    avgPrice: Number,
    minPrice: Number,
    maxPrice: Number,
  }],
  lastUpdated: { type: Date, default: Date.now },
}, { collection: 'pricing' });

// ============================================
// LOCATION/FACILITY SCHEMA
// ============================================
const locationSchema = new Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['School', 'Hospital', 'Shopping', 'Recreation', 'Restaurant', 'Transport'],
    index: true
  },
  distance: {
    km: Number,
    minutes: Number, // drive time
  },
  address: String,
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
  phone: String,
  website: String,
  type: String,
  rating: {
    type: Number,
    min: 0,
    max: 5,
  },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'locations' });

// ============================================
// SYNC LOG SCHEMA
// ============================================
const syncLogSchema = new Schema({
  syncDate: { type: Date, default: Date.now, index: true },
  syncType: {
    type: String,
    enum: ['FULL', 'PARTIAL', 'UPDATE'],
    default: 'FULL'
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PARTIAL'],
    default: 'SUCCESS'
  },
  recordsProcessed: Number,
  recordsCreated: Number,
  recordsUpdated: Number,
  recordsFailed: Number,
  errors: [{
    record: String,
    error: String,
    timestamp: Date,
  }],
  sourceFile: String,
  duration: Number, // milliseconds
  notes: String,
}, { collection: 'sync_logs' });

// ============================================
// CREATE MODELS
// ============================================
// CONTACT REFERENCE SCHEMA (Lightweight Phone Registry)
// ============================================
const contactReferenceSchema = new Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  countryCode: {
    type: String,
    default: '971', // UAE default
  },
  formattedPhone: {
    type: String, // +971 50 123 4567 format
    index: true,
  },
  googleContactId: {
    type: String, // Link to Google Contacts resource
    default: null,
    index: true,
  },
  syncedToGoogle: {
    type: Boolean,
    default: false,
    index: true,
  },
  lastSyncedAt: {
    type: Date,
    default: null,
  },
  source: {
    type: String, // e.g., 'whatsapp_message', 'manual_import', 'sheet_import'
    default: 'whatsapp_message',
  },
  name: {
    type: String, // Optional: cached name from Google
    default: null,
  },
  email: {
    type: String, // Optional: cached email from Google
    default: null,
  },
  interactionCount: {
    type: Number,
    default: 0,
  },
  lastInteractionAt: {
    type: Date,
    default: null,
  },
  metadata: {
    importedFrom: String, // Sheet name, bot name, etc.
    notes: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'contact_references' });

// ============================================
// MODEL DEFINITIONS
// ============================================
const Project = mongoose.model('Project', projectSchema);
const Cluster = mongoose.model('Cluster', clusterSchema);
const Property = mongoose.model('Property', propertySchema);
const Amenity = mongoose.model('Amenity', amenitySchema);
const Pricing = mongoose.model('Pricing', pricingSchema);
const Location = mongoose.model('Location', locationSchema);
const SyncLog = mongoose.model('SyncLog', syncLogSchema);
const ContactReference = mongoose.model('ContactReference', contactReferenceSchema);

// ============================================
// CREATE INDEXES
// ============================================
async function createIndexes() {
  try {
    // Compound indexes for common queries
    await Property.collection.createIndex({ clusterId: 1, propertyType: 1, bedrooms: 1 });
    await Property.collection.createIndex({ 'price.aed': 1, status: 1 });
    await Cluster.collection.createIndex({ projectId: 1, name: 1 });
    
    // Contact reference indexes
    await ContactReference.collection.createIndex({ phoneNumber: 1 }, { unique: true });
    await ContactReference.collection.createIndex({ googleContactId: 1 });
    await ContactReference.collection.createIndex({ syncedToGoogle: 1, createdAt: -1 });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
}

export {
  Project,
  Cluster,
  Property,
  Amenity,
  Pricing,
  Location,
  SyncLog,
  ContactReference,
  createIndexes,
};

export const schemas = {
  projectSchema,
  clusterSchema,
  propertySchema,
  amenitySchema,
  pricingSchema,
  locationSchema,
  syncLogSchema,
  contactReferenceSchema,
};
