import "server-only"

import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { summarizeAwardeeRegister } from "./register-summary"

const pageSize = 500

const loadAwardeeRegisterTotals = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const entries: Parameters<typeof summarizeAwardeeRegister>[0][number][] = []

    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("awardees")
        .select("country, institution:metadata->profile_import->>institution")
        .order("id")
        .range(offset, offset + pageSize - 1)
        .returns<typeof entries>()

      if (error) throw error

      entries.push(...data)

      if (data.length < pageSize) return summarizeAwardeeRegister(entries)
    }
  },
  ["awardee-register-totals"],
  { revalidate: 300, tags: ["awardees"] },
)

export async function getAwardeeRegisterTotals() {
  try {
    return await loadAwardeeRegisterTotals()
  } catch (error) {
    console.error("Could not load awardee register totals", error)
    return null
  }
}
