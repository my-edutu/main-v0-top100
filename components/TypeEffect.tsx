'use client';

import { useState, useEffect } from 'react';

interface TypeEffectProps {
  text: string;
  speed?: number;
}

export default function TypeEffect({ text, speed = 100 }: TypeEffectProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isDeleting) {
      // Deleting phase
      const timeout = setTimeout(() => {
        setDisplayedText(text.substring(0, currentIndex - 1));
        setCurrentIndex(prev => prev - 1);

        if (currentIndex === 0) {
          setIsDeleting(false);
        }
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      // Typing phase
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(text.substring(0, currentIndex + 1));
          setCurrentIndex(prev => prev + 1);
        }, speed);

        return () => clearTimeout(timeout);
      } else if (currentIndex === text.length) {
        // Pause at the end before deleting (if you want this behavior)
        // For now, we'll just keep the full text displayed
      }
    }
  }, [currentIndex, isDeleting, text, speed]);

  return <span className="font-bold" style={{ color: '#ffffff' }}>{displayedText}</span>;
}