import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.warn('[profiles/ensure] authentication disabled; skipping profile sync')
  return NextResponse.json({ error: 'Authentication disabled' }, { status: 503 })
}
