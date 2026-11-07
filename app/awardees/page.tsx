export const runtime = "nodejs";
export const revalidate = 300;
import AwardeesPageClient from "./AwardeesPageClient";
import { getAwardees } from "@/lib/awardees";

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
  if (query?.year && ['all', '2024', '2026'].includes(query.year)) params.set('year', query.year)
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
  // Pass the searchParams to the client component so it can handle pagination and search
  return <AwardeesPageClient initialPeople={awardees.filter(person => person.is_public === true && person.slug)} initialSearchParams={resolvedSearchParams} />;
}
