
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AnnouncementSlugPage({ params }: { params: { slug: string } }) {
    const supabase = createAdminClient();

    // Determine if the slug is a UUID or a custom slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);

    let query = supabase.from("announcements").select("*");

    if (isUuid) {
        query = query.eq("id", params.slug);
    } else {
        query = query.eq("slug", params.slug);
    }

    const { data: announcement, error } = await query.single();

    if (error || !announcement) {
        notFound();
    }

    // Check if content is HTML (from Rich Text Editor)
    const isHtml = /<[a-z][\s\S]*>/i.test(announcement.content || '');

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
                <div className="container h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-zinc-600 hover:text-orange-600 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="font-bold">Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="container py-12 lg:py-20">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Header */}
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest">
                            Announcement
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-zinc-900 tracking-tight leading-tight">
                            {announcement.title}
                        </h1>
                        <div className="flex items-center justify-center lg:justify-start gap-4 text-zinc-500 font-medium">
                            <Calendar className="h-5 w-5" />
                            <span>{new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>

                    {/* Featured Image - Mobile Only */}
                    {announcement.image_url && (
                        <div className="lg:hidden relative rounded-[2rem] overflow-hidden shadow-2xl shadow-orange-500/10 border border-zinc-100">
                            <Image
                                src={announcement.image_url}
                                alt={announcement.title}
                                width={1200}
                                height={675}
                                className="w-full h-auto object-contain"
                                priority
                            />
                        </div>
                    )}

                    {/* Content & Sidebar Grid */}
                    <div className="grid lg:grid-cols-3 gap-12 items-start">
                        {/* Main Content Column */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="prose prose-lg max-w-none text-zinc-600 leading-relaxed font-medium prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline prose-headings:font-bold prose-headings:text-zinc-900 prose-ol:list-decimal prose-ul:list-disc prose-li:marker:text-orange-500">
                                {isHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: announcement.content || '' }} />
                                ) : (
                                    announcement.content?.split('\n').map((para: string, i: number) => (
                                        <p key={i} className="mb-4">{para}</p>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-6 sticky top-24">
                            {/* Desktop Image */}
                            {announcement.image_url && (
                                <div className="hidden lg:block relative rounded-2xl overflow-hidden shadow-lg border border-zinc-100">
                                    <Image
                                        src={announcement.image_url}
                                        alt={announcement.title}
                                        width={600}
                                        height={400}
                                        className="w-full h-auto object-cover"
                                        priority
                                    />
                                </div>
                            )}

                            {/* CTA Box */}
                            <div className="p-8 bg-zinc-50 rounded-[2rem] border border-zinc-100 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="font-black text-zinc-900 text-xl">Take Action</h3>
                                    <p className="text-sm text-zinc-500 font-medium">Ready to join this movement? Click the button below.</p>
                                </div>

                                {announcement.cta_url && (
                                    <Button asChild size="lg" className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-lg font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                                        <Link href={announcement.cta_url} target="_blank">
                                            {announcement.cta_label || 'Learn More'}
                                            <ExternalLink className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                )}

                                <div className="pt-4 border-t border-zinc-200">
                                    <p className="text-xs text-zinc-400 text-center font-medium uppercase tracking-widest">
                                        Top100 Africa Future Leaders
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
