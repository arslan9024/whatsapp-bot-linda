// Account data selectors
export const selectAllAccounts = (state) => state.health.accounts || {};

export const selectAccountList = (state) => 
  Object.entries(state.health.accounts || {}).map(([phone, data]) => ({
    phoneNumber: phone,
    ...data
  }));

export const selectHealthyAccounts = (state) =>
  Object.entries(state.health.accounts || {})
    .filter(([, data]) => data.status === 'HEALTHY')
    .map(([phone, data]) => ({ phoneNumber: phone, ...data }));

export const selectUnhealthyAccounts = (state) =>
  Object.entries(state.health.accounts || {})
    .filter(([, data]) => data.status === 'UNHEALTHY')
    .map(([phone, data]) => ({ phoneNumber: phone, ...data }));

// Metrics selectors
export const selectMetrics = (state) => state.health.metrics || {};

export const selectHealthStatus = (state) => state.health.healthStatus || {
  healthy: 0,
  warning: 0,
  unhealthy: 0
};

// Trends selector
export const selectTrends = (state) => state.health.trends || {};

export const selectAccountTrends = (phoneNumber) => (state) =>
  state.health.trends?.[phoneNumber] || [];

// Status selectors
export const selectHealthLoading = (state) => state.health.status === 'loading';

export const selectHealthError = (state) => state.health.error;

export const selectLastUpdate = (state) => state.health.lastUpdate;

export const selectAutoRefresh = (state) => state.health.autoRefreshEnabled;

export const selectRefreshInterval = (state) => state.health.refreshInterval;
