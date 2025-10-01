import { BlogCard } from './BlogCard';
import fs from 'fs';
import path from 'path';

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
async function getBlogPosts(): Promise<BlogPost[]> {
  // In a real implementation, this would fetch from a database or CMS
  // For now, I'll return mock data that follows the same structure as the component
  const mockPosts: BlogPost[] = [
    {
      id: '1',
      title: 'The Future of African Innovation',
      slug: 'future-of-african-innovation',
      content: 'Exploring how young leaders are driving technological advancement across the continent through groundbreaking solutions and creative thinking.',
      excerpt: 'Exploring how young leaders are driving technological advancement across the continent through groundbreaking solutions and creative thinking.',
      coverImage: '/placeholder.svg?key=blog1',
      isFeatured: true,
      status: 'published',
      tags: ['Innovation', 'Technology'],
      createdAt: '2024-12-15T00:00:00Z',
      updatedAt: '2024-12-15T00:00:00Z',
      readTime: 5,
      author: 'Award Team'
    },
    {
      id: '2',
      title: 'Building Sustainable Communities',
      slug: 'building-sustainable-communities',
      content: 'How our 2024 awardees are creating lasting environmental and social impact in their local communities through innovative approaches.',
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
      content: 'The power of mentorship in shaping Africa\'s future leaders and creating networks that span across borders and industries.',
      excerpt: 'The power of mentorship in shaping Africa\'s future leaders and creating networks that span across borders and industries.',
      coverImage: '/placeholder.svg?key=blog3',
      isFeatured: true,
      status: 'published',
      tags: ['Leadership', 'Mentorship'],
      createdAt: '2024-12-05T00:00:00Z',
      updatedAt: '2024-12-05T00:00:00Z',
      readTime: 4,
      author: 'Award Team'
    },
    {
      id: '4',
      title: 'Education Revolution in Rural Areas',
      slug: 'education-revolution-rural',
      content: 'Innovative approaches to bringing quality education to underserved communities across Africa, bridging the educational gap with technology and community engagement.',
      excerpt: 'Innovative approaches to bringing quality education to underserved communities across Africa, bridging the educational gap with technology and community engagement.',
      coverImage: '/placeholder.svg?key=blog4',
      isFeatured: false,
      status: 'published',
      tags: ['Education', 'Innovation'],
      createdAt: '2024-11-28T00:00:00Z',
      updatedAt: '2024-11-28T00:00:00Z',
      readTime: 6,
      author: 'Award Team'
    },
    {
      id: '5',
      title: 'Tech Solutions for Healthcare Access',
      slug: 'tech-solutions-healthcare',
      content: 'How technology is being leveraged to improve healthcare access in remote areas of Africa, from telemedicine platforms to diagnostic tools.',
      excerpt: 'How technology is being leveraged to improve healthcare access in remote areas of Africa, from telemedicine platforms to diagnostic tools.',
      coverImage: '/placeholder.svg?key=blog5',
      isFeatured: false,
      status: 'published',
      tags: ['Healthcare', 'Technology'],
      createdAt: '2024-11-20T00:00:00Z',
      updatedAt: '2024-11-20T00:00:00Z',
      readTime: 8,
      author: 'Award Team'
    },
    {
      id: '6',
      title: 'Renewable Energy Initiatives',
      slug: 'renewable-energy-initiatives',
      content: 'Spotlighting the renewable energy projects that are bringing sustainable power to communities across the African continent and creating economic opportunities.',
      excerpt: 'Spotlighting the renewable energy projects that are bringing sustainable power to communities across the African continent and creating economic opportunities.',
      coverImage: '/placeholder.svg?key=blog6',
      isFeatured: false,
      status: 'published',
      tags: ['Environment', 'Energy'],
      createdAt: '2024-11-15T00:00:00Z',
      updatedAt: '2024-11-15T00:00:00Z',
      readTime: 5,
      author: 'Award Team'
    },
    {
      id: '7',
      title: 'Women Leading Change',
      slug: 'women-leading-change',
      content: 'Celebrating the remarkable women who are leading change in various sectors across Africa and inspiring the next generation of female leaders.',
      excerpt: 'Celebrating the remarkable women who are leading change in various sectors across Africa and inspiring the next generation of female leaders.',
      coverImage: '/placeholder.svg?key=blog7',
      isFeatured: false,
      status: 'published',
      tags: ['Leadership', 'Women'],
      createdAt: '2024-11-10T00:00:00Z',
      updatedAt: '2024-11-10T00:00:00Z',
      readTime: 6,
      author: 'Award Team'
    },
    {
      id: '8',
      title: 'Entrepreneurship Ecosystem Growth',
      slug: 'entrepreneurship-ecosystem-growth',
      content: 'How the entrepreneurial ecosystem is evolving across African countries, creating opportunities for innovation and economic growth.',
      excerpt: 'How the entrepreneurial ecosystem is evolving across African countries, creating opportunities for innovation and economic growth.',
      coverImage: '/placeholder.svg?key=blog8',
      isFeatured: false,
      status: 'published',
      tags: ['Business', 'Entrepreneurship'],
      createdAt: '2024-11-05T00:00:00Z',
      updatedAt: '2024-11-05T00:00:00Z',
      readTime: 7,
      author: 'Award Team'
    },
    {
      id: '9',
      title: 'Agricultural Innovation Success Stories',
      slug: 'agricultural-innovation-success',
      content: 'Highlighting successful agricultural innovations that are transforming farming practices and improving food security across the continent.',
      excerpt: 'Highlighting successful agricultural innovations that are transforming farming practices and improving food security across the continent.',
      coverImage: '/placeholder.svg?key=blog9',
      isFeatured: false,
      status: 'published',
      tags: ['Agriculture', 'Innovation'],
      createdAt: '2024-10-28T00:00:00Z',
      updatedAt: '2024-10-28T00:00:00Z',
      readTime: 6,
      author: 'Award Team'
    },
    {
      id: '10',
      title: 'Digital Financial Inclusion',
      slug: 'digital-financial-inclusion',
      content: 'The role of fintech in promoting financial inclusion across Africa, making financial services accessible to underserved populations.',
      excerpt: 'The role of fintech in promoting financial inclusion across Africa, making financial services accessible to underserved populations.',
      coverImage: '/placeholder.svg?key=blog10',
      isFeatured: false,
      status: 'published',
      tags: ['Fintech', 'Inclusion'],
      createdAt: '2024-10-20T00:00:00Z',
      updatedAt: '2024-10-20T00:00:00Z',
      readTime: 5,
      author: 'Award Team'
    },
    {
      id: '11',
      title: 'Creative Industries Impact',
      slug: 'creative-industries-impact',
      content: 'Exploring the growing influence of African creative industries and how they are contributing to cultural identity and economic growth.',
      excerpt: 'Exploring the growing influence of African creative industries and how they are contributing to cultural identity and economic growth.',
      coverImage: '/placeholder.svg?key=blog11',
      isFeatured: false,
      status: 'published',
      tags: ['Creative', 'Culture'],
      createdAt: '2024-10-15T00:00:00Z',
      updatedAt: '2024-10-15T00:00:00Z',
      readTime: 4,
      author: 'Award Team'
    },
    {
      id: '12',
      title: 'Climate Action by Young Leaders',
      slug: 'climate-action-young-leaders',
      content: 'How young African leaders are taking innovative approaches to climate action and environmental conservation in their communities.',
      excerpt: 'How young African leaders are taking innovative approaches to climate action and environmental conservation in their communities.',
      coverImage: '/placeholder.svg?key=blog12',
      isFeatured: false,
      status: 'published',
      tags: ['Environment', 'Climate'],
      createdAt: '2024-10-10T00:00:00Z',
      updatedAt: '2024-10-10T00:00:00Z',
      readTime: 6,
      author: 'Award Team'
    }
  ];
  
  return mockPosts;
}

// Server component that loads data and renders the blog page with pagination
export default async function BlogPage({ 
  searchParams 
}: { 
  searchParams?: { 
    page?: string 
  } 
}) {
  const currentPage = Number(searchParams?.page) || 1;
  const postsPerPage = 6; // Show 6 posts per page
  const allBlogPosts = await getBlogPosts();
  
  // Separate featured posts from regular posts
  const featuredPosts = allBlogPosts.filter(post => post.isFeatured);
  const regularPosts = allBlogPosts.filter(post => !post.isFeatured);
  
  // Calculate pagination for regular posts only
  const totalPosts = regularPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  
  // Get the posts for the current page
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = regularPosts.slice(startIndex, endIndex);
  
  // Check if there are previous/next pages
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  
  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Stories & Insights
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Discover inspiring stories and insights from Africa's future leaders
          </p>
        </header>

        {/* Featured Posts Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-white">Featured Stories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPosts
              .slice(0, 3)
              .map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
          </div>
        </section>

        {/* All Posts Section */}
        <section>
          <h2 className="text-2xl font-bold mb-8 text-white">All Stories</h2>
          <div className="space-y-12">
            {currentPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Pagination Controls */}
        <div className="mt-16 flex justify-between items-center">
          <button
            disabled={!hasPreviousPage}
            className={`px-6 py-3 rounded-lg border ${
              !hasPreviousPage 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' 
                : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'
            }`}
          >
            Previous Page
          </button>
          
          <div className="text-sm text-zinc-400">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            disabled={!hasNextPage}
            className={`px-6 py-3 rounded-lg border ${
              !hasNextPage 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' 
                : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'
            }`}
          >
            Next Page
          </button>
        </div>
      </div>
    </div>
  );
}