"use client"

import { Globe, Users, Award, Handshake } from "lucide-react"

export default function ImpactSection() {
  const impactStats = [
    {
      icon: <Globe className="w-8 h-8" />,
      label: "Countries",
      value: "31+",
      description: "Across the African continent",
    },
    {
      icon: <Users className="w-8 h-8" />,
      label: "Global Impact",
      value: "97,000",
      description: "Lives touched and inspired",
    },
    {
      icon: <Award className="w-8 h-8" />,
      label: "Awardees",
      value: "400+",
      description: "Future leaders recognized",
    },
    {
      icon: <Handshake className="w-8 h-8" />,
      label: "Global Partners",
      value: "3",
      description: "Strategic collaborations",
    },
  ]

  return (
    <section className="py-20 bg-zinc-900/50 relative">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Our Impact
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Celebrating achievements and creating opportunities across Africa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {impactStats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="bg-black/50 rounded-2xl p-8 backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 hover:scale-105 hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-4 text-orange-400 flex justify-center">{stat.icon}</div>
                <div className="text-4xl font-bold mb-2 text-white font-sans">{stat.value}</div>
                <div className="text-lg font-semibold mb-2 text-zinc-200">{stat.label}</div>
                <div className="text-sm text-zinc-400">{stat.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
