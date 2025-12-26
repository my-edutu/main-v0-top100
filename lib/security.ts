/**
 * Security utilities for input sanitization and safe output
 * 
 * SECURITY: Protects against XSS, injection attacks, and information leakage
 */

/**
 * HTML entities to escape for XSS prevention
 */
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS attacks
 * Use this when displaying user-generated content
 */
export function escapeHtml(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user input by removing potential XSS vectors
 * Use for text that will be stored in database
 */
export function sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Remove data: URLs that could contain scripts
        .replace(/data:text\/html/gi, '')
        // Trim whitespace
        .trim();
}

/**
 * Create a safe error response that doesn't leak internal details
 * Shows detailed errors only in development
 */
export function createSafeErrorResponse(
    publicMessage: string,
    debugInfo?: unknown,
    statusCode: number = 500
): Response {
    const isProduction = process.env.NODE_ENV === 'production';

    const responseBody: Record<string, unknown> = {
        error: publicMessage,
    };

    // Only include debug info in development
    if (!isProduction && debugInfo) {
        responseBody.debug = debugInfo instanceof Error
            ? {
                message: debugInfo.message,
                name: debugInfo.name,
                // Don't include stack trace even in dev for security
            }
            : debugInfo;
    }

    return Response.json(responseBody, { status: statusCode });
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') return null;

    const sanitized = email.toLowerCase().trim();

    // Basic email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(sanitized)) {
        return null;
    }

    return sanitized;
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim().toLowerCase();

    // Block dangerous protocols
    if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')
    ) {
        return null;
    }

    // Only allow http, https, mailto, and relative URLs
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('#')
    ) {
        return url.trim();
    }

    // If no protocol, treat as relative URL
    if (!trimmed.includes(':')) {
        return '/' + url.trim();
    }

    return null;
}

/**
 * Truncate string to maximum length safely
 */
export function truncate(str: string, maxLength: number): string {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Remove sensitive fields from objects before logging
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(
    obj: T,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization']
): T {
    const redacted = { ...obj };

    for (const field of sensitiveFields) {
        if (field in redacted) {
            redacted[field] = '[REDACTED]' as unknown as T[keyof T];
        }
    }

    return redacted;
}

/**
 * Safe JSON parse that doesn't throw
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
    try {
        return JSON.parse(str) as T;
    } catch {
        return fallback;
    }
}
