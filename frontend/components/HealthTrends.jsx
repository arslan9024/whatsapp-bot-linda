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
