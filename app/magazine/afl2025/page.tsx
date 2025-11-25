"use client";

import { motion } from "framer-motion";
import InteractiveBackground from "../../components/InteractiveBackground";
import { useEffect, useState } from "react";

export default function Magazine2025Page() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Calculate time until December 1st, 2025
  useEffect(() => {
    const calculateTimeLeft = () => {
      const launchDate = new Date('December 1, 2025 00:00:00').getTime();
      const now = new Date().getTime();
      const difference = launchDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen text-black relative bg-white">
      <InteractiveBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-4">
          {/* Hero Section with Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Countdown Timer - Bold and Readable */}
            <div className="mt-8">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Magazine Launch in</h3>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-4xl md:text-6xl font-bold bg-black text-white rounded-xl px-4 py-3 min-w-[100px] md:min-w-[140px]">
                    {timeLeft.days}
                  </div>
                  <div className="text-sm md:text-base mt-2 text-gray-600 font-medium">Days</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-4xl md:text-6xl font-bold bg-black text-white rounded-xl px-4 py-3 min-w-[100px] md:min-w-[140px]">
                    {timeLeft.hours}
                  </div>
                  <div className="text-sm md:text-base mt-2 text-gray-600 font-medium">Hours</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-4xl md:text-6xl font-bold bg-black text-white rounded-xl px-4 py-3 min-w-[100px] md:min-w-[140px]">
                    {timeLeft.minutes}
                  </div>
                  <div className="text-sm md:text-base mt-2 text-gray-600 font-medium">Minutes</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-4xl md:text-6xl font-bold bg-black text-white rounded-xl px-4 py-3 min-w-[100px] md:min-w-[140px]">
                    {timeLeft.seconds}
                  </div>
                  <div className="text-sm md:text-base mt-2 text-gray-600 font-medium">Seconds</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}