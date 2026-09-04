export default function InitialPortrait({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")

  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#111827,#431407)] text-3xl font-semibold tracking-[0.18em] text-orange-100"
    >
      {initials}
    </div>
  )
}
