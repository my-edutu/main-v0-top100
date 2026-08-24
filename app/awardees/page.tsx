export const runtime = "nodejs";
export const revalidate = 300;
import AwardeesPageClient from "./AwardeesPageClient";
import { getAwardees } from "@/lib/awardees";

import type { Metadata } from 'next';
import { ogMetadata } from '@/lib/og';
import { pageOg } from '@/lib/og-pages';

export const metadata: Metadata = {
  title: pageOg('/awardees').title,
  description: 'Browse 400+ Top100 Africa Future Leaders awardees across 31 countries.',
  ...ogMetadata(pageOg('/awardees'), { url: '/awardees' }),
};

type AwardeesPageProps = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    year?: string;
  }>;
};

export default async function AwardeesPage({ searchParams }: AwardeesPageProps) {
  const awardees = await getAwardees();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  // Pass the searchParams to the client component so it can handle pagination and search
  return <AwardeesPageClient initialPeople={awardees} initialSearchParams={resolvedSearchParams} />;
}
