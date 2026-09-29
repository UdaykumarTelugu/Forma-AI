import React, { useState, useEffect, useRef } from 'react';

export interface AnimatedCollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
  unmountOnExit?: boolean;
}

/**
 * AnimatedCollapse - Lightweight, dependency-free height and opacity transition wrapper.
 *
 * Smoothly expands content when isOpen becomes true (150-250ms), and smoothly collapses
 * content when isOpen becomes false. Unmounts children after collapse to preserve clean
 * React Hook Form state and prevent unwanted validation on hidden fields.
 */
export const AnimatedCollapse: React.FC<AnimatedCollapseProps> = ({
  isOpen,
  children,
  duration = 200,
  className = '',
  unmountOnExit = true,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animState, setAnimState] = useState<'collapsed' | 'expanding' | 'expanded' | 'collapsing'>(
    isOpen ? 'expanded' : 'collapsed'
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(isOpen ? undefined : 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isOpen) {
      setShouldRender(true);
      setAnimState('expanding');

      // Double requestAnimationFrame ensures browser has calculated the scrollHeight
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (contentRef.current) {
            setHeight(contentRef.current.scrollHeight);
          }
        });
      });

      timerRef.current = setTimeout(() => {
        setAnimState('expanded');
        setHeight(undefined); // Allow natural height once fully expanded so dropdowns/tooltips are not clipped
      }, duration);
    } else {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
      setAnimState('collapsing');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });

      timerRef.current = setTimeout(() => {
        setAnimState('collapsed');
        if (unmountOnExit) {
          setShouldRender(false);
        }
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen, duration, unmountOnExit]);

  if (!shouldRender && unmountOnExit) {
    return null;
  }

  const isVisible = animState === 'expanded' || animState === 'expanding';

  const style: React.CSSProperties = {
    height: animState === 'expanded' ? 'auto' : height !== undefined ? `${height}px` : undefined,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(-4px)',
    overflow: animState === 'expanded' ? 'visible' : 'hidden',
    transition: `height ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${Math.round(
      duration * 0.85
    )}ms ease, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    pointerEvents: isVisible ? 'auto' : 'none',
  };

  return (
    <div
      ref={contentRef}
      className={`forma-animated-collapse ${animState} ${className}`}
      style={style}
      aria-hidden={!isOpen}
    >
      {children}
    </div>
  );
};

export default AnimatedCollapse;
