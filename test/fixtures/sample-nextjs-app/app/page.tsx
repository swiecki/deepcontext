import { Button } from './components/Button';
import { getServerSideProps } from './utils/server';
import styles from './styles/page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <Button>Click me</Button>
    </main>
  );
}
