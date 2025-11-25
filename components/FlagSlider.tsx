'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const countries = [
  { name: 'Nigeria', code: 'ng' },
  { name: 'United Kingdom', code: 'gb' },
  { name: 'Kenya', code: 'ke' },
  { name: 'Canada', code: 'ca' },
  { name: 'Tanzania', code: 'tz' },
  { name: 'South Africa', code: 'za' },
  { name: 'Cameroon', code: 'cm' },
  { name: 'Netherlands', code: 'nl' },
  { name: 'Ethiopia', code: 'et' },
  { name: 'Namibia', code: 'na' },
  { name: 'Burkina Faso', code: 'bf' },
  { name: 'India', code: 'in' },
  { name: 'China', code: 'cn' },
  { name: 'Thailand', code: 'th' },
  { name: 'United States', code: 'us' },
  { name: 'Zimbabwe', code: 'zw' },
  { name: 'Portugal', code: 'pt' },
  { name: 'North Macedonia', code: 'mk' },
  { name: 'France', code: 'fr' },
  { name: 'Spain', code: 'es' },
  { name: 'Pakistan', code: 'pk' },
  { name: 'Zambia', code: 'zm' },
  { name: 'Mozambique', code: 'mz' },
  { name: 'Egypt', code: 'eg' },
  { name: 'Armenia', code: 'am' },
  { name: 'Liberia', code: 'lr' },
  { name: 'Sudan', code: 'sd' },
  { name: 'Argentina', code: 'ar' },
  { name: 'Côte d\'Ivoire', code: 'ci' },
  { name: 'Democratic Republic of the Congo', code: 'cd' },
  { name: 'Morocco', code: 'ma' },
];

const FlagSlider = () => {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sliderRef.current) {
      // Clone the content to create a seamless loop effect
      const content = sliderRef.current.innerHTML;
      sliderRef.current.innerHTML = content + content;
    }
  }, []);

  return (
    <div className="py-4 bg-white dark:bg-slate-950">
      <div
        ref={sliderRef}
        className="flex whitespace-nowrap overflow-hidden"
        style={{
          animation: 'slide 40s linear infinite',
        }}
      >
        {countries.map((country, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center mx-6 flex-shrink-0"
          >
            <div className="w-10 h-6 mb-2 rounded-sm overflow-hidden border border-gray-200">
              <Image
                src={`https://flagcdn.com/w40/${country.code}.png`}
                alt={`${country.name} flag`}
                width={40}
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-center max-w-[80px] truncate">
              {country.name}
            </span>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};

export default FlagSlider;