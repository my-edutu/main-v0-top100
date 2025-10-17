"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Eye, 
  Edit, 
  Trash2, 
  Tag,
  User,
  Search,
  Filter,
  ChevronDown,
  BookOpen,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string; // ISO string format
  tags: string[];
  readTime: string;
  status: 'draft' | 'published' | 'archived';
}

export default function BlogDashboard() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [newBlog, setNewBlog] = useState({
    title: '',
    excerpt: '',
    content: '',
    tags: '' as string,
    status: 'draft' as 'draft' | 'published' | 'archived'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch('/api/blog');
        if (response.ok) {
          const data = await response.json();
          setBlogPosts(data);
        } else {
          console.error('Failed to fetch blog posts');
        }
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, []);

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || post.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateBlog = async () => {
    if (!newBlog.title.trim() || !newBlog.content.trim()) {
      alert('Please fill in the title and content fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newBlog.title,
          excerpt: newBlog.excerpt,
          content: newBlog.content,
          tags: newBlog.tags,
          status: newBlog.status
        }),
      });

      if (response.ok) {
        const createdBlog = await response.json();
        setBlogPosts([createdBlog, ...blogPosts]);
        setNewBlog({
          title: '',
          excerpt: '',
          content: '',
          tags: '',
          status: 'draft'
        });
        setIsWriting(false);
        alert('Blog post created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to create blog post: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating blog post:', error);
      alert('Failed to create blog post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      // In a real app, you would make an API call to delete the post
      setBlogPosts(blogPosts.filter(post => post.id !== id));
    }
  };

  if (isWriting) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Write a New Blog</h1>
          <p className="text-zinc-400">Share your thoughts and insights with the community</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <Input
              placeholder="Title your blog post..."
              value={newBlog.title}
              onChange={(e) => setNewBlog({...newBlog, title: e.target.value})}
              className="text-2xl font-bold bg-transparent border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-600"
            />
          </div>
          
          <div>
            <Input
              placeholder="Brief excerpt (optional)"
              value={newBlog.excerpt}
              onChange={(e) => setNewBlog({...newBlog, excerpt: e.target.value})}
              className="text-lg bg-transparent border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-600"
            />
          </div>
          
          <div>
            <Textarea
              placeholder="Write your story..."
              value={newBlog.content}
              onChange={(e) => setNewBlog({...newBlog, content: e.target.value})}
              className="min-h-[400px] bg-transparent border-0 p-0 text-lg placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          <div>
            <Input
              placeholder="Tags (comma separated)"
              value={newBlog.tags}
              onChange={(e) => setNewBlog({...newBlog, tags: e.target.value})}
              className="bg-transparent border-zinc-800"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <select
              value={newBlog.status}
              onChange={(e) => setNewBlog({...newBlog, status: e.target.value as any})}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              <option value="draft">Draft</option>
              <option value="published">Publish</option>
              <option value="archived">Archive</option>
            </select>
            
            <Button 
              onClick={() => setIsWriting(false)} 
              variant="outline"
              className="border-zinc-800 text-zinc-300"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleCreateBlog} 
              className="bg-orange-500 hover:bg-orange-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Blog'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">My Blog Posts</h1>
            <p className="text-zinc-400">Create, manage, and share your insights with the community</p>
          </div>
          
          <Button 
            onClick={() => setIsWriting(true)}
            className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Write a Blog
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
            <Input
              placeholder="Search your blog posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Posts</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No blog posts yet</h3>
          <p className="text-zinc-400 mb-6">Start writing your first blog post to share your insights</p>
          <Button 
            onClick={() => setIsWriting(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            Write Your First Blog
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="border-zinc-800 bg-black/50 hover:bg-black/70 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-xl text-white">{post.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge 
                      variant={post.status === 'published' ? 'default' : 
                               post.status === 'draft' ? 'secondary' : 
                               'outline'}
                      className={
                        post.status === 'published' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        post.status === 'draft' ? 'bg-zinc-700 text-zinc-400' :
                        'bg-zinc-800 text-zinc-500'
                      }
                    >
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-zinc-300 mb-4">{post.excerpt}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag, index) => (
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
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-zinc-800 text-zinc-300"
                    onClick={() => setIsWriting(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-zinc-800 text-zinc-300"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}