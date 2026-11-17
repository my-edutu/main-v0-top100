import Link from "next/link"
import { ArrowRight } from "lucide-react"

import Image from "@/components/safe-image"
import styles from "./HomePartnersSection.module.css"

const partners = [
  { name: "One Young World West & Central Africa", logo: "/3.png" },
  { name: "ALX Nigeria", logo: "/7.png" },
  { name: "Learning Planet Institute", logo: "/6.png" },
  { name: "SWIS Africa", logo: "/logos/swis-africa.png", credit: "EmpowHER lead" },
  { name: "European Union", logo: "/logos/funded-by-the-european-union.png", credit: "EmpowHER funder" },
  { name: "Global Youth Mobilization", logo: "/logos/global-youth-mobilization.png", credit: "Youth Empowerment Fund partner" },
]

export default function HomePartnersSection() {
  return (
    <section aria-labelledby="home-partners-title" className="py-2 sm:py-3">
      <div className="container max-w-5xl space-y-2">
        <h2 id="home-partners-title" className="text-center font-sans text-xl font-semibold sm:text-2xl">Our Partners</h2>
        <div className={styles.viewport}>
          <div className={styles.track}>
            {[false, true].map((copy) => (
              <ul
                key={String(copy)}
                aria-hidden={copy || undefined}
                className={`${copy ? styles.copy : ""} flex shrink-0 gap-2 pr-2 sm:gap-3 sm:pr-3`}
              >
                {partners.map((partner) => (
                  <li
                    key={partner.name}
                    tabIndex={copy ? undefined : 0}
                    className="group relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-700 sm:w-40 lg:w-44"
                  >
                    <Image
                      src={partner.logo}
                      alt={copy ? "" : partner.name}
                      width={100}
                      height={40}
                      className="h-14 w-full max-w-28 object-contain sm:h-16 sm:max-w-32 dark:rounded-sm dark:bg-white"
                    />
                    {!copy && partner.credit && <span className="sr-only">{partner.credit}</span>}
                    <div aria-hidden="true" className="absolute inset-0 hidden flex-col items-center justify-center bg-slate-950 px-2 text-center text-xs leading-tight text-[#fff] group-hover:flex group-focus:flex">
                      <p className="font-semibold">{partner.name}</p>
                      {partner.credit && <p className="mt-1 text-slate-200">{partner.credit}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <Link href="/partnership" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-800 underline underline-offset-4 hover:text-orange-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 dark:text-orange-300 dark:hover:text-orange-200">
            Partner with us <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
