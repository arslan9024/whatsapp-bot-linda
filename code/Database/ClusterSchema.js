import mongoose from 'mongoose';

/**
 * Cluster Collection
 * PURPOSE: Real estate project/cluster information
 * COLLECTION: clusters
 * NOTE: Each property belongs to a cluster, identified by composite key (clusterId + unitNumber)
 */

const ClusterSchema = new mongoose.Schema(
  {
    clusterId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique cluster identifier'
    },
    clusterName: {
      type: String,
      required: true,
      trim: true,
      max: 200,
      indexed: true,
      description: 'Name of cluster/project'
    },
    location: {
      type: String,
      required: true,
      trim: true,
      max: 200,
      indexed: true,
      description: 'Location/area of cluster'
    },
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Developer',
      sparse: true,
      description: 'Reference to Developer'
    },
    description: {
      type: String,
      optional: true,
      max: 500,
      description: 'Project description'
    },
    totalUnits: {
      type: Number,
      optional: true,
      min: 0,
      description: 'Total units in cluster'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      indexed: true,
      description: 'Cluster status'
    },
    notes: {
      type: String,
      optional: true,
      max: 1000,
      description: 'Additional notes'
    }
  },
  {
    collection: 'clusters',
    timestamps: true
  }
);

// Indexes
ClusterSchema.index({ clusterId: 1 });
ClusterSchema.index({ clusterName: 1 });
ClusterSchema.index({ location: 1 });
ClusterSchema.index({ developerId: 1 });
ClusterSchema.index({ status: 1 });
ClusterSchema.index({ clusterName: 'text', location: 'text', description: 'text' });

/**
 * STATICS
 */

ClusterSchema.statics.findByClusterId = function (clusterId) {
  return this.findOne({ clusterId });
};

ClusterSchema.statics.findByName = function (name) {
  return this.findOne({ clusterName: new RegExp(name, 'i') });
};

ClusterSchema.statics.findByLocation = function (location) {
  return this.find({ location: new RegExp(location, 'i') });
};

ClusterSchema.statics.getActive = function () {
  return this.find({ status: 'active' }).sort({ clusterName: 1 });
};

ClusterSchema.statics.getByDeveloper = function (developerId) {
  return this.find({ developerId }).sort({ clusterName: 1 });
};

/**
 * VIRTUALS
 */

ClusterSchema.virtual('displayName').get(function () {
  return `${this.clusterName} (${this.location})`;
});

ClusterSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

const Cluster = mongoose.model('Cluster', ClusterSchema);

export default Cluster;
