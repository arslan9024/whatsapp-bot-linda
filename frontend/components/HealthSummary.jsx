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
