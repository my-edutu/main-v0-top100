"use client"

import { useEffect, useState, useCallback } from "react"
import HomeFeaturedAwardees from "./HomeFeaturedAwardees"
import { supabase } from "@/lib/supabase/client"

type FeaturedAwardee = {
  slug: string
  name: string
  country?: string | null
  bio?: string | null
  avatar_url?: string | null
  course?: string | null
  cgpa?: string | null
  featured?: boolean | null
}

export default function HomeFeaturedAwardeesSection() {
  const [awardees, setAwardees] = useState<FeaturedAwardee[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFeaturedAwardees = useCallback(async () => {
    try {
      // Query featured awardees from the awardee_directory view
      const { data, error } = await supabase
        .from('awardee_directory')
        .select('*')
        .eq('featured', true)
        .eq('is_public', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching featured awardees:', error)
        return
      }

      if (data) {
        const formatted = data.map((entry: any) => ({
          slug: entry.slug ?? entry.awardee_id ?? entry.name,
          name: entry.name,
          country: entry.country ?? null,
          bio: entry.bio ?? null,
          avatar_url: entry.avatar_url ?? null,
          course: entry.field_of_study ?? entry.current_school ?? entry.course ?? null,
          cgpa: entry.cgpa ?? null,
          featured: entry.featured ?? false,
        }))

        setAwardees(formatted)
      }
    } catch (error) {
      console.error('Error in fetchFeaturedAwardees:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchFeaturedAwardees()

    // Set up real-time subscription to awardees table
    const channel = supabase
      .channel('homepage-featured-awardees')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'awardees' },
        (payload) => {
          console.log('Awardees table changed, refreshing featured awardees:', payload)
          // Refresh featured awardees when any awardee changes
          fetchFeaturedAwardees()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFeaturedAwardees])

  if (loading) {
    return (
      <section id="awardees" className="section-padding">
        <div className="container space-y-8">
          <div className="text-center">
            <h2 className="mt-3 text-3xl font-semibold sm:text-[2.5rem]">
              Meet the Bold Minds Shaping Africa Tomorrow
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
              Loading featured awardees...
            </p>
          </div>
        </div>
      </section>
    )
  }

  return <HomeFeaturedAwardees awardees={awardees} />
}
