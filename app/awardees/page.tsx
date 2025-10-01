export const runtime = "nodejs";
import AwardeesPageClient from "./AwardeesPageClient";
import { getAwardees } from "@/lib/awardees";

export default async function AwardeesPage({ 
  searchParams 
}: { 
  searchParams?: { 
    page?: string;
    search?: string;
  } 
}) {
  const awardees = await getAwardees();
  
  // Pass the searchParams to the client component so it can handle pagination and search
  return <AwardeesPageClient initialPeople={awardees} initialSearchParams={searchParams} />;
}