import { auth } from './auth';
import { headers } from 'next/headers';
import { cache } from 'react';

// Server-side function to get session for server components
export const getCurrentUser = cache(async () => {
  try {
    const requestHeaders = headers();
    const cookiesHeader = requestHeaders.get('cookie');
    
    if (!cookiesHeader) {
      return null;
    }

    // Get the session cookie name
    const sessionCookieName = auth.config.session.cookie.name;
    const cookieMatch = cookiesHeader.match(new RegExp(`(?:^|;)\\s*${sessionCookieName}\\s*=\\s*([^;]+)`));
    
    if (!cookieMatch) {
      return null;
    }

    const sessionToken = cookieMatch[1];
    
    // Use the auth's internal session validation
    // This calls the internal session validation logic
    const sessionValidation = await auth.$internal.getSession({
      token: sessionToken
    });

    // If session is valid and not expired, return the user
    if (sessionValidation && new Date() < new Date(sessionValidation.expiresAt)) {
      return sessionValidation.user;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
});

// Function to validate request in API routes
export async function validateRequest(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return null;
    }

    // Get the session cookie name
    const sessionCookieName = auth.config.session.cookie.name;
    const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;)\\s*${sessionCookieName}\\s*=\\s*([^;]+)`));
    
    if (!cookieMatch) {
      return null;
    }

    const sessionToken = cookieMatch[1];
    
    // Use the auth's internal session validation
    const sessionValidation = await auth.$internal.getSession({
      token: sessionToken
    });

    // If session is valid and not expired, return user and session
    if (sessionValidation && new Date() < new Date(sessionValidation.expiresAt)) {
      return { user: sessionValidation.user, session: sessionValidation };
    }
    
    return null;
  } catch (error) {
    console.error('Error validating request:', error);
    return null;
  }
}