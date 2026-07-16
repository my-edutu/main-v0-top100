"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import InteractiveBackground from "../../components/InteractiveBackground";
import { useEffect, useState } from "react";

const LAUNCH_DATE = new Date("December 1, 2025 00:00:00");

export default function Magazine2025Page() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  // null until mounted so the server render never disagrees with the client.
  const [launched, setLaunched] = useState<boolean | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = LAUNCH_DATE.getTime() - Date.now();

      if (difference > 0) {
        setLaunched(false);
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setLaunched(true);
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {launched === false ? (
              <div className="mt-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Magazine Launch in</h3>
                <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                  {[
                    { value: timeLeft.days, label: "Days" },
                    { value: timeLeft.hours, label: "Hours" },
                    { value: timeLeft.minutes, label: "Minutes" },
                    { value: timeLeft.seconds, label: "Seconds" },
                  ].map((unit) => (
                    <div key={unit.label} className="flex flex-col items-center">
                      <div className="text-4xl md:text-6xl font-bold bg-black text-white rounded-xl px-4 py-3 min-w-[100px] md:min-w-[140px]">
                        {unit.value}
                      </div>
                      <div className="text-sm md:text-base mt-2 text-gray-600 font-medium">{unit.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : launched === true ? (
              <div className="mt-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                  Africa Future Leaders Magazine
                </p>
                <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
                  The 2025 edition is here.
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-base md:text-lg font-medium text-gray-600">
                  Meet the 2025 Top100 Africa Future Leaders — read the stories, projects, and people
                  shaping the continent&apos;s future.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/magazine"
                    className="rounded-full bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-gray-800"
                  >
                    Read the magazine
                  </Link>
                  <Link
                    href="/awardees"
                    className="rounded-full border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-900 transition hover:bg-gray-50"
                  >
                    Meet the awardees
                  </Link>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
