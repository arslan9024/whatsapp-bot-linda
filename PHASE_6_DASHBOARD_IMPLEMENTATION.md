# 🚀 PHASE 6: HEALTH DASHBOARD IMPLEMENTATION GUIDE

**Phase:** 6 - Health Monitoring Dashboard  
**Start Date:** February 9, 2026  
**Estimated Duration:** 5-7 days  
**Status:** Ready to implement  
**Objective:** Build production-ready React dashboard for real-time health monitoring

---

## 📋 DELIVERY OVERVIEW

### What You'll Build
```
✅ Health Dashboard - Real-time monitoring UI
✅ Backend API Endpoints - 5 new REST endpoints
✅ Redux Integration - Global health state management
✅ Real-time Updates - Auto-refresh health data
✅ Responsive Design - Works on desktop/tablet/mobile
✅ Professional Charts - Uptime trends visualization
✅ Complete Test Suite - All components tested
```

### Files You'll Create/Modify
```
BACKEND (Express API)
├─ routes/health.js (NEW - 150 lines)
└─ middleware/healthMiddleware.js (NEW - 50 lines)

FRONTEND (React)
├─ components/
│  ├─ HealthDashboard.jsx (NEW - 200 lines)
│  ├─ HealthSummary.jsx (NEW - 100 lines)
│  ├─ AccountStatusCard.jsx (NEW - 120 lines)
│  ├─ HealthTrends.jsx (NEW - 150 lines)
│  ├─ MetricsPanel.jsx (NEW - 100 lines)
│  └─ HealthAlerts.jsx (NEW - 100 lines)
├─ pages/
│  └─ HealthPage.jsx (NEW - 50 lines)
├─ redux/
│  ├─ healthSlice.js (NEW - 100 lines)
│  ├─ healthThunks.js (NEW - 80 lines)
│  └─ selectors/healthSelectors.js (NEW - 40 lines)
└─ styles/
   └─ dashboard.module.css (NEW - 200 lines)

CONFIGURATION
├─ package.json (UPDATE - add chart library)
└─ API_DASHBOARD.md (NEW - 300 lines)

TESTS
├─ __tests__/
│  └─ healthDashboard.spec.js (NEW - 200 lines)

```

### Total Code Delivery
```
Backend API:        ~200 lines
Frontend UI:        ~820 lines
Redux State:        ~220 lines
Styles:            ~200 lines
Tests:             ~200 lines
Documentation:     ~300 lines
━━━━━━━━━━━━━━━━━━━━━
TOTAL:            ~1,940 lines
```

---

## 🎯 PHASE 6 TIMELINE

```
Day 1:  Backend API setup + endpoints
Day 2:  Redux state management + thunks
Day 3:  Core dashboard components
Day 4:  Charts + styling + responsive design
Day 5:  Testing + edge cases
Day 6-7: Polish + documentation + deployment
```

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                   REACT FRONTEND                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────────────────────────────────────────┐│
│ │ HealthDashboard (Main Container)                     ││
│ │  ├──HealthSummary (Top Stats)                        ││
│ │  │  └─ Healthy/Warning/Unhealthy counts              ││
│ │  ├──AccountStatusGrid (All Accounts)                 ││
│ │  │  └─ AccountStatusCard × N                         ││
│ │  │     └─ Status, Uptime%, Response time             ││
│ │  ├──HealthTrends (Charts)                            ││
│ │  │  └─ Uptime trend over time                        ││
│ │  ├──MetricsPanel (System Metrics)                    ││
│ │  │  └─ Total checks, Recoveries, Avg response       ││
│ │  └──HealthAlerts (Recent Issues)                     ││
│ │     └─ List of unhealthy accounts                    ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ Redux Store:                                            │
│  healthSlice                                            │
│   ├─ accounts: { ... }                                  │
│   ├─ metrics: { ... }                                   │
│   ├─ status: 'idle' | 'loading' | 'succeeded' | 'failed'│
│   ├─ error: string | null                              │
│   └─ lastUpdate: timestamp                              │
└─────────────────────────────────────────────────────────┘
                          │
                        API
                          │
        ┌─────────────────┴────────────────┐
        │      EXPRESS BACKEND             │
        ├─────────────────┬────────────────┤
        │                 │                │
        ▼                 ▼                ▼
    GET /api/          GET /api/          GET /api/
    health/            health/:phone       health/
    status             details             metrics
```

---

## 📝 STEP-BY-STEP IMPLEMENTATION

### STEP 1: Install Dependencies

```bash
cd c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda

# Install charting library (Recharts - React friendly)
npm install recharts

# Install HTTP client (should already have axios)
npm install axios --save

# Install date utilities
npm install date-fns
```

Expected time: **5 minutes**

---

### STEP 2: Create Backend API Endpoints

Create new file: `routes/health.js`

```javascript
import express from 'express';
import AccountHealthMonitor from '../code/utils/AccountHealthMonitor.js';

const router = express.Router();

// Reference to the global health monitor
let healthMonitor;

export const setHealthMonitor = (monitor) => {
  healthMonitor = monitor;
};

/**
 * GET /api/health/status
 * Get health status for all accounts
 */
router.get('/status', async (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({
        error: 'Health monitor not initialized',
        status: 'unavailable'
      });
    }

    // Run health check
    await healthMonitor.checkHealth();

    // Get current health for all accounts
    const health = await healthMonitor.checkHealth();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
      accountCount: Object.keys(health).length
    });
  } catch (error) {
    console.error('❌ Error in GET /api/health/status:', error);
    res.status(500).json({
      error: error.message,
      status: 'failed'
    });
  }
});

/**
 * GET /api/health/:phoneNumber
 * Get health details for specific account
 */
router.get('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const health = await healthMonitor.getHealth(phoneNumber);

    if (!health) {
      return res.status(404).json({
        error: `Account ${phoneNumber} not found or not registered`
      });
    }

    res.json({
      success: true,
      phoneNumber,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error in GET /api/health/${req.params.phoneNumber}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/metrics/system
 * Get system-wide metrics
 */
router.get('/metrics/system', (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const metrics = healthMonitor.getMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/health/metrics/system:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/trends/:phoneNumber
 * Get historical trend data for account
 */
router.get('/trends/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const trends = healthMonitor.getTrend(phoneNumber);

    if (!trends) {
      return res.status(404).json({
        error: `No trend data available for ${phoneNumber}`
      });
    }

    res.json({
      success: true,
      phoneNumber,
      data: trends,
      count: trends.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error in GET /api/health/trends/${req.params.phoneNumber}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/dashboard
 * Get complete dashboard data (all accounts + metrics + trends)
 */
router.get('/dashboard/all', (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const dashboardData = healthMonitor.getDashboardData();

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/health/dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Expected time:** 30 minutes

---

### STEP 3: Integrate Health Routes into Express App

Update your main `server.js` or `index.js` to include the health routes:

```javascript
// At the top with other imports
import healthRoutes, { setHealthMonitor } from './routes/health.js';

// In your Express app setup
app.use('/api/health', healthRoutes);

// After health monitor is created in index.js
setTimeout(() => {
  setHealthMonitor(healthMonitor); // Pass the global monitor instance
}, 1000);
```

**Expected time:** 10 minutes

---

### STEP 4: Create Redux State Slice

Create new file: `frontend/redux/healthSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit';
import { fetchHealthStatus, fetchDashboardData } from './healthThunks';

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
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  lastUpdate: null,
  autoRefreshEnabled: true,
  refreshInterval: 10000 // 10 seconds
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
      // Fetch dashboard data
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
```

**Expected time:** 20 minutes

---

### STEP 5: Create Redux Thunks

Create new file: `frontend/redux/healthThunks.js`

```javascript
import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Fetch dashboard data (all accounts + metrics + trends)
 */
export const fetchDashboardData = createAsyncThunk(
  'health/fetchDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/health/dashboard/all`);
      
      if (!response.data.success) {
        return rejectWithValue('Failed to fetch dashboard data');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

/**
 * Fetch health status for all accounts
 */
export const fetchHealthStatus = createAsyncThunk(
  'health/fetchHealthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/health/status`);

      if (!response.data.success) {
        return rejectWithValue('Failed to fetch health status');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching health status:', error);
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

/**
 * Fetch health for specific account
 */
export const fetchAccountHealth = createAsyncThunk(
  'health/fetchAccountHealth',
  async (phoneNumber, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/health/${phoneNumber}`);

      if (!response.data.success) {
        return rejectWithValue(`Failed to fetch health for ${phoneNumber}`);
      }

      return response.data.data;
    } catch (error) {
      console.error(`Error fetching health for ${phoneNumber}:`, error);
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

/**
 * Fetch metrics
 */
export const fetchMetrics = createAsyncThunk(
  'health/fetchMetrics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/health/metrics/system`);

      if (!response.data.success) {
        return rejectWithValue('Failed to fetch metrics');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

/**
 * Fetch trends for specific account
 */
export const fetchAccountTrends = createAsyncThunk(
  'health/fetchAccountTrends',
  async (phoneNumber, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/health/trends/${phoneNumber}`);

      if (!response.data.success) {
        return rejectWithValue(`Failed to fetch trends for ${phoneNumber}`);
      }

      return response.data.data;
    } catch (error) {
      console.error(`Error fetching trends for ${phoneNumber}:`, error);
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);
```

**Expected time:** 20 minutes

---

### STEP 6: Create Redux Selectors

Create new file: `frontend/redux/selectors/healthSelectors.js`

```javascript
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
```

**Expected time:** 15 minutes

---

### STEP 7: Create Dashboard Components

#### 7A: HealthSummary Component

Create: `frontend/components/HealthSummary.jsx`

```javascript
import React from 'react';
import { useSelector } from 'react-redux';
import { selectHealthStatus } from '../redux/selectors/healthSelectors';
import styles from '../styles/dashboard.module.css';

export default function HealthSummary() {
  const healthStatus = useSelector(selectHealthStatus);
  
  const total = (healthStatus.healthy || 0) + (healthStatus.warning || 0) + (healthStatus.unhealthy || 0);
  const healthyPercent = total > 0 ? ((healthStatus.healthy / total) * 100).toFixed(1) : 0;

  return (
    <div className={styles.summary}>
      <h1>🏥 Health Monitoring Dashboard</h1>
      
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>✅</div>
          <div className={styles.cardLabel}>Healthy</div>
          <div className={styles.cardValue}>{healthStatus.healthy || 0}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>⚠️</div>
          <div className={styles.cardLabel}>Warning</div>
          <div className={styles.cardValue}>{healthStatus.warning || 0}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>❌</div>
          <div className={styles.cardLabel}>Unhealthy</div>
          <div className={styles.cardValue}>{healthStatus.unhealthy || 0}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>📊</div>
          <div className={styles.cardLabel}>Healthy %</div>
          <div className={styles.cardValue}>{healthyPercent}%</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>📈</div>
          <div className={styles.cardLabel}>Total Accounts</div>
          <div className={styles.cardValue}>{total}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardIcon}>⏱️</div>
          <div className={styles.cardLabel}>Last Update</div>
          <div className={styles.cardValue}>
            {healthStatus.timestamp ? new Date(healthStatus.timestamp).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Expected time:** 15 minutes

---

#### 7B: AccountStatusCard Component

Create: `frontend/components/AccountStatusCard.jsx`

```javascript
import React from 'react';
import styles from '../styles/dashboard.module.css';

export default function AccountStatusCard({ account }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'HEALTHY': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'UNHEALTHY': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusEmoji = (status) => {
    switch(status) {
      case 'HEALTHY': return '✅';
      case 'WARNING': return '⚠️';
      case 'UNHEALTHY': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className={styles.accountCard} style={{
      borderLeftColor: getStatusColor(account.status)
    }}>
      <div className={styles.cardHeader}>
        <span className={styles.phone}>
          {account.phoneNumber.slice(-6)}
        </span>
        <span className={styles.statusBadge} style={{
          backgroundColor: getStatusColor(account.status),
          color: 'white'
        }}>
          {getStatusEmoji(account.status)} {account.status}
        </span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.metric}>
          <span className={styles.label}>Uptime:</span>
          <span className={styles.value}>{(account.uptime || 0).toFixed(1)}%</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>Response:</span>
          <span className={styles.value}>{account.responseTime || 0}ms</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>Failures:</span>
          <span className={styles.value}>{account.consecutiveFailures || 0}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.label}>Recoveries:</span>
          <span className={styles.value}>{account.recoveryAttempts || 0}</span>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <small>Last check: {new Date(account.lastHealthCheck).toLocaleTimeString()}</small>
      </div>
    </div>
  );
}
```

**Expected time:** 20 minutes

---

#### 7C: HealthTrends Component

Create: `frontend/components/HealthTrends.jsx`

```javascript
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSelector } from 'react-redux';
import { selectTrends } from '../redux/selectors/healthSelectors';
import styles from '../styles/dashboard.module.css';

export default function HealthTrends({ phoneNumber }) {
  const allTrends = useSelector(selectTrends);
  const trends = allTrends[phoneNumber] || [];

  if (trends.length === 0) {
    return (
      <div className={styles.trendsContainer}>
        <h3>📈 Uptime Trend</h3>
        <div className={styles.noData}>No trend data available</div>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = trends.slice(-20).map((point, idx) => ({
    time: idx,
    uptime: point.uptime || 0,
    responseTime: point.responseTime || 0
  }));

  return (
    <div className={styles.trendsContainer}>
      <h3>📈 Uptime Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="uptime" 
            stroke="#10b981" 
            dot={false}
            name="Uptime %"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="responseTime" 
            stroke="#3b82f6" 
            dot={false}
            name="Response (ms)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Expected time:** 20 minutes

---

#### 7D: MetricsPanel Component

Create: `frontend/components/MetricsPanel.jsx`

```javascript
import React from 'react';
import { useSelector } from 'react-redux';
import { selectMetrics } from '../redux/selectors/healthSelectors';
import styles from '../styles/dashboard.module.css';

export default function MetricsPanel() {
  const metrics = useSelector(selectMetrics);

  return (
    <div className={styles.metricsPanel}>
      <h3>📊 System Metrics</h3>
      
      <div className={styles.metricsGrid}>
        <div className={styles.metricBox}>
          <div className={styles.metricIcon}>🔍</div>
          <div className={styles.metricLabel}>Total Checks</div>
          <div className={styles.metricNumber}>{metrics.totalChecks || 0}</div>
        </div>

        <div className={styles.metricBox}>
          <div className={styles.metricIcon}>🔄</div>
          <div className={styles.metricLabel}>Total Recoveries</div>
          <div className={styles.metricNumber}>{metrics.totalRecoveries || 0}</div>
        </div>

        <div className={styles.metricBox}>
          <div className={styles.metricIcon}>❌</div>
          <div className={styles.metricLabel}>Total Failures</div>
          <div className={styles.metricNumber}>{metrics.totalFailures || 0}</div>
        </div>

        <div className={styles.metricBox}>
          <div className={styles.metricIcon}>⏱️</div>
          <div className={styles.metricLabel}>Avg Response</div>
          <div className={styles.metricNumber}>{(metrics.averageResponseTime || 0).toFixed(0)}ms</div>
        </div>
      </div>
    </div>
  );
}
```

**Expected time:** 15 minutes

---

#### 7E: Main HealthDashboard Component

Create: `frontend/components/HealthDashboard.jsx`

```javascript
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardData } from '../redux/healthThunks';
import { selectAccountList, selectHealthLoading, selectAutoRefresh, selectRefreshInterval } from '../redux/selectors/healthSelectors';
import HealthSummary from './HealthSummary';
import AccountStatusCard from './AccountStatusCard';
import HealthTrends from './HealthTrends';
import MetricsPanel from './MetricsPanel';
import styles from '../styles/dashboard.module.css';

export default function HealthDashboard() {
  const dispatch = useDispatch();
  const accounts = useSelector(selectAccountList);
  const loading = useSelector(selectHealthLoading);
  const autoRefresh = useSelector(selectAutoRefresh);
  const refreshInterval = useSelector(selectRefreshInterval);

  // Initial fetch
  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      dispatch(fetchDashboardData());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [dispatch, autoRefresh, refreshInterval]);

  return (
    <div className={styles.dashboard}>
      {loading && <div className={styles.loadingOverlay}>Loading...</div>}
      
      <HealthSummary />
      
      <div className={styles.mainGrid}>
        <section className={styles.accountsSection}>
          <h2>📱 Account Status</h2>
          <div className={styles.accountsGrid}>
            {accounts.map((account) => (
              <AccountStatusCard key={account.phoneNumber} account={account} />
            ))}
          </div>
        </section>

        <aside className={styles.sidebar}>
          <MetricsPanel />
          {accounts.length > 0 && <HealthTrends phoneNumber={accounts[0].phoneNumber} />}
        </aside>
      </div>
    </div>
  );
}
```

**Expected time:** 20 minutes

---

### STEP 8: Create Dashboard Styles

Create: `frontend/styles/dashboard.module.css`

```css
/* Dashboard Container */
.dashboard {
  padding: 20px;
  background-color: #f3f4f6;
  min-height: 100vh;
  position: relative;
}

.loadingOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  z-index: 1000;
}

/* Summary Section */
.summary {
  margin-bottom: 30px;
}

.summary h1 {
  margin: 0 0 20px 0;
  color: #111827;
  font-size: 28px;
}

.summaryGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.summaryCard {
  background: white;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.summaryCard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.cardIcon {
  font-size: 32px;
  margin-bottom: 10px;
}

.cardLabel {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.cardValue {
  color: #111827;
  font-size: 24px;
  font-weight: 700;
}

/* Main Grid */
.mainGrid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
}

@media (max-width: 1200px) {
  .mainGrid {
    grid-template-columns: 1fr;
  }
}

/* Accounts Section */
.accountsSection {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.accountsSection h2 {
  margin: 0 0 15px 0;
  color: #111827;
  font-size: 18px;
}

.accountsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

/* Account Card */
.accountCard {
  background: white;
  border-left: 5px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.accountCard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.phone {
  font-family: monospace;
  font-weight: 600;
  color: #111827;
}

.statusBadge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.cardBody {
  margin-bottom: 12px;
}

.metric {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  font-size: 13px;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

.value {
  color: #111827;
  font-weight: 600;
}

.cardFooter {
  color: #9ca3af;
  font-size: 11px;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Metrics Panel */
.metricsPanel {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metricsPanel h3 {
  margin: 0 0 15px 0;
  color: #111827;
  font-size: 16px;
}

.metricsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metricBox {
  background: linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.metricIcon {
  font-size: 20px;
  margin-bottom: 6px;
}

.metricLabel {
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.metricNumber {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

/* Trends Container */
.trendsContainer {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.trendsContainer h3 {
  margin: 0 0 15px 0;
  color: #111827;
  font-size: 16px;
}

.noData {
  text-align: center;
  color: #9ca3af;
  padding: 30px 0;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard {
    padding: 10px;
  }

  .summaryGrid {
    grid-template-columns: repeat(2, 1fr);
  }

  .accountsGrid {
    grid-template-columns: 1fr;
  }

  .metricsGrid {
    grid-template-columns: 1fr;
  }
}
```

**Expected time:** 20 minutes

---

### STEP 9: Create Redux Store Setup

Update your Redux store to include the health slice:

```javascript
// In your store configuration (e.g., store.js or store/index.js)

import { configureStore } from '@reduxjs/toolkit';
import healthReducer from './healthSlice';
// ... other reducers

export const store = configureStore({
  reducer: {
    health: healthReducer,
    // ... other reducers
  }
});
```

**Expected time:** 10 minutes

---

### STEP 10: Add Dashboard Page Route

Create: `frontend/pages/HealthPage.jsx`

```javascript
import React from 'react';
import HealthDashboard from '../components/HealthDashboard';

export default function HealthPage() {
  return (
    <div>
      <HealthDashboard />
    </div>
  );
}
```

Add to your router:
```javascript
import HealthPage from './pages/HealthPage';

<Route path="/health" element={<HealthPage />} />
// or
<Route path="/dashboard/health" element={<HealthPage />} />
```

**Expected time:** 10 minutes

---

## ✅ TESTING CHECKLIST

After implementation, verify:

### Backend API Tests
```
✅ GET /api/health/status - Returns all account statuses
✅ GET /api/health/:phone - Returns specific account health
✅ GET /api/health/metrics/system - Returns system metrics
✅ GET /api/health/trends/:phone - Returns trend data
✅ GET /api/health/dashboard/all - Returns complete dashboard data
✅ All endpoints return proper error messages for missing data
✅ All endpoints handle disconnected health monitor gracefully
```

### Frontend UI Tests
```
✅ HealthSummary displays correct statistics
✅ AccountStatusCard shows all account information
✅ Cards color-code properly (green=healthy, yellow=warning, red=unhealthy)
✅ MetricsPanel displays all metrics
✅ HealthTrends chart renders without errors
✅ Dashboard auto-refreshes every 10 seconds
✅ Loading spinner shows during data fetch
✅ Dashboard is responsive on mobile
✅ No console errors or warnings
```

### Integration Tests
```
✅ Health data updates in real-time
✅ New accounts appear automatically
✅ Status changes are reflected immediately
✅ Trend data accumulates over time
✅ Metrics update as health checks run
✅ Auto-refresh can be toggled on/off
✅ Refresh interval is configurable
```

---

## 🎯 ESTIMATED EFFORT BREAKDOWN

| Task | Time | Total |
|------|------|-------|
| Backend API setup | 1 hour | 1 |
| Redux state management | 1 hour | 2 |
| Dashboard components | 2 hours | 4 |
| Styling & responsive | 1 hour | 5 |
| Testing | 1 hour | 6 |
| Documentation | 1 hour | 7 |

**Total: 7 hours (1 day) for complete implementation**

Days 2-3 can focus on:
- Refinement and polish
- Edge case handling
- Performance optimization
- Advanced features (export, filtering, etc.)

---

## 📦 FILES SUMMARY

```
CREATED:
✅ routes/health.js (~150 lines)
✅ frontend/components/HealthDashboard.jsx (~200 lines)
✅ frontend/components/HealthSummary.jsx (~100 lines)
✅ frontend/components/AccountStatusCard.jsx (~120 lines)
✅ frontend/components/HealthTrends.jsx (~150 lines)
✅ frontend/components/MetricsPanel.jsx (~100 lines)
✅ frontend/redux/healthSlice.js (~100 lines)
✅ frontend/redux/healthThunks.js (~80 lines)
✅ frontend/redux/selectors/healthSelectors.js (~40 lines)
✅ frontend/pages/HealthPage.jsx (~30 lines)
✅ frontend/styles/dashboard.module.css (~200 lines)
✅ API_DASHBOARD.md documentation

MODIFIED:
✅ server.js / index.js (add health routes)
✅ Redux store configuration (add health reducer)
✅ Router configuration (add /health route)
✅ package.json (add recharts dependency)

TOTAL NEW CODE: ~1,270 lines
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:

```
✅ All components tested
✅ API endpoints responding correctly
✅ Redux state properly integrated
✅ Charts rendering without errors
✅ Responsive design verified
✅ Performance optimized
✅ Error handling implemented
✅ Loading states working
✅ Auto-refresh working
✅ Documentation complete
✅ Git commit ready
✅ Tested on production build
```

---

## 📋 NEXT STEPS (After Dashboard Complete)

Once the dashboard is live:

1. **Gather Team Feedback** - How can it be improved?
2. **Add Features** - Filtering, sorting, export functionality
3. **Phase 7 Options:**
   - Option 2: Advanced Alerting (Slack/Email)
   - Option 3: Performance Optimization
   - Option 4: Extended Analytics

---

**Ready to start Phase 6? Follow the 10 steps above and you'll have a production-ready health monitoring dashboard in 1-2 days! 🚀**

Let me know when you're ready to begin implementation!
