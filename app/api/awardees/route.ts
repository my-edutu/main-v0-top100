import { NextRequest } from 'next/server';
import awardeesData from '@/content/data/awardees.json';

// Next.js API route to serve awardees data
export async function GET(request: NextRequest) {
  // In a real application, you might want to add caching headers
  // or implement more sophisticated data handling
  
  return Response.json(awardeesData);
}