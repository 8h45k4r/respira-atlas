import {
  createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode,
} from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * True once the element has scrolled into view (and stays true). Without
 * IntersectionObserver — old browsers, print, some test runners — it is true
 * at once, so nothing is ever left hidden.
 */
export function useInView<T extends Element>(
  rootMargin = '0px 0px -8% 0px',
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(
    () => typeof window === 'undefined' || typeof IntersectionObserver === 'undefined',
  );
  useEffect(() => {
    if (inView) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, rootMargin]);
  return [ref, inView];
}

/** Fades and lifts its children in as they scroll into view. */
export function Reveal({
  children, delay = 0, className, as = 'div', style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article' | 'header';
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return createElement(
    as,
    {
      ref,
      className: cn('reveal', inView && 'reveal-in', className),
      style: { animationDelay: `${delay}ms`, ...style },
    },
    children,
  );
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts up from zero when it comes into view.
 *
 * The animated digits are hidden from assistive technology; the final value is
 * always present as text, so a screen reader, a copy-paste or a test reads the
 * real number, never an intermediate one.
 */
export function CountUp({
  value, decimals = 0, prefix = '', suffix = '', duration = 1000, className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced || !inView) {
      if (reduced) setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(value * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, inView, reduced, duration]);

  const format = (n: number) =>
    n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      <span aria-hidden>{prefix}{format(shown)}{suffix}</span>
      <span className="sr-only">{prefix}{format(value)}{suffix}</span>
    </span>
  );
}
