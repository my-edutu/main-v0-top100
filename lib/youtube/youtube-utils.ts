// lib/youtube/youtube-utils.ts

export interface YouTubeVideoDetails {
  id: string;
  title: string;
  description: string;
  date: string; // publishedAt
  thumbnail: string;
  duration?: string;
  viewCount?: number;
  likeCount?: number;
}

/**
 * Fetches video details directly from YouTube API
 * @param videoIds Array of YouTube video IDs
 * @param apiKey YouTube API key
 * @returns Array of video details
 */
export async function fetchYouTubeVideoDetails(videoIds: string[], apiKey: string): Promise<YouTubeVideoDetails[]> {
  if (!apiKey) {
    throw new Error('YouTube API key is required');
  }

  if (!videoIds || videoIds.length === 0) {
    return [];
  }

  // Limit to 50 videos at a time (YouTube API restriction)
  const limitedVideoIds = videoIds.slice(0, 50);
  const ids = limitedVideoIds.join(',');

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      date: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
      duration: item.contentDetails.duration, // ISO 8601 format
      viewCount: parseInt(item.statistics.viewCount) || 0,
      likeCount: parseInt(item.statistics.likeCount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching YouTube video details:', error);
    throw error;
  }
}

/**
 * Extracts video ID from various YouTube URL formats
 * @param url YouTube URL
 * @returns Video ID or null if invalid
 */
export function extractYouTubeVideoId(url: string): string | null {
  // Handle both full URLs and just the video ID
  if (url.length === 11 && !url.includes(' ')) return url; // Already a video ID

  // Regex to extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  return null;
}