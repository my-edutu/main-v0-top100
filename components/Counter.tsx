'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface CounterProps {
  target: number;
  duration?: number;
  className?: string;
}

export default function Counter({ target, duration = 2000, className = '' }: CounterProps) {
  const [canAnimate, setCanAnimate] = useState(false);
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(target);

  useEffect(() => {
    setCanAnimate(reduceMotion === false);
  }, [reduceMotion]);

  useEffect(() => {
    if (!canAnimate) {
      setCount(target);
      return;
    }

    setCount(0);
    let start: number | null = null;
    let frame: number;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const currentValue = Math.floor(progress * target);
      setCount(currentValue);
      
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      } else {
        setCount(target); // Ensure it reaches the exact target value
      }
    };
    
    frame = window.requestAnimationFrame(step);
    
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [target, duration, canAnimate]);

  return (
    <span
      className={`${className} font-bold`}
      style={className.includes('text-white') ? { color: '#ffffff' } : {}}
    >
      {count.toLocaleString()}
    </span>
  );
}
