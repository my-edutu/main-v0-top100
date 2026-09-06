import { NextResponse } from 'next/server'

/**
 * Retained as a tombstone so old clients cannot fall through to another route.
 * Administrator bootstrap must be performed out-of-band, never over HTTP.
 */
export async function POST(_request: Request) {
  return NextResponse.json({ message: 'Not found.' }, { status: 404 })
}
