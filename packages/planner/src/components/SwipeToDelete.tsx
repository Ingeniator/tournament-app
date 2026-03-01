import { useRef, type ReactNode } from 'react';
import styles from './SwipeToDelete.module.css';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  label?: string;
}

const THRESHOLD = 80;

export function SwipeToDelete({ children, onDelete, label = 'Delete' }: SwipeToDeleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    // Only track leftward swipes
    if (dx > 0) {
      if (swiping.current) {
        // Reset if user swipes back
        containerRef.current!.style.transform = '';
        swiping.current = false;
      }
      return;
    }
    // Start swiping after a small threshold to avoid blocking vertical scroll
    if (Math.abs(dx) < 10 && !swiping.current) return;
    swiping.current = true;
    currentX.current = dx;
    const clamped = Math.max(dx, -THRESHOLD - 20);
    containerRef.current!.style.transform = `translateX(${clamped}px)`;
  };

  const handleTouchEnd = () => {
    if (!swiping.current) return;
    swiping.current = false;
    const el = containerRef.current!;
    if (Math.abs(currentX.current) >= THRESHOLD) {
      // Snap to reveal delete button
      el.style.transition = 'transform 0.2s ease';
      el.style.transform = `translateX(-${THRESHOLD}px)`;
      setTimeout(() => { el.style.transition = ''; }, 200);
    } else {
      // Snap back
      el.style.transition = 'transform 0.2s ease';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 200);
    }
    currentX.current = 0;
  };

  const handleReset = () => {
    const el = containerRef.current!;
    el.style.transition = 'transform 0.2s ease';
    el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; }, 200);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.deleteAction} style={{ width: THRESHOLD }}>
        <button className={styles.deleteBtn} onClick={() => { handleReset(); onDelete(); }}>
          {label}
        </button>
      </div>
      <div
        ref={containerRef}
        className={styles.content}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
