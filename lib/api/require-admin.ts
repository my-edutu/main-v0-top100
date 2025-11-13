import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RequireAdminSuccess = {
  user: any; // User object
  profile: any; // Profile object with role information
}

type RequireAdminFailure = {
  error: NextResponse
}

export type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure

export const requireAdmin = async (request?: NextRequest): Promise<RequireAdminResult> => {
  const supabase = await createClient()
  
  // Get session
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (!session || error) {
    return {
      error: NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  // Get user profile to check admin role
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist or user is not admin, return error
    if (profileError || !profile || profile.role !== 'admin') {
      return {
        error: NextResponse.json(
          { message: 'Admin access required' },
          { status: 403 }
        )
      }
    }
    
    return { user, profile }
  } else {
    return {
      error: NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }
  }
}

export const assertAdminOrThrow = async (request?: NextRequest): Promise<void> => {
  const result = await requireAdmin(request)
  
  if ('error' in result) {
    throw result.error
  }
}
