import { createSlice } from '@reduxjs/toolkit';
import { fetchDashboardData } from './healthThunks';

const initialState = {
  accounts: {},
  metrics: {
    totalChecks: 0,
    totalRecoveries: 0,
    totalFailures: 0,
    averageResponseTime: 0
  },
  healthStatus: {
    healthy: 0,
    warning: 0,
    unhealthy: 0,
    timestamp: null
  },
  trends: {},
  status: 'idle',
  error: null,
  lastUpdate: null,
  autoRefreshEnabled: true,
  refreshInterval: 10000
};

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    setAutoRefresh: (state, action) => {
      state.autoRefreshEnabled = action.payload;
    },
    setRefreshInterval: (state, action) => {
      state.refreshInterval = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accounts = action.payload.accounts || {};
        state.metrics = action.payload.metrics || {};
        state.healthStatus = action.payload.healthStatus || {};
        state.trends = action.payload.trends || {};
        state.lastUpdate = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { setAutoRefresh, setRefreshInterval, clearError } = healthSlice.actions;
export default healthSlice.reducer;
