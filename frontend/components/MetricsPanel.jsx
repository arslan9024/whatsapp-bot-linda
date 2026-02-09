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
