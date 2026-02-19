import styles from './GroupBadge.module.css';

interface GroupBadgeProps {
  group: string;
}

export function GroupBadge({ group }: GroupBadgeProps) {
  const className = group === 'A'
    ? styles.groupA
    : group === 'B'
    ? styles.groupB
    : styles.groupDefault;

  return (
    <span className={`${styles.badge} ${className}`}>
      {group}
    </span>
  );
}
