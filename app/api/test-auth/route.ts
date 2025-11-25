import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/require-admin';

export async function GET(request: NextRequest) {
  console.log('[GET /api/test-auth] Testing authentication...');

  const adminCheck = await requireAdmin(request);

  if ('error' in adminCheck) {
    console.log('[GET /api/test-auth] Auth failed');
    return adminCheck.error;
  }

  console.log('[GET /api/test-auth] Auth successful!');

  return NextResponse.json({
    success: true,
    message: 'Authentication successful!',
    user: {
      id: adminCheck.user.id,
      email: adminCheck.user.email,
    },
    roleSource: adminCheck.roleSource,
  });
}
