'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type FAQ = {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: "What is Top100 Africa Future Leaders?",
    answer:
      "Top100 Africa Future Leaders is a continental initiative dedicated to identifying, celebrating, and empowering Africa's brightest young leaders. We spotlight exceptional students and youth driving innovation, leadership, and social impact across Africa.",
  },
  {
    question: "What is the mission of Top100?",
    answer:
      "Our mission is to build a generation of purpose-driven African leaders by providing access to opportunities, mentorship, and exposure through our leadership network, empowerment summits, and digital platforms.",
  },
  {
    question: "Who founded Top100 Africa Future Leaders?",
    answer:
      "Top100 was founded by Nwosu Paul Light, a youth leader and innovator passionate about education, leadership, and technology in Africa. He envisions a connected ecosystem that discovers and empowers young Africans shaping the continent's future.",
  },
  {
    question: "Is Top100 a registered organization?",
    answer:
      "Yes, they are registered under the Elevate Youth Leaders Initiative Lagos, and are eligible for international, national partnership and collaborations.",
  },
  {
    question: "What is the Africa Future Leaders Summit?",
    answer:
      "The Africa Future Leaders Empowerment Summit is our flagship annual event that brings together young leaders, innovators, and changemakers across Africa for two days of virtual and physical sessions. The summit features keynote speakers, leadership panels, skill workshops, and networking sessions — all themed around 'Empowering Africa's Future Leaders.'",
  },
  {
    question: "Who are the speakers at the Summit?",
    answer:
      "Each year, we invite a diverse lineup of speakers — from global youth advocates to successful entrepreneurs and scholarship recipients — who inspire participants with real-life stories and actionable insights. (Speaker list is updated yearly on our website.)",
  },
  {
    question: "What is the Top100 Leadership Network?",
    answer:
      "The Top100 Leadership Network is our alumni and partnership community that connects past Top100 awardees, student leaders, and emerging professionals for peer mentorship, collaborations, and exclusive access to leadership resources.",
  },
  {
    question: "What is the Project100 Scholarship Initiative?",
    answer:
      "The Project100 Scholarship is a scholarship-verification and mentorship initiative designed to help students access verified funding opportunities. It also interviews past scholarship recipients to share their success stories and inspire others.",
  },
  {
    question: "Who can apply to be part of Top100 Africa Future Leaders?",
    answer:
      "Applications are open to graduates, and young professionals between 18–35 years old across Africa who have demonstrated leadership, innovation, or social impact in their communities, schools, or workplaces.",
  },
]

export default function FAQSection() {
  const [showAll, setShowAll] = useState(false)
  const displayedFaqs = showAll ? faqs : faqs.slice(0, 4)

  return (
    <section id="faq" className="py-8">
      <div className="container space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-4xl font-semibold">Frequently asked questions</h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-900">
            Answers for nominees, partners, and community members curious about the journey ahead.
          </p>
        </div>
        <Accordion type="single" collapsible className="space-y-5">
          {displayedFaqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${index}`}
              className="overflow-hidden rounded-lg border border-border/60 bg-card/95 shadow-sm transition-all hover:border-primary/60 data-[state=open]:border-primary/60"
            >
              <AccordionTrigger className="px-4 py-3 text-left text-base sm:text-lg md:text-xl font-semibold hover:text-primary data-[state=open]:text-primary transition-colors font-sans leading-relaxed tracking-wide">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-base sm:text-lg md:text-xl text-slate-900 leading-relaxed tracking-wide">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {faqs.length > 4 && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              className="bg-white hover:bg-gray-50 text-black border-2 border-gray-200 hover:border-gray-300 shadow-sm"
            >
              {showAll ? 'Show Less' : 'More FAQ'}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
