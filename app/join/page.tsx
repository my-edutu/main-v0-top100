"use client";

import Link from "next/link";
import { Users, GraduationCap, Globe, Award } from "lucide-react";
import { APPLY_AWARDEE_FORM_URL } from "@/lib/applications";

const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8lUNm96H4bB5keg402";

export default function JoinPage() {
  // Mock statistics data
  const stats = [
    { value: "400+", label: "Current Members", icon: <Users className="w-6 h-6" /> },
    { value: "31+", label: "Countries Represented", icon: <Globe className="w-6 h-6" /> },
    { value: "97,000", label: "Lives Impacted", icon: <Award className="w-6 h-6" /> },
    { value: "15", label: "Active Chapters", icon: <GraduationCap className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">
            Join Top100 Africa Future Leaders
          </h1>
          <p className="text-xl text-zinc-300 mb-8">
            Become part of a prestigious community of exceptional students driving change across Africa
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300"
            >
              Join Community
            </a>
            <a
              href={APPLY_AWARDEE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              Become an Africa Future Leader
            </a>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center transition-all duration-300 hover:scale-105"
            >
              <div className="flex justify-center mb-3 text-orange-500">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-zinc-300">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Membership Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Membership Benefits</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/50 p-8 rounded-2xl border border-orange-400/20">
              <div className="text-4xl font-bold text-orange-400 mb-4">01</div>
              <h3 className="text-xl font-semibold mb-3">Mentorship Programs</h3>
              <p className="text-zinc-400">
                Connect with industry leaders and experienced professionals who guide your journey towards impactful leadership.
              </p>
            </div>
            <div className="bg-zinc-900/50 p-8 rounded-2xl border border-orange-400/20">
              <div className="text-4xl font-bold text-orange-400 mb-4">02</div>
              <h3 className="text-xl font-semibold mb-3">Networking Opportunities</h3>
              <p className="text-zinc-400">
                Access exclusive events, conferences, and forums to connect with fellow leaders across Africa and beyond.
              </p>
            </div>
            <div className="bg-zinc-900/50 p-8 rounded-2xl border border-orange-400/20">
              <div className="text-4xl font-bold text-orange-400 mb-4">03</div>
              <h3 className="text-xl font-semibold mb-3">Resource Access</h3>
              <p className="text-zinc-400">
                Get access to funding opportunities, educational resources, and tools to amplify your impact in your community.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}