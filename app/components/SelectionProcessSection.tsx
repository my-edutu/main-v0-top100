"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FileText, Search, Filter, Award, BookOpen } from "lucide-react"

export default function SelectionProcessSection() {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Nomination",
      description: "Students submit applications showcasing their leadership and community impact projects.",
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Screening",
      description: "Initial review of applications based on impact, innovation, and leadership potential.",
    },
    {
      icon: <Filter className="w-6 h-6" />,
      title: "Shortlist",
      description: "Top candidates are selected for further evaluation based on comprehensive criteria.",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Recognition and Certifications",
      description:
        "Selected leaders receive official recognition and certification of their achievements and potential.",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Feature on Magazine",
      description:
        "Top 100 future leaders are featured in our prestigious magazine, showcasing their stories and impact.",
    },
  ]

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Selection Process
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance mb-8">
            Our rigorous and transparent selection process ensures we identify the most promising future leaders across
            Africa.
          </p>
        </motion.div>

        {/* Desktop Timeline */}
        <div className="hidden md:block mb-16">
          <div className="flex justify-between items-center mb-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => setActiveStep(index)}
                whileHover={{ scale: 1.05 }}
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
                    activeStep === index ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {step.icon}
                </div>
                <div
                  className={`text-sm font-medium transition-colors ${
                    activeStep === index ? "text-orange-400" : "text-zinc-400"
                  }`}
                >
                  {step.title}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 rounded-full">
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8 text-center"
          >
            <h3 className="text-2xl font-bold mb-4 text-white">{steps[activeStep].title}</h3>
            <p className="text-lg text-zinc-300 max-w-2xl mx-auto">{steps[activeStep].description}</p>
          </motion.div>
        </div>

        {/* Mobile Accordion */}
        <div className="md:hidden">
          <Accordion type="single" collapsible className="w-full">
            {steps.map((step, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-zinc-800">
                <AccordionTrigger className="text-left hover:text-orange-400">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mr-4 text-orange-400">
                      {step.icon}
                    </div>
                    {step.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 ml-14">{step.description}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-orange-400/20 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-white">Our Commitment to Fairness</h3>
            <p className="text-lg text-zinc-300 text-balance">
              We are committed to maintaining the highest standards of fairness, inclusion, and transparency throughout
              our selection process. Every application is evaluated with equal consideration, ensuring that talent and
              impact are recognized regardless of background or location across the African continent.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
