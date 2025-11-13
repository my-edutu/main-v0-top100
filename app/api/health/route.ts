import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test the connection by making a simple query
    const { data, error } = await supabase
      .from('profiles')  // This table should exist based on your schema
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Health check error:', error);
      return NextResponse.json({ 
        status: 'error', 
        message: 'Supabase connection failed',
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Supabase connection is working',
      data: !!data 
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Unexpected error during health check',
      error: (error as Error).message 
    }, { status: 500 });
  }
}