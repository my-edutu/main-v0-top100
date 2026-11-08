export const runtime = "nodejs";
// Talent consent changes must not wait for an ISR cache to expire.
export const dynamic = "force-dynamic";
import AwardeesPageClient from "./AwardeesPageClient";
import { getAwardees } from "@/lib/awardees";
import { TalentDirectory } from "@/components/talent/directory";
import { talentDiscoveryEnabled } from "@/lib/talent/features";

import type { Metadata } from 'next';
import { ogMetadata } from '@/lib/og';
import { pageOg } from '@/lib/og-pages';

type AwardeesPageProps = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    year?: string;
    country?: string;
  }>;
};

export async function generateMetadata({ searchParams }: AwardeesPageProps): Promise<Metadata> {
  const query = await searchParams
  const params = new URLSearchParams()
  if (query?.year && /^(all|(?:19|20|21)\d{2})$/.test(query.year)) params.set('year', query.year)
  if (query?.page && /^[1-9]\d*$/.test(query.page) && Number(query.page) > 1) params.set('page', query.page)
  const canonical = params.size ? `/awardees?${params}` : '/awardees'
  return {
    title: pageOg('/awardees').title,
    description: 'Explore the Top100 Africa Future Leaders directory, awardee biographies and leadership stories.',
    alternates: { canonical },
    ...(query?.search || query?.country ? { robots: { index: false, follow: true } } : {}),
    ...ogMetadata(pageOg('/awardees'), { url: canonical }),
  }
}

export default async function AwardeesPage({ searchParams }: AwardeesPageProps) {
  const awardees = await getAwardees();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  // Only display fields reach the client; no account contact fields or metadata.
  const people = awardees.filter(person => person.is_public === true && person.slug).map(person => ({
    awardee_id: person.awardee_id, profile_id: person.profile_id, slug: person.slug,
    name: person.name, is_public: true, country: person.country, year: person.year,
    avatar_url: person.avatar_url, headline: person.headline, tagline: person.tagline,
    bio: person.bio, course: person.course, cohort: person.cohort,
    current_school: person.current_school, field_of_study: person.field_of_study,
    interests: person.interests,
  }));
  const archive = <AwardeesPageClient initialPeople={people} initialSearchParams={resolvedSearchParams} />;
  return talentDiscoveryEnabled() ? <TalentDirectory archive={archive} /> : archive;
}
