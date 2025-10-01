'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Loader2,
  Play,
  BarChart3,
  TrendingUp,
  Clock,
  Eye
} from 'lucide-react';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  date: string;
  videoId: string;
  views?: number;
  likes?: number;
}

interface Stats {
  totalVideos: number;
  totalViews: number;
  averageViews: number;
  recentVideos: number;
}

export default function YouTubeManagement() {
  const router = useRouter();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    date: '',
    videoId: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchYouTubeVideos();
  }, []);

  useEffect(() => {
    if (videos.length > 0) {
      calculateStats();
    }
  }, [videos]);

  const fetchYouTubeVideos = async () => {
    try {
      setLoading(true);
      toast.loading('Loading YouTube videos...', { id: 'loading-youtube' });
      
      const response = await fetch('/api/youtube');
      if (!response.ok) throw new Error('Failed to fetch videos');
      
      const data = await response.json();
      // Add some mock data for views and likes
      const videosWithData = data.map((video: any) => ({
        ...video,
        views: Math.floor(Math.random() * 10000) + 1000, // Random views between 1000-11000
        likes: Math.floor(Math.random() * 500) + 50 // Random likes between 50-550
      }));
      
      setVideos(videosWithData);
      toast.success('YouTube videos loaded successfully', { id: 'loading-youtube' });
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      toast.error('Failed to fetch YouTube videos', { id: 'loading-youtube' });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (videos.length === 0) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
    const averageViews = totalViews ? Math.round(totalViews / videos.length) : 0;
    const recentVideos = videos.filter(video => {
      const videoDate = video.date ? new Date(video.date) : new Date();
      return videoDate.getFullYear() === currentYear && 
             videoDate.getMonth() >= currentMonth - 3; // Last 3 months
    }).length;

    setStats({
      totalVideos,
      totalViews,
      averageViews,
      recentVideos
    });
  };

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.videoId) {
      toast.error('Title and Video ID are required');
      return;
    }

    try {
      setIsAdding(true);
      toast.loading('Adding YouTube video...', { id: 'add-youtube' });
      
      // Validate YouTube URL format
      const videoId = extractVideoId(newVideo.videoId);
      if (!videoId) {
        toast.error('Invalid YouTube URL or Video ID');
        return;
      }

      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newVideo.title,
          description: newVideo.description,
          date: newVideo.date,
          videoId: videoId
        })
      });
      
      if (!response.ok) throw new Error('Failed to add video');
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh the video list
        await fetchYouTubeVideos();
        setNewVideo({
          title: '',
          description: '',
          date: '',
          videoId: ''
        });
        toast.success(result.message, { id: 'add-youtube' });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error adding YouTube video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add YouTube video', { id: 'add-youtube' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this YouTube video?')) return;

    try {
      toast.loading('Deleting YouTube video...', { id: `delete-${id}` });
      
      const response = await fetch(`/api/youtube?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete video');
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh the video list
        await fetchYouTubeVideos();
        toast.success(result.message, { id: `delete-${id}` });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error deleting YouTube video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete YouTube video', { id: `delete-${id}` });
    }
  };

  const extractVideoId = (url: string): string | null => {
    // Handle both full URLs and just the video ID
    if (url.length === 11) return url; // Already a video ID

    // Regex to extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      return match[2];
    }
    
    return null;
  };

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  // For development, we're not checking authentication
  // In production, implement proper auth check

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          YouTube Management
        </h1>
        <p className="text-muted-foreground">Manage YouTube links displayed on the site</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-red-400/30 rounded-lg mr-3">
                <Play className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Total Videos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-red-400/30 rounded animate-pulse" /> : stats?.totalVideos || 0}
            </div>
            <p className="text-xs text-red-100 mt-1">All YouTube videos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-blue-400/30 rounded-lg mr-3">
                <Eye className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Total Views</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-16 bg-blue-400/30 rounded animate-pulse" /> : 
                (stats?.totalViews ? stats.totalViews.toLocaleString() : '0')}
            </div>
            <p className="text-xs text-blue-100 mt-1">All videos combined</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-purple-400/30 rounded-lg mr-3">
                <BarChart3 className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Avg. Views</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-16 bg-purple-400/30 rounded animate-pulse" /> : 
                (stats?.averageViews ? stats.averageViews.toLocaleString() : '0')}
            </div>
            <p className="text-xs text-purple-100 mt-1">Per video</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-amber-400/30 rounded-lg mr-3">
                <Clock className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Recent</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-amber-400/30 rounded animate-pulse" /> : stats?.recentVideos || 0}
            </div>
            <p className="text-xs text-amber-100 mt-1">Last 3 months</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>YouTube Videos</CardTitle>
            <CardDescription>
              Manage videos displayed in the Recent Events section
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thumbnail</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video) => (
                      <TableRow key={video.id}>
                        <TableCell>
                          <img 
                            src={getYouTubeThumbnail(video.videoId)} 
                            alt={video.title} 
                            className="w-16 h-12 object-cover rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{video.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{video.date}</Badge>
                        </TableCell>
                        <TableCell>
                          {video.views?.toLocaleString() || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(video.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Video</CardTitle>
            <CardDescription>
              Add a YouTube video to the recent events section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <Input
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                  placeholder="Video title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">YouTube URL or Video ID *</label>
                <Input
                  value={newVideo.videoId}
                  onChange={(e) => setNewVideo({...newVideo, videoId: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the full URL or just the video ID (11 characters)
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input
                  value={newVideo.date}
                  onChange={(e) => setNewVideo({...newVideo, date: e.target.value})}
                  placeholder="e.g., March 2024"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({...newVideo, description: e.target.value})}
                  placeholder="Video description"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-red-500 hover:bg-red-600 text-white" 
              onClick={handleAddVideo}
              disabled={isAdding || !newVideo.title || !newVideo.videoId}
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Add YouTube Video
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}