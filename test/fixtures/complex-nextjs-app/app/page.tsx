import { DashboardLayout } from './components/dashboard/Layout';
import { AuthProvider } from './components/auth/Provider';
import { useAnalytics } from './lib/shared/analytics';
import styles from './styles/dashboard/main.module.css';

export default function HomePage() {
  useAnalytics();
  return (
    <AuthProvider>
      <DashboardLayout>
        <main className={styles.container}>
          <h1>Welcome to Dashboard</h1>
        </main>
      </DashboardLayout>
    </AuthProvider>
  );
}
