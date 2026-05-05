"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

type MotionRevealVariant = "fade-up" | "fade-down" | "fade-scale";

interface MotionRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly stagger?: boolean;
  readonly variant?: MotionRevealVariant;
}

export function MotionReveal({
  children,
  className,
  delay = 0,
  stagger = false,
  variant = "fade-up",
}: MotionRevealProps): ReactElement {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const style = {
    "--motion-delay": `${delay}ms`,
  } as CSSProperties;

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={className}
      data-motion={variant}
      data-motion-state={isVisible ? "visible" : "hidden"}
      data-motion-stagger={stagger ? "true" : undefined}
      style={style}
    >
      {children}
    </div>
  );
}
