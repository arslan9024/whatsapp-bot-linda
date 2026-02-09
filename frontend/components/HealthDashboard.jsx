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
