"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Handshake,
  Users,
  Star,
  Globe,
  Lightbulb,
  Target,
  Award,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function PartnershipPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    message: ""
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage("");

    try {
      const response = await fetch('/api/partnership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setStatus('success');
      setFormData({ name: "", email: "", organization: "", message: "" });
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
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
      icon: <Award className="w-6 h-6" />,
      title: "Social Impact",
      description: "Be part of a movement creating positive change across the African continent."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-white" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Handshake className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-600 uppercase tracking-[0.2em]">PARTNERSHIPS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 text-gray-900">
              Partner with Africa's Future
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Collaborate with us to empower the next generation of African leaders, innovators, and changemakers shaping our continent's future.
            </p>
            <a href="#contact-form">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-8 py-6 text-lg"
              >
                Become a Partner
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">20+</div>
              <div className="text-gray-600">Countries</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">400+</div>
              <div className="text-gray-600">Awardees</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">28</div>
              <div className="text-gray-600">Universities</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">150+</div>
              <div className="text-gray-600">Opportunities</div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Benefits */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-4 text-gray-900">Why Partner With Us</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join a select network of organizations committed to Africa's development through youth empowerment
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {partnershipBenefits.map((benefit, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-gray-100 bg-white">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    {benefit.icon}
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-4 text-gray-900">
                Ready to Make an Impact?
              </h2>
              <p className="text-gray-600">
                Join us in empowering Africa's future leaders and be part of a movement that's transforming the continent.
              </p>
            </div>

            <Card className="border-gray-100 shadow-lg">
              <CardContent className="p-6 sm:p-8">
                {status === 'success' ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
                    <p className="text-gray-600 mb-6">
                      We've received your partnership inquiry and will get back to you soon.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setStatus('idle')}
                      className="border-gray-300"
                    >
                      Submit Another Inquiry
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          className="border-gray-200 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your.email@example.com"
                          className="border-gray-200 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                        Organization (optional)
                      </label>
                      <Input
                        id="organization"
                        type="text"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        placeholder="Your organization or company"
                        className="border-gray-200 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your interest in partnering with us..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      ></textarea>
                    </div>

                    {status === 'error' && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errorMessage || 'Something went wrong. Please try again.'}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6"
                    >
                      {status === 'loading' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Partnership Inquiry'
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}