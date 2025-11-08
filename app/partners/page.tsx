"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  Users, 
  Star, 
  Award, 
  Building2, 
  DollarSign, 
  Globe, 
  Lightbulb,
  CheckCircle,
  Target
} from "lucide-react";

export default function PartnershipPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setEmail("");
    }, 1500);
  };

  const partnershipBenefits = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Access to Top Talent",
      description: "Connect with Africa's brightest young innovators and emerging leaders."
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Continental Presence",
      description: "Reach young leaders across 20+ African countries through our network."
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Brand Visibility",
      description: "Elevate your brand through our events, content, and digital platforms."
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Strategic Alignment",
      description: "Align with a mission focused on youth empowerment and continental impact."
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Innovation Pipeline",
      description: "Engage with cutting-edge ideas and solutions from Africa's future leaders."
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Social Impact",
      description: "Be part of a movement creating positive change across the African continent."
    }
  ];

  const partnershipTiers = [
    {
      name: "Supporter",
      price: "",
      description: "For organizations looking to support our mission",
      features: [
        "Logo placement on official materials",
        "Recognition at events",
        "Access to partnership updates"
      ],
      cta: "Contact Us",
      popular: false
    },
    {
      name: "Partner",
      price: "",
      description: "For strategic collaborations",
      features: [
        "Prominent brand visibility",
        "Direct engagement with awardees",
        "Custom project collaboration",
        "Quarterly impact reports"
      ],
      cta: "Contact Us",
      popular: true
    },
    {
      name: "Alliance",
      price: "",
      description: "For deep strategic partnerships",
      features: [
        "Executive-level engagement",
        "Joint program development",
        "Annual impact report",
        "Named event sponsorships",
        "Custom recognition opportunities"
      ],
      cta: "Contact Us",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-zinc-100 dark:from-zinc-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Handshake className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400 uppercase tracking-[0.2em]">PARTNERSHIPS</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-slate-800 dark:text-white">
              Partner with Africa's Future
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Collaborate with us to empower the next generation of African leaders, innovators, and changemakers shaping our continent's future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:partnership@top100afl.com?subject=Partnership%20Inquiry&body=Hello,%0A%0AI%20would%20love%20to%20get%20more%20information%20on%20the%20partnership%20plan.%0A%0AThank%20you."
              >
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-8 py-6 text-lg"
                >
                  Become a Partner
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">20+</div>
              <div className="text-slate-600 dark:text-slate-400">Countries</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">400+</div>
              <div className="text-slate-600 dark:text-slate-400">Awardees</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">28</div>
              <div className="text-slate-600 dark:text-slate-400">Universities</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">150+</div>
              <div className="text-slate-600 dark:text-slate-400">Opportunities</div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Partner With Us</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Join a select network of organizations committed to Africa's development through youth empowerment
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {partnershipBenefits.map((benefit, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    {benefit.icon}
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Tiers */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Partnership Opportunities</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Choose the partnership level that aligns with your organization's goals and impact objectives
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {partnershipTiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden border-2 ${tier.popular ? 'border-orange-500 dark:border-orange-400 ring-2 ring-orange-500/20 dark:ring-orange-400/20' : 'border-slate-200 dark:border-slate-800'}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}
                <CardHeader className="text-center pb-6 pt-8">
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{tier.price}</div>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    asChild
                    className={`w-full ${tier.popular 
                      ? 'bg-orange-500 hover:bg-orange-600' 
                      : tier.name === 'Supporter' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
                  >
                    <a 
                      href={`mailto:partnership@top100afl.com?subject=Partnership%20Inquiry%20-%20${tier.name}&body=Hello,%0A%0AI%20would%20love%20to%20get%20more%20information%20on%20this%20${tier.name}%20plan.%0A%0AThank%20you.`}
                    >
                      <span className="font-bold">{tier.cta}</span>
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-slate-100 to-slate-200 text-white overflow-hidden dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 dark:text-white">
            <div className="p-8 md:p-12">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ready to Make an Impact?</h2>
                <p className="text-lg mb-8 opacity-90 text-white">
                  Join us in empowering Africa's future leaders and be part of a movement that's transforming the continent.
                </p>
                
                {isSubmitted ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto dark:bg-slate-800/80">
                    <h3 className="text-xl font-semibold mb-2 text-slate-800 dark:text-white">Thank You!</h3>
                    <p className="mb-4 text-slate-600 dark:text-slate-300">We've received your interest and will contact you shortly.</p>
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsSubmitted(false)}
                      className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-orange-500 dark:text-slate-900 dark:hover:bg-orange-600"
                    >
                      Submit Another Request
                    </Button>
                  </div>
                ) : (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const name = formData.get('name') as string;
                      const email = formData.get('email') as string;
                      const message = formData.get('message') as string;
                      
                      const subject = "Partnership Inquiry";
                      const body = `Hello,\n\nName: ${name}\nEmail: ${email}\n\nMessage: ${message}\n\nI would love to get more information on the partnership plan.\n\nThank you.`;
                      
                      window.location.href = `mailto:partnership@top100afl.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      setIsSubmitted(true);
                    }}
                    className="max-w-md mx-auto space-y-4"
                  >
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-left">Name</label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="Your name"
                        className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-orange-500 focus:ring-2 w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder:text-slate-400"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-left">Email</label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="your.email@example.com"
                        className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-orange-500 focus:ring-2 w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder:text-slate-400"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="block text-left">Message</label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        placeholder="Tell us about your interest in partnering..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder:text-slate-400"
                      ></textarea>
                    </div>
                    
                    <Button 
                      type="submit"
                      className="w-full bg-slate-800 text-white hover:bg-slate-900 dark:bg-orange-500 dark:text-slate-900 dark:hover:bg-orange-600"
                    >
                      Submit
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}