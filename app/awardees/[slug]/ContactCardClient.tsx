'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

type ContactCardProps = {
  email: string | undefined | null;
  personalEmail: string | undefined | null;
  name: string;
};

export default function ContactCardClient({ email, personalEmail, name }: ContactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const emailAddress = email || personalEmail;

  if (!emailAddress) {
    return null;
  }

  const firstName = name.split(' ')[0];

  return (
    <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-8 shadow-xl text-white sticky top-6" id="contact-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Get in Touch</h3>
        <button 
          className="lg:hidden text-white hover:text-orange-200 focus:outline-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
            />
          </svg>
        </button>
      </div>
      <div className={isExpanded ? 'block' : 'lg:block'}>
        <p className="text-white/90 mb-6 text-sm">
          Connect with {firstName} to collaborate, network, or learn more about their work.
        </p>
        <Button
          asChild
          className="w-full bg-white text-orange-600 hover:bg-zinc-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <a
            href={`mailto:${emailAddress}?subject=Hello from Top100 AFL&body=Hi ${firstName},%0D%0A%0D%0AI came across your profile on the Top100 Africa Future Leaders platform and would love to connect.%0D%0A%0D%0ABest regards`}
          >
            <Mail className="h-4 w-4" />
            Send Message
          </a>
        </Button>
      </div>
    </div>
  );
}