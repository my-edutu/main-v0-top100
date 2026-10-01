const questions = [
  {
    question: 'Does payment determine whether I receive the recognition?',
    answer:
      'No. Your Africa Future Leaders recognition has already been awarded. Payment on this page is only for receiving the physical award.',
  },
  {
    question: 'What does the physical award fee cover?',
    answer: 'It covers the physical Africa Future Leaders award only.',
  },
  {
    question: 'How much is the physical award fee?',
    answer:
      'The payment screen shows the fee in each available currency before you continue to secure checkout.',
  },
  {
    question: 'When is my payment confirmed?',
    answer:
      'Africa Future Leaders verifies completed payments with the payment provider. Your status updates when confirmation arrives. If it is still processing, return to this page later to check again.',
  },
  {
    question: 'I cancelled or my payment failed. Can I try again?',
    answer:
      'If the attempt is marked cancelled or failed, you can start another checkout. If it is still processing or confirming, wait for an update or contact the team before trying again.',
  },
  {
    question: 'How do I arrange delivery?',
    answer:
      'After completing the physical award fee, contact the team to arrange delivery. They will provide a quote based on your destination.',
  },
]

export function AwardPaymentFaq() {
  return (
    <section
      aria-labelledby="award-payment-faq-title"
      className="award-payment-faq mx-auto w-full max-w-5xl rounded-[22px] border border-[#39323B] bg-[#17151B] p-5 text-white sm:p-7"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB77E]">
        Helpful answers
      </p>
      <h2
        id="award-payment-faq-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-white"
      >
        Questions about your award
      </h2>
      <div className="mt-4 divide-y divide-[#39323B]">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group py-4 first:pt-2 last:pb-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold text-[#F8F4F8] marker:hidden [&::-webkit-details-marker]:hidden">
              <span>{question}</span>
              <span
                aria-hidden="true"
                className="text-xl font-normal text-[#FFB77E] transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-3xl pb-1 pr-8 pt-2 text-sm leading-6 text-[#C8C0CA]">
              {answer}
            </p>
          </details>
        ))}
      </div>
      <p className="mt-4 border-t border-[#39323B] pt-4 text-sm leading-6 text-[#C8C0CA]">
        Need help with a payment?{' '}
        <a
          href="mailto:info@top100afl.com?subject=Award%20payment%20help"
          className="font-semibold text-[#FFB77E] underline underline-offset-4"
        >
          Contact the team
        </a>
        .
      </p>
    </section>
  )
}
