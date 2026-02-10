import styles from './Toast.module.css';

interface ToastProps {
  message: string | null;
  className?: string;
}

export function Toast({ message, className }: ToastProps) {
  if (!message) return null;
  return <div className={className ?? styles.toast}>{message}</div>;
}
