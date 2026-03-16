import { useState, type ReactNode } from 'react';
import styles from '../../screens/OrganizerScreen.module.css';

export function CollapsibleSection({ title, summary, defaultOpen, children }: {
  title: string;
  summary?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.collapsible}>
      <div className={styles.collapsibleHeader} onClick={() => setOpen(v => !v)}>
        <div>
          <div className={styles.collapsibleTitle}>{title}</div>
          {!open && summary && <div className={styles.collapsibleSummary}>{summary}</div>}
        </div>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>&#x25BC;</span>
      </div>
      {open && <div className={styles.collapsibleBody}>{children}</div>}
    </div>
  );
}
