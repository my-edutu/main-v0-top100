import { useId } from "react"

export default function AfricaFutureLeadersLogo() {
  const clipId = useId()

  return (
    <svg
      viewBox="478 10 414 188"
      width={414}
      height={188}
      className="block h-10 w-auto sm:h-11"
      role="img"
      aria-label="Africa Future Leaders"
    >
      <defs>
        {/* The final line of the wordmark extends beneath the year badge. */}
        <clipPath id={clipId}>
          <path d="M478 10H849V124H892V198H478Z" />
        </clipPath>
      </defs>
      <image
        href="/Top100%20Africa%20Future%20leaders%20Logo%20.png"
        width={937}
        height={216}
        clipPath={`url(#${clipId})`}
      />
    </svg>
  )
}
