export const runtime = "nodejs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAwardees } from "@/lib/awardees";

export default async function AwardeeDetail({ params }: { params: { slug: string }}) {
  const people = await getAwardees();
  const p = people.find(x => x.slug === params.slug);
  if (!p) return notFound();

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/awardees" className="text-sm text-orange-400 hover:text-orange-300 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Awardees
        </Link>
        
        <div className="mt-6">
          {/* Main Awardee Card */}
          <div className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-zinc-800">
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Image Placeholder */}
                <div className="flex-shrink-0">
                  <div className="bg-zinc-800 border-2 border-dashed rounded-xl w-48 h-48 flex items-center justify-center text-zinc-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>
                
                {/* Profile Info */}
                <div className="flex-grow">
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{p.name}</h1>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex">
                      <span className="w-32 text-zinc-400">Country</span>
                      <span className="text-white">{p.country || "—"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-zinc-400">CGPA</span>
                      <span className="text-white">{p.cgpa || "—"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-zinc-400">Course</span>
                      <span className="text-white">{p.course || "—"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-zinc-400">Email</span>
                      <span className="text-white break-words">{p.email || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* About Section below the card */}
          {p.bio && (
            <div className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-zinc-800 mt-6 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">About</h2>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-line">{p.bio}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}