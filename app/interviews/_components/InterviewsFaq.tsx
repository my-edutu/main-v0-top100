import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS = [
  {
    q: 'How long does the interview take?',
    a: 'About 30 minutes of recording, plus a short call beforehand so you know the questions. We edit it down to roughly 15–20 minutes.',
  },
  {
    q: 'Where is it recorded?',
    a: 'Remotely, over video. If you are at one of our summits or festivals we may record in person instead — we will tell you if that option is open.',
  },
  {
    q: 'What equipment do I need?',
    a: 'A laptop or phone with a working camera, a quiet room, and a stable connection. If bandwidth is a problem, choose the written Q&A format on the form instead.',
  },
  {
    q: 'When will I hear back?',
    a: 'We review applications in batches roughly every two weeks. You will hear from us either way.',
  },
  {
    q: 'Can I apply if I was recognised years ago?',
    a: 'Yes. Every cohort is eligible, and we are especially interested in what has happened since.',
  },
]

export default function InterviewsFaq() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900">Questions, answered</h2>
      <Accordion type="single" collapsible className="mt-6">
        {FAQS.map((faq) => (
          <AccordionItem key={faq.q} value={faq.q} className="border-orange-100">
            <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:text-orange-700">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-slate-600">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
