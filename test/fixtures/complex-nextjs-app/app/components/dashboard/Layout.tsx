import { useTheme } from '../../lib/shared/theme';
import { Sidebar } from '../shared/Sidebar';
import styles from '../../styles/dashboard/layout.module.css';

export const DashboardLayout: React.FC = ({ children }) => {
  const theme = useTheme();
  return (
    <div className={styles.layout} data-theme={theme}>
      <Sidebar />
      <div className={styles.content}>{children}</div>
    </div>
  );
};
