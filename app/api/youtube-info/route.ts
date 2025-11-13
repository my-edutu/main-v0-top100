// app/api/youtube-info/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videoIds } = await request.json();

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return Response.json({
        success: false,
        message: 'Video IDs are required'
      }, { status: 400 });
    }

    // Limit to prevent abuse
    const limitedVideoIds = videoIds.slice(0, 20);

    // Using oEmbed API to get video information without an API key
    // This approach aggregates multiple calls to YouTube's oEmbed endpoint
    const videoDataPromises = limitedVideoIds.map(async (id) => {
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
        );

        if (!response.ok) {
          throw new Error(`YouTube request failed for ID ${id}`);
        }

        const data = await response.json();
        return {
          id,
          title: data.title,
          author_name: data.author_name,
          thumbnail_url: data.thumbnail_url
        };
      } catch (error) {
        console.error(`Error fetching oEmbed info for video ID ${id}:`, error);
        // Return the ID to indicate it failed
        return { id, error: true };
      }
    });

    const results = await Promise.allSettled(videoDataPromises);
    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(video => !video.error);

    return Response.json({
      success: true,
      videos: successfulResults
    });
  } catch (error) {
    console.error('Error in YouTube info POST:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch YouTube info',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}