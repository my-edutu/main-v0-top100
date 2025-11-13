"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const Gallery = () => {
  // List of images from the speakers announcement directory
  const images = [
    "/speakers announcement/6.png",
    "/speakers announcement/9.png",
    "/speakers announcement/10.png",
    "/speakers announcement/11.png",
    "/speakers announcement/12.png",
    "/speakers announcement/13.png",
    "/speakers announcement/14.png",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-slide functionality - always running
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images.length]);

  // Scroll to show the current image
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollAmount = container.clientWidth * currentIndex;
      container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  }, [currentIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div className="relative py-8 bg-white/10 dark:bg-slate-800/30 rounded-2xl p-6">
      <div className="relative">
        {/* Navigation buttons on the sides */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-lg hover:bg-white transition-colors"
          aria-label="Previous image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-lg hover:bg-white transition-colors"
          aria-label="Next image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Gallery container - horizontal scrollable */}
        <div
          ref={containerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          {images.map((src, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 snap-start"
              style={{ minWidth: '80vw', maxWidth: '500px' }}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Image 
                  src={src} 
                  alt={`Speaker announcement ${index + 1}`} 
                  fill
                  className="object-contain"
                  priority={index === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;