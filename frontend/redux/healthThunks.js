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
