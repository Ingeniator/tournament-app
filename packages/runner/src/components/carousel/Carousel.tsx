import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import styles from './Carousel.module.css';

interface CarouselProps {
  children: ReactNode[];
}

export function Carousel({ children }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = children.length;
  const jumpingRef = useRef(false);

  // With clones: [lastClone, ...children, firstClone]
  // Real slides are at indices 1..count, clones at 0 and count+1
  const slides = count > 1
    ? [children[count - 1], ...children, children[0]]
    : children;

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.offsetWidth, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Initialize scroll position to first real slide (index 1)
  useEffect(() => {
    if (count > 1) {
      // Use timeout to ensure layout is ready
      requestAnimationFrame(() => scrollToIndex(1, false));
    }
  }, [count, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count <= 1) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      if (jumpingRef.current) return;

      const scrollLeft = el.scrollLeft;
      const itemWidth = el.offsetWidth;
      const rawIndex = Math.round(scrollLeft / itemWidth);

      // Map raw index to real index (0-based)
      const realIndex = ((rawIndex - 1) % count + count) % count;
      setActiveIndex(realIndex);

      // Debounce: after scrolling stops, check if we need to jump
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentRaw = Math.round(el.scrollLeft / el.offsetWidth);
        if (currentRaw === 0) {
          // At last clone — jump to real last
          jumpingRef.current = true;
          el.scrollTo({ left: count * itemWidth, behavior: 'instant' });
          jumpingRef.current = false;
        } else if (currentRaw === count + 1) {
          // At first clone — jump to real first
          jumpingRef.current = true;
          el.scrollTo({ left: 1 * itemWidth, behavior: 'instant' });
          jumpingRef.current = false;
        }
      }, 50);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [count]);

  const handleDotClick = (realIndex: number) => {
    if (count <= 1) {
      scrollToIndex(realIndex);
    } else {
      scrollToIndex(realIndex + 1); // offset by 1 for clone
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.track} ref={scrollRef}>
        {slides.map((child, i) => (
          <div className={styles.slide} key={i}>
            {child}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className={styles.dots}>
          {children.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
              onClick={() => handleDotClick(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
