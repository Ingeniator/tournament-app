import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

interface AppShellProps {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  hasBottomNav?: boolean;
}

export function AppShell({ title, headerRight, children, hasBottomNav = false }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {headerRight}
      </header>
      <main className={hasBottomNav ? styles.content : styles.contentNoPad}>
        {!hasBottomNav && <div style={{ padding: 'var(--space-md)' }}>{children}</div>}
        {hasBottomNav && children}
      </main>
    </div>
  );
}
