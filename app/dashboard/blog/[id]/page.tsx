"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  Edit, 
  Eye, 
  Share, 
  Bookmark,
  MessageCircle,
  ThumbsUp 
} from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  tags: string[];
  readTime: string;
  status: 'draft' | 'published' | 'archived';
}

const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Impact of Youth Leadership in Africa',
    excerpt: 'Exploring how young leaders are driving transformation across the continent...',
    content: `Exploring how young leaders are driving transformation across the continent...\n\nAfrica's youth population is its greatest asset. With over 60% of the population under the age of 25, the continent has an unprecedented opportunity to harness the potential of its young people.\n\nThe Top100 Africa Future Leaders program recognizes exceptional students who are already making significant impacts in their communities. These leaders are not waiting for opportunities - they are creating them.\n\nFrom developing innovative solutions to challenges in health, education, and technology to advocating for policy changes that benefit their communities, these young leaders are transforming Africa one step at a time.\n\nThe program provides a platform for these emerging leaders to connect, learn, and grow together. Through mentorship, networking opportunities, and access to resources, participants are equipped to amplify their impact and continue driving positive change in their communities.`,
    author: 'John Doe',
    date: '2024-05-15',
    tags: ['leadership', 'youth', 'africa'],
    readTime: '5 min read',
    status: 'published'
  },
  {
    id: '2',
    title: 'Sustainable Development Goals in African Communities',
    excerpt: 'How African innovators are contributing to sustainable development...',
    content: `How African innovators are contributing to sustainable development...\n\nThe Sustainable Development Goals (SDGs) provide a roadmap for achieving a better and more sustainable future for all. In Africa, young innovators and leaders are finding creative ways to contribute to these global goals.\n\nFrom renewable energy projects to agricultural innovations, African entrepreneurs are developing solutions that address local challenges while contributing to global objectives. These solutions often take into account the unique cultural, economic, and environmental contexts of African communities.\n\nThe Top100 Africa Future Leaders program supports these efforts by connecting innovators with resources, mentors, and opportunities to scale their impact. By recognizing and supporting these leaders, the program helps accelerate progress towards the SDGs in African communities.`,
    author: 'Jane Smith',
    date: '2024-06-22',
    tags: ['sustainability', 'development', 'innovation'],
    readTime: '8 min read',
    status: 'published'
  },
  {
    id: '3',
    title: 'My Journey as a Top100 Awardee',
    excerpt: 'Reflections on the experience of being recognized as a Top100 Africa Future Leader...',
    content: `Reflections on the experience of being recognized as a Top100 Africa Future Leader...\n\nBeing selected as a Top100 Africa Future Leader has been a transformative experience. It has opened doors to opportunities I never imagined possible and connected me with a network of like-minded individuals who share my passion for creating positive change.\n\nThe recognition has given me a platform to amplify my work and reach a wider audience. It has also provided access to resources and mentorship that have accelerated the growth and impact of my initiatives.\n\nMore importantly, being part of this community has inspired me to continue pushing boundaries and seeking innovative solutions to the challenges facing our continent. The support and encouragement from fellow awardees have been invaluable in my journey.\n\nI encourage other young leaders to apply for this program. It's not just about the recognition - it's about joining a community of changemakers who are committed to building a brighter future for Africa.`,
    author: 'Samuel Johnson',
    date: '2024-07-10',
    tags: ['top100', 'awardee', 'journey'],
    readTime: '6 min read',
    status: 'draft'
  }
];

export default function BlogPostPage() {
  const { id } = useParams();
  const blogPost = mockBlogPosts.find(post => post.id === id) || mockBlogPosts[0];
  
  if (!blogPost) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Blog post not found</h1>
        <p className="text-zinc-400 mb-6">The blog post you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/dashboard/blog">Back to Blog Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{blogPost.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(blogPost.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{blogPost.readTime}</span>
          </div>
        </div>
        
        <Badge 
          variant={blogPost.status === 'published' ? 'default' : 
                   blogPost.status === 'draft' ? 'secondary' : 
                   'outline'}
          className={
            blogPost.status === 'published' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            blogPost.status === 'draft' ? 'bg-zinc-700 text-zinc-400' :
            'bg-zinc-800 text-zinc-500'
          }
        >
          {blogPost.status.charAt(0).toUpperCase() + blogPost.status.slice(1)}
        </Badge>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-6">{blogPost.title}</h1>
        
        <div className="flex flex-wrap gap-2 mb-8">
          {blogPost.tags.map((tag, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="bg-orange-500/10 text-orange-300 border-orange-500/20"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="prose prose-invert max-w-none">
        {blogPost.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className="mb-4 text-lg text-zinc-300 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      
      <div className="mt-12 pt-8 border-t border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" className="border-zinc-800 text-zinc-300">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Like
            </Button>
            <Button variant="outline" className="border-zinc-800 text-zinc-300">
              <MessageCircle className="h-4 w-4 mr-2" />
              Comment
            </Button>
            <Button variant="outline" className="border-zinc-800 text-zinc-300">
              <Bookmark className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" className="border-zinc-800 text-zinc-300">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zinc-800 text-zinc-300">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-6">More from this author</h2>
        <div className="grid gap-6">
          {mockBlogPosts
            .filter(post => post.author === blogPost.author && post.id !== blogPost.id)
            .slice(0, 2)
            .map(post => (
              <Card 
                key={post.id} 
                className="border-zinc-800 bg-black/50 hover:bg-black/70 transition-colors cursor-pointer"
                onClick={() => {/* In a real app, this would navigate to the other post */}}
              >
                <CardHeader>
                  <CardTitle className="text-lg text-white">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 mb-3">{post.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                    <span>{post.readTime}</span>
                    <span>•</span>
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      </div>
    </div>
  );
}