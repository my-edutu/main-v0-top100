// app/api/youtube/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/api/require-admin';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { data, error, status } = await supabase
      .from('youtube_videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching YouTube videos:', error)
      if (status === 404 || /does not exist/i.test(error.message)) return Response.json([])
      return Response.json({ message: 'Videos are temporarily unavailable.' }, { status: 503 })
    }

    const videos = data ?? []
    const enriched = []
    // Limit concurrent external requests to avoid making video pages queue
    // hundreds of serial calls (or overwhelming YouTube's oEmbed endpoint).
    for (let offset = 0; offset < videos.length; offset += 8) {
      const batch = videos.slice(offset, offset + 8)
      const resolved = await Promise.all(batch.map(async (video) => {
        try {
          if (!/^[A-Za-z0-9_-]{11}$/.test(video.video_id ?? '')) return video
          const response = await fetch(
            `https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${encodeURIComponent(video.video_id)}&format=json`,
            { signal: AbortSignal.timeout(2500), next: { revalidate: 3600 } },
          )
          if (!response.ok) return video
          const info = await response.json()
          return { ...video, title: info.title || video.title, description: info.description || video.description }
        } catch {
          return video
        }
      }))
      enriched.push(...resolved)
    }
    return Response.json(enriched)
  } catch (error) {
    console.error('Error in YouTube GET:', error)
    return Response.json({ message: 'Videos are temporarily unavailable.' }, { status: 503 })
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

    const supabase = createAdminClient();

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

    const supabase = createAdminClient();

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

    const supabase = createAdminClient();

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
