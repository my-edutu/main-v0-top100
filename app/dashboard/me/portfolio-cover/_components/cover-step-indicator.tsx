type CoverStep = 'name' | 'photo' | 'preview'

const steps: Array<{ id: CoverStep; label: string }> = [
  { id: 'name', label: 'Name' },
  { id: 'photo', label: 'Photo' },
  { id: 'preview', label: 'Preview' },
]

export function CoverStepIndicator({ step }: { step: CoverStep }) {
  return (
    <ol aria-label="Cover steps" className="flex w-full max-w-xl items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm">
      {steps.map(({ id, label }, index) => (
        <li
          key={id}
          aria-current={step === id ? 'step' : undefined}
          aria-label={`Step ${index + 1} of ${steps.length}: ${label}`}
          className={`flex shrink-0 items-center gap-1.5 sm:gap-2 ${step === id ? 'text-orange-800' : 'text-neutral-400'}`}
        >
          <span
            aria-hidden="true"
            className={`grid size-7 place-items-center rounded-full border sm:size-8 ${step === id ? 'border-orange-600 bg-orange-50' : 'border-neutral-300'}`}
          >
            {index + 1}
          </span>
          {label}
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="mx-1 h-px w-5 bg-neutral-200 sm:mx-2 sm:w-10" />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
