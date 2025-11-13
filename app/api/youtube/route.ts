// app/api/youtube/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/api/require-admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('youtube_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching YouTube videos:', error);
      return Response.json({
        success: false,
        message: 'Failed to fetch YouTube videos',
        error: error.message
      }, { status: 500 });
    }

    // Fetch actual YouTube titles using oEmbed API to avoid needing a YouTube API key
    if (data && data.length > 0) {
      // Create an array to hold the updated videos
      const updatedData = [];
      
      for (const video of data) {
        try {
          // Use oEmbed to get actual YouTube video information
          const response = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video.video_id}&format=json`
          );
          
          if (response.ok) {
            const videoInfo = await response.json();
            // Update the video with the actual title from YouTube
            updatedData.push({
              ...video,
              title: videoInfo.title,
              // Optionally update other fields too
              description: videoInfo.description || video.description,
            });
          } else {
            // If oEmbed fails, keep the original video data
            updatedData.push(video);
          }
        } catch (embedError) {
          console.error(`Error fetching oEmbed for video ${video.video_id}:`, embedError);
          // If oEmbed fails, keep the original video data
          updatedData.push(video);
        }
      }
      
      return Response.json(updatedData);
    } else {
      // If no data, return the original data array
      return Response.json(data);
    }

    // Return stored data if all else fails
    return Response.json(data);
  } catch (error) {
    console.error('Error in YouTube GET:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch YouTube videos',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.videoId) {
      return Response.json({
        success: false,
        message: 'Title and Video ID are required'
      }, { status: 400 });
    }

    const supabase = createClient(true);

    const { data, error } = await supabase
      .from('youtube_videos')
      .insert([{
        title: body.title,
        description: body.description || null,
        video_id: body.videoId,
        date: body.date || new Date().toISOString().split('T')[0].substring(0, 7) // YYYY-MM format
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding YouTube video:', error);
      return Response.json({
        success: false,
        message: 'Failed to add YouTube video',
        error: error.message
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'YouTube video added successfully',
      video: data
    });
  } catch (error) {
    console.error('Error in YouTube POST:', error);
    return Response.json({
      success: false,
      message: 'Failed to add YouTube video',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const body = await request.json();

    if (!body.id) {
      return Response.json({
        success: false,
        message: 'Video ID is required'
      }, { status: 400 });
    }

    const supabase = createClient(true);

    const { data, error } = await supabase
      .from('youtube_videos')
      .update({
        title: body.title,
        description: body.description || null,
        video_id: body.videoId,
        date: body.date
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating YouTube video:', error);
      return Response.json({
        success: false,
        message: 'Failed to update YouTube video',
        error: error.message
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'YouTube video updated successfully',
      video: data
    });
  } catch (error) {
    console.error('Error in YouTube PUT:', error);
    return Response.json({
      success: false,
      message: 'Failed to update YouTube video',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({
        success: false,
        message: 'Video ID is required'
      }, { status: 400 });
    }

    const supabase = createClient(true);

    const { error } = await supabase
      .from('youtube_videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting YouTube video:', error);
      return Response.json({
        success: false,
        message: 'Failed to delete YouTube video',
        error: error.message
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'YouTube video deleted successfully'
    });
  } catch (error) {
    console.error('Error in YouTube DELETE:', error);
    return Response.json({
      success: false,
      message: 'Failed to delete YouTube video',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}