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
