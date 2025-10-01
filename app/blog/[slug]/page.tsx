import { notFound } from 'next/navigation';
import { Calendar, User, Clock } from 'lucide-react';
import Image from 'next/image';

// Type definition for blog post
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  isFeatured: boolean;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  readTime: number;
  author: string;
}

// Load data server-side
async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  // In a real implementation, this would fetch from a database or CMS
  // For now, I'll return mock data
  const mockPosts: BlogPost[] = [
    {
      id: '1',
      title: 'The Future of African Innovation',
      slug: 'future-of-african-innovation',
      content: `Exploring how young leaders are driving technological advancement across the continent through groundbreaking solutions and creative thinking. The landscape of innovation in Africa is rapidly evolving, with young entrepreneurs tackling challenges in agriculture, healthcare, education, and financial services.

Technology is becoming more accessible, with improved internet connectivity and mobile infrastructure enabling solutions that were previously impossible. From fintech startups revolutionizing financial services to agricultural innovations increasing crop yields, African entrepreneurs are creating solutions that address local challenges with global implications.

The ecosystem is supported by growing venture capital interest, government initiatives, and educational programs focused on STEM fields. This creates a positive feedback loop where success stories inspire the next generation of innovators.

Key areas of growth include artificial intelligence applications for local contexts, renewable energy solutions, and digital infrastructure development. The unique challenges and opportunities present in African markets are leading to innovations that often have applicability beyond the continent, contributing to global technological advancement.

The role of international partnerships and diaspora networks has been crucial in providing capital, expertise, and market access. However, the most impactful solutions often emerge from a deep understanding of local contexts and needs, combined with global best practices and technologies.

Looking forward, the focus is shifting from simply adapting existing technologies to creating entirely new solutions that can serve as models for other emerging markets. This represents a significant shift in Africa's role in the global innovation landscape, from consumer to creator of technology.`,
      excerpt: 'Exploring how young leaders are driving technological advancement across the continent through groundbreaking solutions and creative thinking.',
      coverImage: '/placeholder.svg?key=blog1',
      isFeatured: true,
      status: 'published',
      tags: ['Innovation', 'Technology'],
      createdAt: '2024-12-15T00:00:00Z',
      updatedAt: '2024-12-15T00:00:00Z',
      readTime: 8,
      author: 'Award Team'
    },
    {
      id: '2',
      title: 'Building Sustainable Communities',
      slug: 'building-sustainable-communities',
      content: `How our 2024 awardees are creating lasting environmental and social impact in their local communities through innovative approaches. Sustainability is no longer just a concept but a lived reality in many African communities, thanks to the efforts of dedicated individuals and organizations.

Community-based sustainability initiatives are taking various forms across the continent. In rural areas, projects focus on water conservation, sustainable agriculture, and renewable energy solutions. Urban sustainability efforts include waste management systems, green building initiatives, and sustainable transportation solutions.

The most successful projects share common characteristics: community ownership, local resource utilization, and long-term planning. These initiatives often begin small but demonstrate how grassroots efforts can scale to create significant environmental and social impact.

Environmental sustainability is closely linked to social and economic sustainability. Projects that address environmental challenges also tend to create economic opportunities and strengthen community bonds. This holistic approach ensures that sustainability efforts are viable in the long term.

Education and awareness are critical components of sustainable community development. Projects that include educational components tend to have greater long-term success, as they build local capacity and knowledge transfer.

The role of traditional knowledge in modern sustainability solutions cannot be understated. Many successful initiatives blend traditional practices with modern technology, creating solutions that are both effective and culturally appropriate.`,
      excerpt: 'How our 2024 awardees are creating lasting environmental and social impact in their local communities through innovative approaches.',
      coverImage: '/placeholder.svg?key=blog2',
      isFeatured: true,
      status: 'published',
      tags: ['Sustainability', 'Environment'],
      createdAt: '2024-12-10T00:00:00Z',
      updatedAt: '2024-12-10T00:00:00Z',
      readTime: 7,
      author: 'Award Team'
    },
    {
      id: '3',
      title: 'Mentorship That Transforms',
      slug: 'mentorship-that-transforms',
      content: `The power of mentorship in shaping Africa's future leaders and creating networks that span across borders and industries. Mentorship has emerged as a critical factor in the success of African entrepreneurs, professionals, and changemakers.

Effective mentorship relationships in African contexts often extend beyond professional guidance to include personal development, cultural navigation, and network building. Mentors play a crucial role in helping mentees access resources, opportunities, and knowledge that might otherwise be unavailable.

The most impactful mentorship programs combine local insight with global perspectives. This hybrid approach allows mentees to benefit from international best practices while developing solutions that are appropriate for African contexts.

Digital platforms have expanded access to mentorship, connecting African talent with mentors worldwide. These platforms have been particularly valuable for young professionals and entrepreneurs who might not have access to local mentors in their specific fields.

The ripple effect of successful mentorship extends to entire communities. Mentees who benefit from mentorship often become mentors themselves, creating a sustainable cycle of knowledge transfer and support. This contributes to the development of a strong professional culture and network across the continent.

Mentorship is also important for addressing systemic challenges and creating opportunities for underrepresented groups. Targeted mentorship programs can help level the playing field and ensure that talent from all backgrounds has the support needed to succeed.`,
      excerpt: 'The power of mentorship in shaping Africa\'s future leaders and creating networks that span across borders and industries.',
      coverImage: '/placeholder.svg?key=blog3',
      isFeatured: true,
      status: 'published',
      tags: ['Leadership', 'Mentorship'],
      createdAt: '2024-12-05T00:00:00Z',
      updatedAt: '2024-12-05T00:00:00Z',
      readTime: 6,
      author: 'Award Team'
    }
  ];

  return mockPosts.find(post => post.slug === slug) || null;
}

// Server component for individual blog post
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug);
  
  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <article className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-zinc-800">
          <div className="relative">
            <Image
              src={post.coverImage || "/placeholder.svg"}
              alt={post.title}
              width={1200}
              height={600}
              className="w-full h-96 object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-8">
              <div className="max-w-4xl">
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">{post.title}</h1>
                <div className="flex items-center text-zinc-400">
                  <User className="w-4 h-4 mr-2" />
                  <span className="mr-4">{post.author}</span>
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="mr-4">{new Date(post.createdAt).toLocaleDateString()}</span>
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{post.readTime} min read</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="prose prose-invert prose-lg max-w-none text-zinc-300">
              {post.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-6 text-lg leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </article>

        {/* Related Articles */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-8 text-white">Related Stories</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* In a real implementation, this would fetch related articles */}
            <div className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-zinc-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-3">More from our blog</h3>
                <p className="text-zinc-400 text-sm">Check out other inspiring stories and insights from Africa's future leaders.</p>
              </div>
            </div>
            <div className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-zinc-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Stay Updated</h3>
                <p className="text-zinc-400 text-sm">Subscribe to our newsletter for the latest stories and updates from our awardees.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}