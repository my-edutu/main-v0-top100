// DEPRECATED: This file is no longer used. All blog functionality is now handled
// through the /api/posts route. This file remains temporarily for reference
// but should be deleted after confirming all functionality is consolidated.

import { NextRequest } from 'next/server';

export async function GET() {
  return Response.json(
    {
      message: 'This endpoint is deprecated. Use /api/posts instead.',
      redirect: '/api/posts'
    },
    { status: 410 } // Gone status
  );
}

export async function POST(request: NextRequest) {
  return Response.json(
    {
      message: 'This endpoint is deprecated. Use /api/posts instead.',
      redirect: '/api/posts'
    },
    { status: 410 } // Gone status
  );
}

// Note: This file should be removed after confirming all references are updated