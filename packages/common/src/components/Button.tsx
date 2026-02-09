import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  size?: 'default' | 'small';
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  size = 'default',
  className,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    fullWidth && styles.fullWidth,
    size === 'small' && styles.small,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
}
