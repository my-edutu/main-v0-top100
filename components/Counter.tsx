'use client';

import { useEffect, useState } from 'react';

interface CounterProps {
  target: number;
  duration?: number;
  className?: string;
}

export default function Counter({ target, duration = 2000, className = '' }: CounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const currentValue = Math.floor(progress * target);
      setCount(currentValue);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(target); // Ensure it reaches the exact target value
      }
    };
    
    window.requestAnimationFrame(step);
    
    return () => {
      // Cleanup if needed
    };
  }, [target, duration]);

  return (
    <span
      className={`${className} font-bold`}
      style={className.includes('text-white') ? { color: '#ffffff' } : {}}
    >
      {count.toLocaleString()}
    </span>
  );
}