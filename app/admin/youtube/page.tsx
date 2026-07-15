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
  CardFooter,
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Eye,
  Youtube as YoutubeIcon
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
  const [videoToDelete, setVideoToDelete] = useState<YouTubeVideo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    try {
      setDeletingId(id);
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
    } finally {
      setDeletingId(null);
      setVideoToDelete(null);
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
    <div className="container mx-auto py-6 sm:py-10 pt-20 lg:pt-6 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          YouTube Management
        </h1>
        <p className="text-sm text-muted-foreground">Manage YouTube links displayed on the site</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                    <Skeleton className="h-12 w-20 shrink-0 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-16 shrink-0 rounded" />
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
                  <YoutubeIcon className="h-7 w-7 text-red-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold">No videos yet</p>
                  <p className="text-sm text-muted-foreground">Add your first YouTube video using the form.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thumbnail</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell>
                            <img
                              src={getYouTubeThumbnail(video.videoId)}
                              alt={`Thumbnail for ${video.title}`}
                              loading="lazy"
                              width={64}
                              height={48}
                              className="w-16 h-12 object-cover rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-[240px] truncate">{video.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{video.date || '—'}</Badge>
                          </TableCell>
                          <TableCell>
                            {video.views?.toLocaleString() || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Open ${video.title} on YouTube`}
                                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                aria-label={`Delete ${video.title}`}
                                disabled={deletingId === video.id}
                                onClick={() => setVideoToDelete(video)}
                              >
                                {deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {videos.map((video) => (
                    <div key={video.id} className="flex gap-3 rounded-xl border p-3">
                      <img
                        src={getYouTubeThumbnail(video.videoId)}
                        alt={`Thumbnail for ${video.title}`}
                        loading="lazy"
                        width={112}
                        height={84}
                        className="h-16 w-28 shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                        <p className="font-semibold text-sm leading-snug line-clamp-2">{video.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">{video.date || '—'}</Badge>
                          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{video.views?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div className="mt-1 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1"
                            aria-label={`Open ${video.title} on YouTube`}
                            onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" /> Open
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9"
                            aria-label={`Delete ${video.title}`}
                            disabled={deletingId === video.id}
                            onClick={() => setVideoToDelete(video)}
                          >
                            {deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
              <div className="space-y-1.5">
                <Label htmlFor="yt-title">Title *</Label>
                <Input
                  id="yt-title"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                  placeholder="Video title"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yt-videoId">YouTube URL or Video ID *</Label>
                <Input
                  id="yt-videoId"
                  value={newVideo.videoId}
                  onChange={(e) => setNewVideo({...newVideo, videoId: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full URL or just the video ID (11 characters)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yt-date">Date</Label>
                <Input
                  id="yt-date"
                  value={newVideo.date}
                  onChange={(e) => setNewVideo({...newVideo, date: e.target.value})}
                  placeholder="e.g., March 2024"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yt-description">Description</Label>
                <Input
                  id="yt-description"
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

      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => { if (!open) setVideoToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              {videoToDelete
                ? `"${videoToDelete.title}" will be removed from the site. This action cannot be undone.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (videoToDelete) handleDelete(videoToDelete.id) }}
              disabled={!!deletingId}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Video
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}