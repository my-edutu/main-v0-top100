import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching posts:', error);
      return new Response(JSON.stringify({ message: 'Error fetching posts', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in posts GET:', error);
    return new Response(JSON.stringify({ message: 'Error fetching posts', error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { title, slug, content, cover_image, is_featured, status, tags } = await req.json();
    
    const { data, error } = await supabase
      .from('posts')
      .insert([{
        title,
        slug,
        content,
        cover_image: cover_image || null,
        is_featured: is_featured || false,
        status: status || 'draft',
        tags: tags || []
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating post:', error);
      return new Response(JSON.stringify({ message: 'Error creating post', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in posts POST:', error);
    return new Response(JSON.stringify({ message: 'Error creating post', error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient();
    const { id, title, slug, content, cover_image, is_featured, status, tags } = await req.json();
    
    const { data, error } = await supabase
      .from('posts')
      .update({
        title,
        slug,
        content,
        cover_image: cover_image || null,
        is_featured: is_featured || false,
        status: status || 'draft',
        tags: tags || []
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating post:', error);
      return new Response(JSON.stringify({ message: 'Error updating post', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in posts PUT:', error);
    return new Response(JSON.stringify({ message: 'Error updating post', error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const { id, is_featured } = await req.json();
    
    const { data, error } = await supabase
      .from('posts')
      .update({ is_featured })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating post:', error);
      return new Response(JSON.stringify({ message: 'Error updating post', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in posts PATCH:', error);
    return new Response(JSON.stringify({ message: 'Error updating post', error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { id } = await req.json();
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting post:', error);
      return new Response(JSON.stringify({ message: 'Error deleting post', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error in posts DELETE:', error);
    return new Response(JSON.stringify({ message: 'Error deleting post', error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}