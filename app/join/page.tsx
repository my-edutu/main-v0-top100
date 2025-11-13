"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Users, GraduationCap, Globe, Award } from "lucide-react";
import { handleJoinSubmission } from "@/app/actions/join";

export default function JoinPage() {
  const [email, setEmail] = useState("");
  const [state, formAction, isPending] = useActionState(handleJoinSubmission, null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Reset form and show success when submission succeeds
  if (state?.success && !isSubmitted) {
    setIsSubmitted(true);
    setEmail("");

    // Reset submitted state after 5 seconds
    setTimeout(() => {
      setIsSubmitted(false);
    }, 5000);
  }

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
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-zinc-800/50 rounded-2xl p-6 backdrop-blur-lg border border-orange-400/20 text-center transition-all duration-300 hover:scale-105"
            >
              <div className="flex justify-center mb-3 text-orange-400">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-zinc-400">{stat.label}</div>
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

        {/* Join Form */}
        <div className="bg-zinc-900/50 rounded-3xl p-8 md:p-12 border border-orange-400/20 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Join Our Community</h2>
          <p className="text-zinc-400 mb-8 text-center">
            Interested in becoming part of the Top100 Africa Future Leaders? Sign up for our newsletter to receive updates on application periods and opportunities.
          </p>
          
          {isSubmitted ? (
            <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-6 text-center">
              <h3 className="text-xl font-semibold text-green-400 mb-2">Thank You for Joining!</h3>
              <p className="text-green-300">
                {state?.message || "We've received your interest. You'll be the first to know when applications open."}
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Join Another
              </button>
            </div>
          ) : (
            <form action={formAction} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@university.edu"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-orange-400/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
                />
              </div>

              {/* Hidden field for interest type */}
              <input type="hidden" name="interestType" value="member" />

              {state?.success === false && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-center">
                  <p className="text-red-300 text-sm">{state.message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 disabled:opacity-70"
              >
                {isPending ? "Processing..." : "Sign Up for Updates"}
              </button>
            </form>
          )}
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